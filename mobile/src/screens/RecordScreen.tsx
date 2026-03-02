import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dashscopeRealtimeSessionService } from '../services/asr/dashscopeRealtimeSession';
import type { AsrSession, RecordingStatus } from '../services/asr/types';
import { loadApiKey } from '../storage/apiKeyStore';
import { colors } from '../theme';

export function RecordScreen() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [liveText, setLiveText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [errorText, setErrorText] = useState('');
  const sessionRef = useRef<AsrSession | null>(null);

  const statusLabel = useMemo(() => {
    if (status === 'recording') return 'Recording';
    if (status === 'processing') return 'Finalizing';
    if (status === 'failed') return 'Failed';
    return 'Idle';
  }, [status]);

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
    setFinalText('');
    setErrorText('');

    try {
      sessionRef.current = await dashscopeRealtimeSessionService.start({
        apiKey,
        onEvent: (event) => {
          if (event.type === 'live') setLiveText(event.text);
          if (event.type === 'final') {
            setFinalText(event.text);
            setStatus('idle');
          }
          if (event.type === 'error') {
            setErrorText(event.message);
            setStatus('failed');
          }
        },
      });
    } catch (error) {
      setStatus('failed');
      setErrorText(
        error instanceof Error ? error.message : 'Failed to start audio session.',
      );
    }
  };

  const stop = async () => {
    if (!sessionRef.current) return;
    setStatus('processing');
    try {
      await sessionRef.current.stop();
    } catch (error) {
      setStatus('failed');
      setErrorText(
        error instanceof Error ? error.message : 'Failed to stop audio session.',
      );
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

        <Text style={[styles.sectionTitle, styles.finalTitle]}>Final Cleaned</Text>
        <Text style={styles.transcriptText}>{finalText || 'Stop recording to generate final transcript.'}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    gap: 14,
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
    maxHeight: 340,
    minHeight: 260,
    width: '100%',
  },
  transcriptWrap: {
    padding: 14,
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
