import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dashscopeRealtimeSessionService } from '../services/asr/dashscopeRealtimeSession';
import type { AsrSession, RecordingStatus } from '../services/asr/types';
import { loadApiKey } from '../storage/apiKeyStore';
import {
  appendSessionHistory,
  loadSessionHistory,
  type SessionHistoryItem,
  type SessionHistoryStatus,
} from '../storage/sessionHistoryStore';
import { colors } from '../theme';

export function RecordScreen() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [liveText, setLiveText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const sessionRef = useRef<AsrSession | null>(null);
  const liveTextRef = useRef('');
  const startAtRef = useRef<string | null>(null);
  const sessionIdRef = useRef('');
  const persistedRef = useRef(false);

  useEffect(() => {
    void (async () => {
      setHistory(await loadSessionHistory());
    })();
  }, []);

  const statusLabel = useMemo(() => {
    if (status === 'recording') return 'Recording';
    if (status === 'processing') return 'Stopping';
    if (status === 'failed') return 'Failed';
    return 'Idle';
  }, [status]);

  const persistSession = async (next: {
    status: SessionHistoryStatus;
    finalText?: string;
    errorText?: string;
  }) => {
    if (persistedRef.current) return;
    if (!startAtRef.current || !sessionIdRef.current) return;

    persistedRef.current = true;
    const item: SessionHistoryItem = {
      id: sessionIdRef.current,
      startedAt: startAtRef.current,
      endedAt: new Date().toISOString(),
      status: next.status,
      liveText: liveTextRef.current,
      finalText: next.finalText ?? finalText,
      errorText: next.errorText,
    };

    setHistory(await appendSessionHistory(item));
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
    setLiveText('');
    liveTextRef.current = '';
    setFinalText('');
    setErrorText('');
    startAtRef.current = new Date().toISOString();
    sessionIdRef.current = buildSessionId();
    persistedRef.current = false;

    try {
      sessionRef.current = await dashscopeRealtimeSessionService.start({
        apiKey,
        onEvent: (event) => {
          if (event.type === 'live') {
            liveTextRef.current = event.text;
            setLiveText(event.text);
          }
          if (event.type === 'final') {
            setFinalText(event.text);
            setStatus('idle');
            void persistSession({ status: 'completed', finalText: event.text });
          }
          if (event.type === 'error') {
            setErrorText(event.message);
            setStatus('failed');
            void persistSession({ status: 'failed', errorText: event.message });
          }
        },
      });
    } catch (error) {
      setStatus('failed');
      const message = error instanceof Error ? error.message : 'Failed to start audio session.';
      setErrorText(message);
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

      <ScrollView contentContainerStyle={styles.transcriptWrap} style={styles.transcriptPanel}>
        <Text style={styles.sectionTitle}>Live Draft</Text>
        <Text style={styles.transcriptText}>{liveText || 'Waiting for live transcript...'}</Text>

        <Text style={[styles.sectionTitle, styles.finalTitle]}>Final Transcript</Text>
        <Text style={styles.transcriptText}>{finalText || 'Stop recording to finalize transcript.'}</Text>
      </ScrollView>

      <View style={styles.historyPanel}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        <ScrollView contentContainerStyle={styles.historyWrap} style={styles.historyList}>
          {history.length ? (
            history.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <Text style={styles.historyMeta}>
                  {formatSessionTime(item.startedAt)} • {item.status}
                </Text>
                <Text style={styles.historyText}>
                  {previewText(item)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No saved sessions yet.</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function buildSessionId(): string {
  const seed = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return seed.slice(0, 24);
}

function formatSessionTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function previewText(item: SessionHistoryItem): string {
  const text = item.finalText || item.liveText || item.errorText || 'No transcript captured.';
  return text.length > 160 ? `${text.slice(0, 160)}...` : text;
}

const styles = StyleSheet.create({
  layout: {
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
  transcriptPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 310,
    minHeight: 230,
    width: '100%',
  },
  transcriptWrap: {
    padding: 14,
  },
  historyPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 160,
    width: '100%',
  },
  historyList: {
    maxHeight: 220,
  },
  historyWrap: {
    gap: 10,
    padding: 14,
    paddingTop: 8,
  },
  historyItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  historyMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  historyText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  finalTitle: {
    marginTop: 16,
  },
  transcriptText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 6,
  },
});
