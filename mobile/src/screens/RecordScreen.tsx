import { MaterialIcons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import {
  FinalPassError,
  runDashScopeRecordedFinalPass,
  type FinalPassSpeakerMode,
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

const AUTO_SCROLL_INACTIVITY_MS = 15_000;
const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 56;
const AUTO_SCROLL_THROTTLE_MS = 250;
const DEFAULT_FINAL_PASS_SPEAKER_MODE: FinalPassSpeakerMode = 'auto';

type FinalPassSpeakerModeOption = {
  value: FinalPassSpeakerMode;
  label: string;
  badge: string;
  icon: 'person' | 'groups';
};

const FINAL_PASS_SPEAKER_MODE_OPTIONS: FinalPassSpeakerModeOption[] = [
  { value: 'auto', label: 'Auto decide', badge: 'AUTO', icon: 'groups' },
  { value: 'one', label: '1 person (no diarization)', badge: '1', icon: 'person' },
  { value: 'two', label: '2 person', badge: '2', icon: 'groups' },
  { value: 'three', label: '3 person', badge: '3', icon: 'groups' },
];

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
  const [pendingFinalizeEvent, setPendingFinalizeEvent] = useState<
    Extract<AsrEvent, { type: 'final' }> | null
  >(null);
  const [discardConfirmArmed, setDiscardConfirmArmed] = useState(false);
  const [finalPassSpeakerMode, setFinalPassSpeakerMode] = useState<FinalPassSpeakerMode>(
    DEFAULT_FINAL_PASS_SPEAKER_MODE,
  );
  const [speakerModeMenuOpen, setSpeakerModeMenuOpen] = useState(false);
  const sessionRef = useRef<AsrSession | null>(null);
  const transcriptRef = useRef('');
  const startAtRef = useRef<string | null>(null);
  const startAtMsRef = useRef<number>(0);
  const sessionIdRef = useRef('');
  const persistedRef = useRef(false);
  const highlightTapsMsRef = useRef<number[]>([]);
  const finalPassSpeakerModeRef = useRef<FinalPassSpeakerMode>(DEFAULT_FINAL_PASS_SPEAKER_MODE);
  const appliedVocabularyIdRef = useRef<string | undefined>(undefined);
  const appliedVocabularyTermsRef = useRef<string[]>([]);
  const transcriptScrollRef = useRef<ScrollView | null>(null);
  const autoScrollEnabledRef = useRef(true);
  const lastUserScrollAtRef = useRef(0);
  const lastAutoScrollAtRef = useRef(0);
  const scrollMetricsRef = useRef({
    contentHeight: 0,
    layoutHeight: 0,
    offsetY: 0,
  });
  const programmaticScrollRef = useRef(false);
  const programmaticScrollResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRecording = status === 'recording';
  const hasPendingReview = !!pendingFinalizeEvent;
  const isBusy = status === 'processing' || hasPendingReview;
  const canEditSpeakerMode = !isRecording && !hasPendingReview && status !== 'processing';

  const selectedFinalPassSpeakerMode =
    FINAL_PASS_SPEAKER_MODE_OPTIONS.find((entry) => entry.value === finalPassSpeakerMode) ||
    FINAL_PASS_SPEAKER_MODE_OPTIONS[0];

  const resetFinalPassSpeakerModeSelection = () => {
    setFinalPassSpeakerMode(DEFAULT_FINAL_PASS_SPEAKER_MODE);
    finalPassSpeakerModeRef.current = DEFAULT_FINAL_PASS_SPEAKER_MODE;
    setSpeakerModeMenuOpen(false);
  };

  const isNearBottom = () => {
    const metrics = scrollMetricsRef.current;
    const distanceToBottom = metrics.contentHeight - (metrics.offsetY + metrics.layoutHeight);
    return distanceToBottom <= AUTO_SCROLL_BOTTOM_THRESHOLD_PX;
  };

  const scrollTranscriptToBottom = () => {
    if (!transcriptScrollRef.current) return;
    const now = Date.now();
    if (now - lastAutoScrollAtRef.current < AUTO_SCROLL_THROTTLE_MS) return;
    lastAutoScrollAtRef.current = now;
    programmaticScrollRef.current = true;
    if (programmaticScrollResetTimerRef.current) {
      clearTimeout(programmaticScrollResetTimerRef.current);
    }
    programmaticScrollResetTimerRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
      programmaticScrollResetTimerRef.current = null;
    }, 220);
    transcriptScrollRef.current.scrollToEnd({ animated: true });
  };

  const maybeAutoScrollTranscript = () => {
    if (!isRecording) return;
    const inactiveMs = Date.now() - lastUserScrollAtRef.current;
    if (
      autoScrollEnabledRef.current ||
      lastUserScrollAtRef.current === 0 ||
      inactiveMs > AUTO_SCROLL_INACTIVITY_MS
    ) {
      autoScrollEnabledRef.current = true;
      scrollTranscriptToBottom();
    }
  };

  const handleTranscriptScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    scrollMetricsRef.current = {
      contentHeight: contentSize.height,
      layoutHeight: layoutMeasurement.height,
      offsetY: contentOffset.y,
    };
    if (programmaticScrollRef.current) return;
    lastUserScrollAtRef.current = Date.now();
    autoScrollEnabledRef.current = isNearBottom();
  };

  useEffect(() => {
    maybeAutoScrollTranscript();
  }, [isRecording, transcriptText]);

  useEffect(
    () => () => {
      if (programmaticScrollResetTimerRef.current) {
        clearTimeout(programmaticScrollResetTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!canEditSpeakerMode) setSpeakerModeMenuOpen(false);
  }, [canEditSpeakerMode]);

  const statusLabel = useMemo(() => {
    if (pendingFinalizeEvent) return 'Review Needed';
    if (status === 'recording') return 'Recording';
    if (status === 'processing') return 'Stopping';
    if (status === 'failed') return 'Failed';
    return 'Idle';
  }, [pendingFinalizeEvent, status]);

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
    const internalRuntimeSettings = await getInternalRuntimeSettings();
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
          speakerMode: finalPassSpeakerModeRef.current,
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
    if (status === 'processing' || hasPendingReview) return;

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
    setPendingFinalizeEvent(null);
    setDiscardConfirmArmed(false);
    setSpeakerModeMenuOpen(false);
    startAtRef.current = new Date().toISOString();
    startAtMsRef.current = Date.now();
    sessionIdRef.current = buildSessionId();
    persistedRef.current = false;
    highlightTapsMsRef.current = [];
    finalPassSpeakerModeRef.current = finalPassSpeakerMode;
    appliedVocabularyIdRef.current = undefined;
    appliedVocabularyTermsRef.current = [];
    autoScrollEnabledRef.current = true;
    lastUserScrollAtRef.current = 0;
    lastAutoScrollAtRef.current = 0;
    scrollMetricsRef.current = {
      contentHeight: 0,
      layoutHeight: 0,
      offsetY: 0,
    };

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
            setPendingFinalizeEvent(event);
            setDiscardConfirmArmed(false);
            setStatus('idle');
            setInfoText('Review recording: discard or continue.');
          }
          if (event.type === 'status') {
            setInfoText(event.message);
          }
          if (event.type === 'error') {
            setErrorText(event.message);
            setStatus('failed');
            setInfoText('');
            resetFinalPassSpeakerModeSelection();
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
      resetFinalPassSpeakerModeSelection();
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
      resetFinalPassSpeakerModeSelection();
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

  const continueFinalize = async () => {
    if (!pendingFinalizeEvent) return;
    const event = pendingFinalizeEvent;
    setPendingFinalizeEvent(null);
    setDiscardConfirmArmed(false);
    setStatus('processing');
    setErrorText('');
    setInfoText('Finalizing session...');

    let failed = false;
    try {
      await finalizeCompletedSession(event);
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : 'Failed to finalize session.';
      setErrorText(message);
      setStatus('failed');
      await persistFailedSession({
        message,
        audioFileUri: event.audioFileUri,
      });
    } finally {
      setInfoText('');
      resetFinalPassSpeakerModeSelection();
      if (!failed) {
        setStatus('idle');
      }
    }
  };

  const discardRecording = async () => {
    if (!pendingFinalizeEvent) return;
    if (!discardConfirmArmed) {
      setDiscardConfirmArmed(true);
      setInfoText('Tap discard again to confirm.');
      return;
    }

    if (pendingFinalizeEvent.audioFileUri) {
      try {
        const file = new File(pendingFinalizeEvent.audioFileUri);
        if (file.exists) {
          file.delete();
        }
      } catch {
        // Best effort cleanup of local recording artifact.
      }
    }

    setPendingFinalizeEvent(null);
    setDiscardConfirmArmed(false);
    resetFinalPassSpeakerModeSelection();
    setStatus('idle');
    setTranscriptText('');
    transcriptRef.current = '';
    setHighlightCount(0);
    setErrorText('');
    setInfoText('Recording discarded.');
    startAtRef.current = null;
    startAtMsRef.current = 0;
    sessionIdRef.current = '';
    persistedRef.current = false;
    highlightTapsMsRef.current = [];
    finalPassSpeakerModeRef.current = DEFAULT_FINAL_PASS_SPEAKER_MODE;
    appliedVocabularyIdRef.current = undefined;
    appliedVocabularyTermsRef.current = [];
    autoScrollEnabledRef.current = true;
    lastUserScrollAtRef.current = 0;
    lastAutoScrollAtRef.current = 0;
    scrollMetricsRef.current = {
      contentHeight: 0,
      layoutHeight: 0,
      offsetY: 0,
    };
  };

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
          pressed && !isBusy ? styles.recordButtonPressed : null,
        ]}
      >
        <MaterialIcons
          color="#fff"
          name={isRecording ? 'stop' : 'play-arrow'}
          size={isRecording ? 72 : 86}
        />
      </Pressable>

      {hasPendingReview ? (
        <View style={styles.postRecordActionsRow}>
          <Pressable
            onPress={discardRecording}
            style={[
              styles.postRecordDiscardButton,
              discardConfirmArmed ? styles.postRecordDiscardButtonArmed : null,
            ]}
          >
            <MaterialIcons
              color={discardConfirmArmed ? '#9D1A1A' : colors.muted}
              name={discardConfirmArmed ? 'help-outline' : 'delete-outline'}
              size={22}
            />
          </Pressable>
          <Pressable onPress={continueFinalize} style={styles.postRecordContinueButton}>
            <MaterialIcons color="#fff" name="check" size={26} />
          </Pressable>
        </View>
      ) : isRecording ? (
        <Pressable onPress={markHighlight} style={styles.highlightButton}>
          <Text style={styles.highlightButtonText}>Mark Highlight</Text>
        </Pressable>
      ) : (
        <View style={styles.speakerModeSelectWrap}>
          <Pressable
            disabled={!canEditSpeakerMode}
            onPress={() => setSpeakerModeMenuOpen((current) => !current)}
            style={[
              styles.speakerModeSelectButton,
              !canEditSpeakerMode ? styles.speakerModeSelectButtonDisabled : null,
              speakerModeMenuOpen ? styles.speakerModeSelectButtonOpen : null,
            ]}
          >
            <View style={styles.speakerModeValueWrap}>
              <Text style={styles.speakerModeBadge}>{selectedFinalPassSpeakerMode.badge}</Text>
              <MaterialIcons color={colors.ink} name={selectedFinalPassSpeakerMode.icon} size={18} />
              <Text numberOfLines={1} style={styles.speakerModeLabel}>
                {selectedFinalPassSpeakerMode.label}
              </Text>
            </View>
            <MaterialIcons
              color={colors.muted}
              name={speakerModeMenuOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={22}
            />
          </Pressable>
          {speakerModeMenuOpen ? (
            <View style={styles.speakerModeMenu}>
              {FINAL_PASS_SPEAKER_MODE_OPTIONS.map((entry) => {
                const selected = entry.value === finalPassSpeakerMode;
                return (
                  <Pressable
                    key={entry.value}
                    onPress={() => {
                      setFinalPassSpeakerMode(entry.value);
                      setSpeakerModeMenuOpen(false);
                    }}
                    style={[
                      styles.speakerModeMenuItem,
                      selected ? styles.speakerModeMenuItemSelected : null,
                    ]}
                  >
                    <View style={styles.speakerModeValueWrap}>
                      <Text style={styles.speakerModeBadge}>{entry.badge}</Text>
                      <MaterialIcons color={colors.ink} name={entry.icon} size={18} />
                      <Text numberOfLines={1} style={styles.speakerModeLabel}>
                        {entry.label}
                      </Text>
                    </View>
                    {selected ? <MaterialIcons color={colors.accent} name="check" size={18} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      )}
      <Text style={styles.highlightCountText}>Highlights: {highlightCount}</Text>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {infoText ? <Text style={styles.infoText}>{infoText}</Text> : null}

      <ScrollView
        contentContainerStyle={styles.transcriptWrap}
        onContentSizeChange={(_, contentHeight) => {
          scrollMetricsRef.current.contentHeight = contentHeight;
          maybeAutoScrollTranscript();
        }}
        onLayout={(event) => {
          scrollMetricsRef.current.layoutHeight = event.nativeEvent.layout.height;
          maybeAutoScrollTranscript();
        }}
        onScroll={handleTranscriptScroll}
        ref={transcriptScrollRef}
        scrollEventThrottle={100}
        style={styles.transcriptPanel}
      >
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
  highlightButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.ink,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  highlightButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  speakerModeSelectWrap: {
    alignSelf: 'center',
    width: 242,
    zIndex: 3,
  },
  speakerModeSelectButton: {
    alignItems: 'center',
    backgroundColor: '#ECE7DD',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    height: 42,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  speakerModeSelectButtonDisabled: {
    opacity: 0.75,
  },
  speakerModeSelectButtonOpen: {
    borderColor: '#D2B59B',
  },
  speakerModeValueWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  speakerModeBadge: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    width: 32,
  },
  speakerModeLabel: {
    color: colors.ink,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  speakerModeMenu: {
    backgroundColor: '#ECE7DD',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  speakerModeMenuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  speakerModeMenuItemSelected: {
    backgroundColor: '#F5ECDF',
  },
  postRecordActionsRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
    width: 242,
  },
  postRecordDiscardButton: {
    alignItems: 'center',
    backgroundColor: '#ECE7DD',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 76,
  },
  postRecordDiscardButtonArmed: {
    backgroundColor: '#F7E6E0',
    borderColor: '#D9A79A',
  },
  postRecordContinueButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    flex: 1,
    height: 42,
    justifyContent: 'center',
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
