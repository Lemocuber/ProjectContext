import { Buffer } from 'buffer';
import LiveAudioStream from 'react-native-live-audio-stream';
import {
  PermissionsAndroid,
  Platform,
} from 'react-native';
import type { AsrSession, AsrSessionService } from './types';

const DASHSCOPE_WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';

const AUDIO_OPTIONS = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6,
  bufferSize: 4096,
  wavFile: 'live-stream.pcm',
};

type SocketEventPayload = {
  header?: {
    event?: string;
    error_message?: string;
  };
  payload?: {
    output?: {
      sentence?: {
        text?: string;
        heartbeat?: boolean | null;
        sentence_end?: boolean;
      };
    };
  };
};

function buildTaskId(): string {
  const seed = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${Math.random()
    .toString(16)
    .slice(2)}`;
  return seed.slice(0, 32);
}

function joinTranscript(finalized: string[], partial: string): string {
  return [...finalized, partial]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSocketPayload(raw: unknown): SocketEventPayload | null {
  if (typeof raw !== 'string') return null;

  try {
    return JSON.parse(raw) as SocketEventPayload;
  } catch {
    return null;
  }
}

async function requestMicPermission(): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('Realtime recording is enabled for Android prototype only.');
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );

  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Microphone permission denied.');
  }
}

export const dashscopeRealtimeSessionService: AsrSessionService = {
  async start({ apiKey, onEvent }): Promise<AsrSession> {
    await requestMicPermission();

    const taskId = buildTaskId();
    const finalizedSentences: string[] = [];
    let partialSentence = '';
    let audioSubscription: { remove: () => void } | null = null;

    let hasStopped = false;
    let finishSent = false;
    let resolved = false;

    const ws = new (WebSocket as any)(DASHSCOPE_WS_URL, undefined, {
      headers: {
        Authorization: `bearer ${apiKey}`,
      },
    }) as WebSocket;

    const emitLive = () => {
      onEvent({ type: 'live', text: joinTranscript(finalizedSentences, partialSentence) });
    };

    const clearAudio = async () => {
      if (audioSubscription) {
        audioSubscription.remove();
        audioSubscription = null;
      }

      try {
        await LiveAudioStream.stop();
      } catch {
        // Ignore when stream has not started yet.
      }
    };

    let resolveDone: (() => void) | null = null;
    const donePromise = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });

    const resolveOnce = () => {
      if (resolved) return;
      resolved = true;
      if (resolveDone) resolveDone();
    };

    const completeSession = async (emitFinal: boolean) => {
      await clearAudio();

      if (emitFinal) {
        onEvent({ type: 'final', text: joinTranscript(finalizedSentences, partialSentence) });
      }

      resolveOnce();
      ws.close();
    };

    const failSession = async (message: string) => {
      await clearAudio();
      onEvent({ type: 'error', message });
      resolveOnce();
      ws.close();
    };

    const sendFinishTask = () => {
      if (finishSent || ws.readyState !== WebSocket.OPEN) return;
      finishSent = true;

      ws.send(
        JSON.stringify({
          header: {
            action: 'finish-task',
            task_id: taskId,
            streaming: 'duplex',
          },
          payload: {
            input: {},
          },
        }),
      );

      setTimeout(() => {
        if (!resolved) {
          void completeSession(true);
        }
      }, 6000);
    };

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          header: {
            action: 'run-task',
            task_id: taskId,
            streaming: 'duplex',
          },
          payload: {
            task_group: 'audio',
            task: 'asr',
            function: 'recognition',
            model: 'fun-asr-realtime',
            parameters: {
              format: 'pcm',
              sample_rate: 16000,
              semantic_punctuation_enabled: true,
            },
            input: {},
          },
        }),
      );
    };

    ws.onmessage = (event) => {
      const payload = parseSocketPayload(event.data);
      if (!payload) return;

      const eventName = payload.header?.event;

      if (eventName === 'task-started') {
        LiveAudioStream.init(AUDIO_OPTIONS);

        audioSubscription = (LiveAudioStream.on(
          'data',
          (base64Chunk) => {
            if (finishSent || ws.readyState !== WebSocket.OPEN) return;

            const pcm = Uint8Array.from(Buffer.from(base64Chunk, 'base64'));
            ws.send(pcm.buffer);
          },
        ) as unknown as { remove: () => void });

        LiveAudioStream.start();
        return;
      }

      if (eventName === 'task-finished') {
        void completeSession(true);
        return;
      }

      if (eventName === 'task-failed') {
        void failSession(payload.header?.error_message || 'DashScope task failed.');
        return;
      }

      if (eventName !== 'result-generated') return;

      const sentence = payload.payload?.output?.sentence;
      if (!sentence || sentence.heartbeat === true) return;

      const text = typeof sentence.text === 'string' ? sentence.text.trim() : '';
      if (!text) return;

      if (sentence.sentence_end) {
        finalizedSentences.push(text);
        partialSentence = '';
        emitLive();
        return;
      }

      partialSentence = text;
      emitLive();
    };

    ws.onerror = () => {
      if (!resolved) {
        void failSession('Realtime transcription socket error.');
      }
    };

    ws.onclose = () => {
      if (resolved) return;

      if (hasStopped) {
        void completeSession(true);
        return;
      }

      void failSession('Realtime transcription connection closed.');
    };

    return {
      async stop() {
        if (hasStopped) return;
        hasStopped = true;
        await clearAudio();

        if (ws.readyState === WebSocket.OPEN) {
          sendFinishTask();
        } else {
          void completeSession(true);
        }

        await donePromise;
      },
    };
  },
};
