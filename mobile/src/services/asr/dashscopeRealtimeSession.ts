import { Buffer } from 'buffer';
import LiveAudioStream from 'react-native-live-audio-stream';
import { PermissionsAndroid, Platform } from 'react-native';
import type { FinalizedSentence } from '../../types/session';
import { saveSessionAudioBase64 } from '../audio/sessionAudio';
import type { AsrSession, AsrSessionService } from './types';

const DASHSCOPE_WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';

const OPEN_TIMEOUT_MS = 8000;
const TASK_START_TIMEOUT_MS = 10000;
const INACTIVITY_TIMEOUT_MS = 45000;
const FINISH_FALLBACK_MS = 6000;
const AUDIO_STOP_TIMEOUT_MS = 1500;
const STOP_HARD_TIMEOUT_MS = 12000;
const RECONNECT_DELAYS_MS = [800, 1600, 3200];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS_MS.length;
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
        begin_time?: number | null;
        end_time?: number | null;
        text?: string;
        heartbeat?: boolean | null;
        sentence_end?: boolean;
        speaker_id?: number | string | null;
        speaker?: number | string | null;
        spk_id?: number | string | null;
        words?: Array<{
          begin_time?: number | null;
          end_time?: number | null;
          text?: string;
          speaker_id?: number | string | null;
          speaker?: number | string | null;
          spk_id?: number | string | null;
        }>;
      };
    };
  };
};
type SentencePayload = NonNullable<
  NonNullable<NonNullable<SocketEventPayload['payload']>['output']>['sentence']
>;

