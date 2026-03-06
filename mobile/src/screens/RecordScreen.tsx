import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import {
  FinalPassError,
  runDashScopeRecordedFinalPass,
} from '../services/asr/dashscopeRecordedRecognition';
import {
  getInternalRuntimeSettings,
  loadEffectiveCosSettings,
  loadEffectiveDashScopeApiKey,
  loadEffectiveDeepSeekApiKey,
  loadEffectiveVocabularySettings,
} from '../config/defaultSettingsConfig';
import { dashscopeRealtimeSessionService } from '../services/asr/dashscopeRealtimeSession';
import type { AsrSession, RecordingStatus } from '../services/asr/types';
import { cleanupCosObjectBestEffort, stageAudioToCos } from '../services/cos/cosStagingService';
import { exportTextToDownloads } from '../services/export/downloadsExportService';
import {
  anchorHighlightTaps,
  buildFallbackTitle,
  collectHighlightTexts,
} from '../services/session/sessionFormatting';
import { generateSessionTitle } from '../services/title/deepseekTitleService';
import {
  buildMarkdownFileName,
  buildTranscriptMarkdown,
  saveTranscriptMarkdown,
} from '../services/transcript/transcriptMarkdown';
import { hasCompleteCosSettings } from '../storage/cosSettingsStore';
import {
  appendSessionHistory,
  updateSessionHistoryItem,
} from '../storage/sessionHistoryStore';
import type { AsrEvent } from '../services/asr/types';
import type { FinalPassFailureReason, FinalizedSentence } from '../types/session';
import type { SessionHistoryItem } from '../types/session';
import { colors } from '../theme';

type RecordScreenProps = {
  onHistoryUpdated?: () => void;
};

function inferFinalPassFailureReason(error: unknown): FinalPassFailureReason {
  if (error instanceof FinalPassError) return error.reason;
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (lower.includes('expire') || lower.includes('403') || lower.includes('url')) {
      return 'url_expired';
    }
    if (lower.includes('upload')) return 'upload_failed';
  }
  return 'unknown';
}

