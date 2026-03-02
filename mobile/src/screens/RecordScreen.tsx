import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dashscopeRealtimeSessionService } from '../services/asr/dashscopeRealtimeSession';
import type { AsrSession, RecordingStatus } from '../services/asr/types';
import { loadApiKey } from '../storage/apiKeyStore';
import {
  appendSessionHistory,
  type SessionHistoryItem,
  type SessionHistoryStatus,
} from '../storage/sessionHistoryStore';
import { colors } from '../theme';

type RecordScreenProps = {
  onHistoryUpdated?: () => void;
};

export function RecordScreen({ onHistoryUpdated }: RecordScreenProps) {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [transcriptText, setTranscriptText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const sessionRef = useRef<AsrSession | null>(null);
  const transcriptRef = useRef('');
  const startAtRef = useRef<string | null>(null);
  const sessionIdRef = useRef('');
  const persistedRef = useRef(false);

  const statusLabel = useMemo(() => {
    if (status === 'recording') return 'Recording';
    if (status === 'processing') return 'Stopping';
    if (status === 'failed') return 'Failed';
    return 'Idle';
  }, [status]);

  const persistSession = async (next: {
    status: SessionHistoryStatus;
    transcript?: string;
    errorText?: string;
    audioFileUri?: string | null;
  }) => {
    if (persistedRef.current) return;
    if (!startAtRef.current || !sessionIdRef.current) return;

    persistedRef.current = true;
    const item: SessionHistoryItem = {
      id: sessionIdRef.current,
      startedAt: startAtRef.current,
      endedAt: new Date().toISOString(),
      status: next.status,
      transcript: next.transcript ?? transcriptRef.current,
      errorText: next.errorText,
      audioFileUri: next.audioFileUri ?? undefined,
    };

    await appendSessionHistory(item);
    onHistoryUpdated?.();
  };

  const start = async () => {
    if (status === 'processing') return;

    const apiKey = await loadApiKey();
    if (!apiKey) {
      setStatus('failed');
      setErrorText('Set your API key in Settings before recording.');
      return;
    }

    setStatus('recording');
    setTranscriptText('');
    transcriptRef.current = '';
    setErrorText('');
    setInfoText('');
    startAtRef.current = new Date().toISOString();
    sessionIdRef.current = buildSessionId();
    persistedRef.current = false;

    try {
      sessionRef.current = await dashscopeRealtimeSessionService.start({
        apiKey,
        onEvent: (event) => {
          if (event.type === 'live') {
            transcriptRef.current = event.text;
            setTranscriptText(event.text);
          }
          if (event.type === 'final') {
            transcriptRef.current = event.text;
            setTranscriptText(event.text);
            setStatus('idle');
            setInfoText('');
            void persistSession({
              status: 'completed',
              transcript: event.text,
              audioFileUri: event.audioFileUri,
            });
          }
          if (event.type === 'status') {
            setInfoText(event.message);
          }
          if (event.type === 'error') {
            setErrorText(event.message);
            setStatus('failed');
            setInfoText('');
            void persistSession({
              status: 'failed',
              errorText: event.message,
              audioFileUri: event.audioFileUri,
            });
          }
        },
      });
    } catch (error) {
      setStatus('failed');
      const message = error instanceof Error ? error.message : 'Failed to start audio session.';
      setErrorText(message);
      setInfoText('');
      await persistSession({ status: 'failed', errorText: message });
    }
  };

  const stop = async () => {
    if (!sessionRef.current) return;
    setStatus('processing');
    try {
      await sessionRef.current.stop();
    } catch (error) {
      setStatus('failed');
      const message = error instanceof Error ? error.message : 'Failed to stop audio session.';
      setErrorText(message);
      setInfoText('');
      await persistSession({ status: 'failed', errorText: message });
    } finally {
      sessionRef.current = null;
    }
  };

  const isRecording = status === 'recording';
  const isBusy = status === 'processing';
  const recordButtonText = isRecording ? 'Stop' : 'Start Recording';

  return (
    <View style={styles.layout}>
      <View style={styles.statusPill}>
        <Text style={styles.statusLabel}>Status: {statusLabel}</Text>
      </View>

      <Pressable
        disabled={isBusy}
        onPress={isRecording ? stop : start}
        style={({ pressed }) => [
          styles.recordButton,
          isBusy ? styles.recordButtonDisabled : null,
          pressed && isRecording ? styles.recordButtonPressed : null,
        ]}
      >
        <Text style={styles.recordButtonText}>{recordButtonText}</Text>
      </Pressable>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {infoText ? <Text style={styles.infoText}>{infoText}</Text> : null}

      <ScrollView contentContainerStyle={styles.transcriptWrap} style={styles.transcriptPanel}>
        <Text style={styles.sectionTitle}>Transcript</Text>
        <Text style={styles.transcriptText}>{transcriptText || 'Start recording to capture transcript.'}</Text>
      </ScrollView>
    </View>
  );
}

function buildSessionId(): string {
  const seed = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return seed.slice(0, 24);
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    gap: 14,
    paddingBottom: 14,
    width: '100%',
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEE6D6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  recordButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 190,
    justifyContent: 'center',
    marginTop: 6,
    width: 190,
  },
  recordButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  recordButtonDisabled: {
    backgroundColor: '#CCB6AE',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: '#9D1A1A',
    fontSize: 13,
    fontWeight: '600',
  },
  infoText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  transcriptPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 260,
    width: '100%',
  },
  transcriptWrap: {
    flexGrow: 1,
    padding: 14,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  transcriptText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 6,
  },
});