function buildTaskId(): string {
  const seed = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${Math.random()
    .toString(16)
    .slice(2)}`;
  return seed.slice(0, 32);
}

function joinTranscript(finalized: FinalizedSentence[], partial: string): string {
  return [...finalized.map((entry) => entry.text), partial]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function asMs(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function formatSpeaker(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return `Speaker ${value}`;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^speaker\s+\d+$/i.test(trimmed)) {
      return `Speaker ${trimmed.replace(/[^\d]/g, '')}`;
    }
    if (/^\d+$/.test(trimmed)) return `Speaker ${trimmed}`;
    return trimmed;
  }
  return undefined;
}

function pickSpeakerLabel(sentence: SentencePayload): string | undefined {
  if (!sentence || typeof sentence !== 'object') return undefined;

  const data = sentence as {
    speaker_id?: unknown;
    speaker?: unknown;
    spk_id?: unknown;
    words?: Array<{ speaker_id?: unknown; speaker?: unknown; spk_id?: unknown }>;
  };
  const direct =
    formatSpeaker(data.speaker_id) || formatSpeaker(data.speaker) || formatSpeaker(data.spk_id);
  if (direct) return direct;

  if (!Array.isArray(data.words) || !data.words.length) return undefined;
  const first = data.words[0];
  return formatSpeaker(first?.speaker_id) || formatSpeaker(first?.speaker) || formatSpeaker(first?.spk_id);
}

function toFinalizedSentence(params: {
  sentence: SentencePayload;
  text: string;
  previousEndMs: number;
}): FinalizedSentence {
  const sentence = params.sentence as {
    begin_time?: unknown;
    end_time?: unknown;
    words?: Array<{ begin_time?: unknown; end_time?: unknown }>;
  };
  const words = Array.isArray(sentence.words) ? sentence.words : [];
  const firstWord = words.length ? words[0] : undefined;
  const lastWord = words.length ? words[words.length - 1] : undefined;

  const startMs =
    asMs(sentence.begin_time) ??
    asMs(firstWord?.begin_time) ??
    asMs(params.previousEndMs) ??
    0;
  const endMs = asMs(sentence.end_time) ?? asMs(lastWord?.end_time) ?? startMs;

  return {
    startMs,
    endMs,
    text: params.text,
    speakerLabel: pickSpeakerLabel(params.sentence),
  };
}

function parseSocketPayload(raw: unknown): SocketEventPayload | null {
  if (typeof raw !== 'string') return null;

  try {
    return JSON.parse(raw) as SocketEventPayload;
  } catch {
    return null;
  }
}

function buildWavHeader(dataSize: number): Buffer {
  const channels = AUDIO_OPTIONS.channels;
  const sampleRate = AUDIO_OPTIONS.sampleRate;
  const bitsPerSample = AUDIO_OPTIONS.bitsPerSample;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  return header;
}

function saveRecordingWav(
  userId: string,
  taskId: string,
  chunks: Buffer[],
  totalBytes: number,
): string | null {
  if (!chunks.length || totalBytes <= 0) return null;

  try {
    const wavData = Buffer.concat([buildWavHeader(totalBytes), ...chunks]);
    return saveSessionAudioBase64(userId, taskId, wavData.toString('base64'));
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
  async start({ apiKey, userId, vocabularyId, onEvent }): Promise<AsrSession> {
    await requestMicPermission();

    const finalizedSentences: FinalizedSentence[] = [];
    let partialSentence = '';
    let lastFinalEndMs = 0;
    const recordingId = buildTaskId();
    const audioChunks: Buffer[] = [];
    let audioBytes = 0;
    let audioFileUri: string | null = null;

    let ws: WebSocket | null = null;
    let currentTaskId = '';
    let audioSubscription: { remove: () => void } | null = null;
    let audioStopPromise: Promise<void> | null = null;

    let hasStopped = false;
    let finishSent = false;
    let resolved = false;
    let finalEmitted = false;
    let taskStarted = false;
    let reconnectAttempts = 0;
    let reconnecting = false;

    let openTimer: ReturnType<typeof setTimeout> | null = null;
    let taskStartTimer: ReturnType<typeof setTimeout> | null = null;
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let finishTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopHardTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = (timer: ReturnType<typeof setTimeout> | null) => {
      if (timer) clearTimeout(timer);
    };

    const clearTransientTimers = () => {
      clearTimer(openTimer);
      clearTimer(taskStartTimer);
      clearTimer(inactivityTimer);
      openTimer = null;
      taskStartTimer = null;
      inactivityTimer = null;
    };

    const clearAllTimers = () => {
      clearTransientTimers();
      clearTimer(finishTimer);
      clearTimer(reconnectTimer);
      clearTimer(stopHardTimer);
      finishTimer = null;
      reconnectTimer = null;
      stopHardTimer = null;
    };

    const resolveOnce = () => {
      if (resolved) return;
      resolved = true;
    };

    const emitLive = () => {
      onEvent({ type: 'live', text: joinTranscript(finalizedSentences, partialSentence) });
    };

    const emitStatus = (message: string, reconnectingState: boolean) => {
      onEvent({ type: 'status', message, reconnecting: reconnectingState });
    };

    const persistAudioOnce = () => {
      if (audioFileUri !== null) return audioFileUri;
      audioFileUri = saveRecordingWav(userId, recordingId, audioChunks, audioBytes);
      return audioFileUri;
    };

    const emitFinalOnce = () => {
      if (finalEmitted) return;
      finalEmitted = true;
      onEvent({
        type: 'final',
        text: joinTranscript(finalizedSentences, partialSentence),
        audioFileUri: persistAudioOnce(),
      });
    };

    const closeSocket = () => {
      if (!ws) return;
      const active = ws;
      ws = null;
      taskStarted = false;
      if (active.readyState === WebSocket.OPEN || active.readyState === WebSocket.CONNECTING) {
        active.close();
      }
    };

    const detachAudio = () => {
      if (audioSubscription) {
        audioSubscription.remove();
        audioSubscription = null;
      }
    };

    const stopAudio = async () => {
      detachAudio();
      if (audioStopPromise) return audioStopPromise;

      audioStopPromise = (async () => {
        try {
          await Promise.race([
            LiveAudioStream.stop(),
            new Promise<void>((resolve) => {
              setTimeout(resolve, AUDIO_STOP_TIMEOUT_MS);
            }),
          ]);
        } catch {
          // Ignore when stream has not started yet.
        }
      })();

      return audioStopPromise;
    };

    const scheduleInactivityTimeout = () => {
      clearTimer(inactivityTimer);
      inactivityTimer = null;

      if (resolved || hasStopped || !taskStarted) return;

      inactivityTimer = setTimeout(() => {
        void recoverOrFail('Realtime transcription stalled.');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const completeSession = async (emitFinal: boolean) => {
      clearAllTimers();
      reconnecting = false;
      await stopAudio();

      if (emitFinal) emitFinalOnce();

      closeSocket();
      resolveOnce();
    };

    const failSession = async (message: string) => {
      clearAllTimers();
      reconnecting = false;
      await stopAudio();
      closeSocket();
      onEvent({ type: 'error', message, audioFileUri: persistAudioOnce() });
      resolveOnce();
    };

    const connectSocket = () => {
      if (resolved || hasStopped) return;

      currentTaskId = buildTaskId();
      const socket = new (WebSocket as any)(DASHSCOPE_WS_URL, undefined, {
        headers: {
          Authorization: `bearer ${apiKey}`,
        },
      }) as WebSocket;

      ws = socket;
      taskStarted = false;

      clearTransientTimers();
      openTimer = setTimeout(() => {
        if (resolved || hasStopped || ws !== socket) return;
        void recoverOrFail('Realtime transcription connection timeout.');
      }, OPEN_TIMEOUT_MS);

      socket.onopen = () => {
        if (ws !== socket) return;

        clearTimer(openTimer);
        openTimer = null;

        const parameters: Record<string, unknown> = {
          format: 'pcm',
          sample_rate: 16000,
          semantic_punctuation_enabled: true,
        };
        if (vocabularyId?.trim()) {
          parameters.vocabulary_id = vocabularyId.trim();
        }

        socket.send(
          JSON.stringify({
            header: {
              action: 'run-task',
              task_id: currentTaskId,
              streaming: 'duplex',
            },
            payload: {
              task_group: 'audio',
              task: 'asr',
              function: 'recognition',
              model: 'fun-asr-realtime',
              parameters,
              input: {},
            },
          }),
        );

        taskStartTimer = setTimeout(() => {
          if (resolved || hasStopped || ws !== socket || taskStarted) return;
          void recoverOrFail('Realtime transcription handshake timeout.');
        }, TASK_START_TIMEOUT_MS);
      };

      socket.onmessage = (event) => {
        if (ws !== socket) return;

        const payload = parseSocketPayload(event.data);
        if (!payload) return;

        const eventName = payload.header?.event;

        if (hasStopped) {
          if (eventName === 'task-finished') {
            void completeSession(false);
          }
          return;
        }

        if (eventName === 'task-started') {
          const recovered = reconnectAttempts > 0;
          taskStarted = true;
          reconnecting = false;
          reconnectAttempts = 0;

          clearTimer(taskStartTimer);
          taskStartTimer = null;

          try {
            LiveAudioStream.init(AUDIO_OPTIONS);
            audioSubscription = (LiveAudioStream.on('data', (base64Chunk) => {
              if (resolved || finishSent || !taskStarted || ws !== socket) return;
              if (socket.readyState !== WebSocket.OPEN) return;

              const pcm = Buffer.from(base64Chunk, 'base64');
              if (!pcm.length) return;

              audioChunks.push(pcm);
              audioBytes += pcm.length;

              const payload = pcm.buffer.slice(
                pcm.byteOffset,
                pcm.byteOffset + pcm.byteLength,
              ) as ArrayBuffer;
              socket.send(payload);
            }) as unknown as { remove: () => void });
            LiveAudioStream.start();
          } catch {
            void recoverOrFail('Failed to start microphone stream.');
            return;
          }

          scheduleInactivityTimeout();
          if (recovered) {
            emitStatus('Connection recovered. Recording resumed.', false);
          }
          return;
        }

        if (eventName === 'task-finished') {
          if (hasStopped || finishSent) {
            void completeSession(false);
            return;
          }

          void recoverOrFail('Realtime transcription finished unexpectedly.');
          return;
        }

        if (eventName === 'task-failed') {
          void recoverOrFail(payload.header?.error_message || 'DashScope task failed.');
          return;
        }

        if (eventName !== 'result-generated') return;

        const sentence = payload.payload?.output?.sentence;
        if (!sentence) return;

        scheduleInactivityTimeout();

        if (sentence.heartbeat === true) return;

        const text = typeof sentence.text === 'string' ? sentence.text.trim() : '';
        if (!text) return;

        if (sentence.sentence_end) {
          const finalized = toFinalizedSentence({
            sentence,
            text,
            previousEndMs: lastFinalEndMs,
          });
          finalizedSentences.push(finalized);
          lastFinalEndMs = finalized.endMs;
          partialSentence = '';
          emitLive();
          return;
        }

        partialSentence = text;
        emitLive();
      };

      socket.onerror = () => {
        if (resolved || hasStopped || ws !== socket) return;
      };

      socket.onclose = () => {
        if (resolved || ws !== socket) return;

        ws = null;
        taskStarted = false;
        clearTransientTimers();

        if (hasStopped) {
          void completeSession(false);
          return;
        }

        void recoverOrFail('Realtime transcription connection closed.');
      };
    };

    const recoverOrFail = async (message: string) => {
      if (resolved) return;

      if (hasStopped) {
        await completeSession(false);
        return;
      }

      if (reconnecting) return;

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        await failSession(message);
        return;
      }

      reconnecting = true;
      reconnectAttempts += 1;
      emitStatus(
        `Connection interrupted. Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
        true,
      );

      if (partialSentence) {
        const fallbackStart = Math.max(0, lastFinalEndMs);
        finalizedSentences.push({
          startMs: fallbackStart,
          endMs: fallbackStart,
          text: partialSentence,
        });
        partialSentence = '';
        emitLive();
      }

      clearTransientTimers();
      await stopAudio();
      closeSocket();

      const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempts - 1, RECONNECT_DELAYS_MS.length - 1)];
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        reconnecting = false;

        if (resolved) return;
        if (hasStopped) {
          void completeSession(false);
          return;
        }

        connectSocket();
      }, delay);
    };

    const sendFinishTask = () => {
      if (finishSent || !ws || !taskStarted || ws.readyState !== WebSocket.OPEN) return;
      finishSent = true;

      ws.send(
        JSON.stringify({
          header: {
            action: 'finish-task',
            task_id: currentTaskId,
            streaming: 'duplex',
          },
          payload: {
            input: {},
          },
        }),
      );

      clearTimer(finishTimer);
      finishTimer = setTimeout(() => {
        if (!resolved) {
          void completeSession(false);
        }
      }, FINISH_FALLBACK_MS);
    };

    connectSocket();

    return {
      async stop() {
        if (hasStopped) return;

        hasStopped = true;
        clearTransientTimers();
        clearTimer(reconnectTimer);
        reconnectTimer = null;
        reconnecting = false;

        stopHardTimer = setTimeout(() => {
          if (!resolved) void completeSession(false);
        }, STOP_HARD_TIMEOUT_MS);

        detachAudio();
        emitFinalOnce();

        void (async () => {
          await stopAudio();

          if (resolved) return;
          if (ws && ws.readyState === WebSocket.OPEN && taskStarted) {
            sendFinishTask();
            return;
          }

          await completeSession(false);
        })();
      },
    };
  },
};