export function RecordScreen({ onHistoryUpdated }: RecordScreenProps) {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [transcriptText, setTranscriptText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [highlightCount, setHighlightCount] = useState(0);
  const sessionRef = useRef<AsrSession | null>(null);
  const transcriptRef = useRef('');
  const startAtRef = useRef<string | null>(null);
  const startAtMsRef = useRef<number>(0);
  const sessionIdRef = useRef('');
  const persistedRef = useRef(false);
  const highlightTapsMsRef = useRef<number[]>([]);
  const appliedVocabularyIdRef = useRef<string | undefined>(undefined);
  const appliedVocabularyTermsRef = useRef<string[]>([]);

  const statusLabel = useMemo(() => {
    if (status === 'recording') return 'Recording';
    if (status === 'processing') return 'Stopping';
    if (status === 'failed') return 'Failed';
    return 'Idle';
  }, [status]);

  const persistSession = async (item: SessionHistoryItem) => {
    if (persistedRef.current) return;
    if (!sessionIdRef.current) return;

    persistedRef.current = true;
    await appendSessionHistory(item);
    onHistoryUpdated?.();
  };

  const persistFailedSession = async (params: { message: string; audioFileUri?: string | null }) => {
    if (!startAtRef.current || !sessionIdRef.current) return;
    const startedAt = startAtRef.current;
    const endedAt = new Date().toISOString();
    const fallbackTitle = buildFallbackTitle(startedAt);
    await persistSession({
      id: sessionIdRef.current,
      startedAt,
      endedAt,
      status: 'failed',
      transcript: transcriptRef.current,
      realtimeTranscriptRaw: transcriptRef.current,
      errorText: params.message,
      audioFileUri: params.audioFileUri ?? undefined,
      fallbackTitle,
      highlightTapsMs: [...highlightTapsMsRef.current],
      finalizedSentences: [],
      appliedVocabularyId: appliedVocabularyIdRef.current,
      appliedVocabularyTerms: [...appliedVocabularyTermsRef.current],
      titleStatus: 'failed',
    });
  };

  const toast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    }
  };

  const finalizeCompletedSession = async (event: Extract<AsrEvent, { type: 'final' }>) => {
    if (!startAtRef.current || !sessionIdRef.current) return;

    const startedAt = startAtRef.current;
    const endedAt = new Date().toISOString();
    const fallbackTitle = buildFallbackTitle(startedAt);
    const deepSeekApiKey = (await loadEffectiveDeepSeekApiKey())?.trim() || '';
    const hasDeepSeekKey = !!deepSeekApiKey;
    const realtimeTranscriptRaw = event.text.trim();
    const cosSettings = await loadEffectiveCosSettings();
    const internalRuntimeSettings = getInternalRuntimeSettings();
    const cosConfigured = hasCompleteCosSettings(cosSettings);
    const canRunFinalPass = !!event.audioFileUri && cosConfigured;

    let finalPassStatus: 'pending' | 'completed' | 'failed' = canRunFinalPass ? 'pending' : 'failed';
    let finalPassFailureReason: FinalPassFailureReason | undefined;
    if (!canRunFinalPass) {
      finalPassFailureReason = !event.audioFileUri ? 'upload_failed' : 'unknown';
    }
    let finalPassTaskId: string | undefined;
    let sourceAudioRemoteUrl: string | undefined;
    let sourceAudioObjectKey: string | undefined;
    let finalizedSentences: FinalizedSentence[] = [];
    let bestTranscriptText = realtimeTranscriptRaw;
    let generatedTitle: string | undefined;
    let titleStatus: 'pending' | 'completed' | 'failed' = hasDeepSeekKey ? 'pending' : 'failed';

    await persistSession({
      id: sessionIdRef.current,
      startedAt,
      endedAt,
      status: 'completed',
      transcript: realtimeTranscriptRaw,
      realtimeTranscriptRaw,
      fallbackTitle,
      highlightTapsMs: [...highlightTapsMsRef.current],
      finalizedSentences: [],
      finalPassStatus,
      finalPassFailureReason,
      audioFileUri: event.audioFileUri ?? undefined,
      appliedVocabularyId: appliedVocabularyIdRef.current,
      appliedVocabularyTerms: [...appliedVocabularyTermsRef.current],
      titleStatus,
    });
    if (canRunFinalPass && event.audioFileUri) {
      try {
        setInfoText('Uploading audio for final-pass recognition...');
        const stagedAudio = await stageAudioToCos({
          settings: cosSettings,
          sessionId: sessionIdRef.current,
          startedAt,
          audioFileUri: event.audioFileUri,
          signedUrlTtlSec: internalRuntimeSettings.signedUrlTtlSec,
        });
        sourceAudioRemoteUrl = stagedAudio.sourceAudioRemoteUrl;
        sourceAudioObjectKey = stagedAudio.objectKey;
        await updateSessionHistoryItem(sessionIdRef.current, (item) => ({
          ...item,
          sourceAudioRemoteUrl,
          sourceAudioObjectKey,
        }));
        onHistoryUpdated?.();

        const finalPassResult = await runDashScopeRecordedFinalPass({
          apiKey: (await loadEffectiveDashScopeApiKey()) || '',
          sourceAudioRemoteUrl,
          timeoutMs: internalRuntimeSettings.finalPassTimeoutSec * 1000,
          vocabularyId: appliedVocabularyIdRef.current,
          onStatus: (message) => setInfoText(message),
        });

        finalPassTaskId = finalPassResult.taskId;
        finalizedSentences = anchorHighlightTaps(
          finalPassResult.finalizedSentences,
          highlightTapsMsRef.current,
        );
        bestTranscriptText =
          finalPassResult.transcriptText.trim() ||
          finalizedSentences.map((sentence) => sentence.text).join(' ').trim() ||
          realtimeTranscriptRaw;
        finalPassStatus = 'completed';
        finalPassFailureReason = undefined;
      } catch (error) {
        finalPassStatus = 'failed';
        finalPassFailureReason = inferFinalPassFailureReason(error);
        finalizedSentences = [];
        bestTranscriptText = realtimeTranscriptRaw;
      } finally {
        if (internalRuntimeSettings.cosCleanupEnabled) {
          await cleanupCosObjectBestEffort({
            settings: cosSettings,
            objectKey: sourceAudioObjectKey,
          });
        }
      }
    }

    if (hasDeepSeekKey && bestTranscriptText.trim()) {
      setInfoText('Generating session title...');
      try {
        generatedTitle = await generateSessionTitle({
          apiKey: deepSeekApiKey,
          transcript: bestTranscriptText,
          highlights: collectHighlightTexts(finalizedSentences),
        });
        titleStatus = 'completed';
      } catch {
        titleStatus = 'failed';
      }
    } else if (hasDeepSeekKey) {
      titleStatus = 'failed';
    }

    const finalTitle = generatedTitle || fallbackTitle;
    const markdown = buildTranscriptMarkdown({
      title: finalTitle,
      startedAt,
      endedAt,
      sentences: finalPassStatus === 'completed' ? finalizedSentences : undefined,
      fallbackTranscript: finalPassStatus === 'completed' ? undefined : realtimeTranscriptRaw,
    });
    const transcriptMarkdownUri = saveTranscriptMarkdown(sessionIdRef.current, markdown);
    const markdownFileName = buildMarkdownFileName(startedAt, finalTitle);

    let markdownAutoExportStatus: 'completed' | 'failed' = 'failed';
    let markdownLastPath: string | undefined;
    setInfoText('Exporting markdown to Downloads...');
    try {
      markdownLastPath = await exportTextToDownloads({
        fileName: markdownFileName,
        content: markdown,
      });
      markdownAutoExportStatus = 'completed';
      toast('Markdown exported to Downloads.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Markdown auto-export failed.';
      toast(message);
    }

    await updateSessionHistoryItem(sessionIdRef.current, (item) => ({
      ...item,
      transcript: markdown,
      generatedTitle,
      titleStatus,
      finalizedSentences: finalPassStatus === 'completed' ? finalizedSentences : [],
      finalPassStatus,
      finalPassTaskId,
      finalPassFailureReason,
      sourceAudioRemoteUrl,
      sourceAudioObjectKey,
      transcriptMarkdownUri,
      exportMetadata: {
        ...item.exportMetadata,
        markdownAutoExportStatus,
        markdownExportedAt: markdownAutoExportStatus === 'completed' ? new Date().toISOString() : undefined,
        markdownLastPath,
      },
    }));
    onHistoryUpdated?.();
  };

  const start = async () => {
    if (status === 'processing') return;

    const apiKey = await loadEffectiveDashScopeApiKey();
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
    setHighlightCount(0);
    startAtRef.current = new Date().toISOString();
    startAtMsRef.current = Date.now();
    sessionIdRef.current = buildSessionId();
    persistedRef.current = false;
    highlightTapsMsRef.current = [];
    appliedVocabularyIdRef.current = undefined;
    appliedVocabularyTermsRef.current = [];

    const vocabularySettings = await loadEffectiveVocabularySettings();
    const vocabularyId = vocabularySettings.syncStatus === 'failed' ? undefined : vocabularySettings.vocabularyId;
    if (vocabularyId) {
      appliedVocabularyIdRef.current = vocabularyId;
      appliedVocabularyTermsRef.current = [...vocabularySettings.terms];
    }

    try {
      sessionRef.current = await dashscopeRealtimeSessionService.start({
        apiKey,
        vocabularyId,
        onEvent: (event) => {
          if (event.type === 'live') {
            transcriptRef.current = event.text;
            setTranscriptText(event.text);
          }
          if (event.type === 'final') {
            transcriptRef.current = event.text;
            setTranscriptText(event.text);
            setInfoText('Finalizing session...');
            void (async () => {
              let failed = false;
              try {
                await finalizeCompletedSession(event);
              } catch (error) {
                failed = true;
                const message =
                  error instanceof Error ? error.message : 'Failed to finalize session.';
                setErrorText(message);
                setStatus('failed');
                await persistFailedSession({
                  message,
                  audioFileUri: event.audioFileUri,
                });
              } finally {
                setInfoText('');
                if (!failed) setStatus('idle');
              }
            })();
          }
          if (event.type === 'status') {
            setInfoText(event.message);
          }
          if (event.type === 'error') {
            setErrorText(event.message);
            setStatus('failed');
            setInfoText('');
            void persistFailedSession({
              message: event.message,
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
      await persistFailedSession({ message });
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
      await persistFailedSession({ message });
    } finally {
      sessionRef.current = null;
    }
  };

  const markHighlight = () => {
    if (!startAtMsRef.current || status !== 'recording') return;
    const tapMs = Math.max(0, Date.now() - startAtMsRef.current);
    highlightTapsMsRef.current = [...highlightTapsMsRef.current, tapMs];
    setHighlightCount(highlightTapsMsRef.current.length);
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

      <Pressable
        disabled={!isRecording}
        onPress={markHighlight}
        style={[styles.highlightButton, !isRecording ? styles.highlightButtonDisabled : null]}
      >
        <Text style={styles.highlightButtonText}>Mark Highlight</Text>
      </Pressable>
      <Text style={styles.highlightCountText}>Highlights: {highlightCount}</Text>

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
  highlightButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.ink,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  highlightButtonDisabled: {
    backgroundColor: colors.border,
  },
  highlightButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  highlightCountText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
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
