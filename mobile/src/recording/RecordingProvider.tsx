import { File } from 'expo-file-system';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform, ToastAndroid } from 'react-native';
import {
  getInternalRuntimeSettings,
  loadEffectiveCloudUserId,
  loadEffectiveCosSettings,
  loadEffectiveDashScopeApiKey,
  loadEffectiveDeepSeekApiKey,
  loadEffectiveVocabularySettings,
} from '../config/defaultSettingsConfig';
import { generateLiveSuggestions } from '../services/ai/deepseekLiveSuggestionService';
import {
  runDashScopeRecordedFinalPass,
  type FinalPassSpeakerMode,
} from '../services/asr/dashscopeRecordedRecognition';
import { dashscopeRealtimeSessionService } from '../services/asr/dashscopeRealtimeSession';
import type { AsrEvent, AsrSession } from '../services/asr/types';
import { cleanupCosObjectBestEffort, stageAudioToCos } from '../services/cos/cosStagingService';
import { exportTextToDownloads } from '../services/export/downloadsExportService';
import { uploadSessionToCloud } from '../services/history/cloudHistorySyncService';
import { anchorHighlightTaps, buildFallbackTitle } from '../services/session/sessionFormatting';
import { generateSessionTitle } from '../services/title/deepseekTitleService';
import {
  buildMarkdownFileName,
  buildTranscriptMarkdown,
  buildTranscriptPreview,
  saveTranscriptMarkdown,
} from '../services/transcript/transcriptMarkdown';
import {
  addRecordingKeepaliveStopListener,
  startRecordingKeepaliveNotification,
  stopRecordingKeepaliveNotification,
} from '../services/recording/recordingKeepalive';
import { hasCompleteCosSettings } from '../storage/cosSettingsStore';
import { appendSessionHistory, updateSessionHistoryItem } from '../storage/sessionHistoryStore';
import type { FinalizedSentence, SessionHistoryItem } from '../types/session';

export type RecordingOrchestratorStatus = 'idle' | 'recording' | 'review' | 'finalizing' | 'failed';

type RecordingContextValue = {
  canEditSpeakerMode: boolean;
  discardConfirmArmed: boolean;
  errorText: string;
  finalPassSpeakerMode: FinalPassSpeakerMode;
  hasPendingReview: boolean;
  infoText: string;
  isBusy: boolean;
  isRecording: boolean;
  isRequestingSuggestion: boolean;
  isStopping: boolean;
  recordingElapsedMs: number;
  setFinalPassSpeakerMode: (mode: FinalPassSpeakerMode) => void;
  start: () => Promise<void>;
  status: RecordingOrchestratorStatus;
  stop: () => Promise<void>;
  suggestionItems: string[];
  suggestionStatusText: string;
  transcriptText: string;
  markHighlight: () => void;
  requestSuggestion: () => Promise<void>;
  continueFinalize: () => Promise<void>;
  discardRecording: () => Promise<void>;
};

type RecordingProviderProps = {
  children: ReactNode;
  onHistoryUpdated?: () => void;
};

const DEFAULT_FINAL_PASS_SPEAKER_MODE: FinalPassSpeakerMode = 'auto';
const LIVE_SUGGESTION_COOLDOWN_MS = 30_000;

const RecordingContext = createContext<RecordingContextValue | null>(null);

function buildSessionId(): string {
  const seed = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return seed.slice(0, 24);
}

export function RecordingProvider({ children, onHistoryUpdated }: RecordingProviderProps) {
  const [status, setStatus] = useState<RecordingOrchestratorStatus>('idle');
  const [transcriptText, setTranscriptText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [isRequestingSuggestion, setIsRequestingSuggestion] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [discardConfirmArmed, setDiscardConfirmArmed] = useState(false);
  const [finalPassSpeakerMode, setFinalPassSpeakerMode] = useState<FinalPassSpeakerMode>(
    DEFAULT_FINAL_PASS_SPEAKER_MODE,
  );
  const [isStopping, setIsStopping] = useState(false);
  const [suggestionItems, setSuggestionItems] = useState<string[]>([]);
  const [suggestionStatusText, setSuggestionStatusText] = useState('');
  const sessionRef = useRef<AsrSession | null>(null);
  const pendingFinalizeEventRef = useRef<Extract<AsrEvent, { type: 'final' }> | null>(null);
  const transcriptRef = useRef('');
  const startAtRef = useRef<string | null>(null);
  const startAtMsRef = useRef(0);
  const sessionIdRef = useRef('');
  const ownerUserIdRef = useRef('');
  const persistedRef = useRef(false);
  const highlightTapsMsRef = useRef<number[]>([]);
  const finalPassSpeakerModeRef = useRef<FinalPassSpeakerMode>(DEFAULT_FINAL_PASS_SPEAKER_MODE);
  const appliedVocabularyIdRef = useRef<string | undefined>(undefined);
  const appliedVocabularyTermsRef = useRef<string[]>([]);
  const lastSuggestionAtRef = useRef(0);
  const suggestionRequestIdRef = useRef(0);

  const isRecording = status === 'recording';
  const hasPendingReview = status === 'review' && !!pendingFinalizeEventRef.current;
  const isBusy = isStopping || status === 'review' || status === 'finalizing';
  const canEditSpeakerMode = !isRecording && !isBusy;

  const resetSpeakerMode = () => {
    setFinalPassSpeakerMode(DEFAULT_FINAL_PASS_SPEAKER_MODE);
    finalPassSpeakerModeRef.current = DEFAULT_FINAL_PASS_SPEAKER_MODE;
  };

  const resetDraftState = (nextInfoText = '') => {
    void stopRecordingKeepaliveNotification();
    pendingFinalizeEventRef.current = null;
    setDiscardConfirmArmed(false);
    setStatus('idle');
    setTranscriptText('');
    transcriptRef.current = '';
    setIsRequestingSuggestion(false);
    setRecordingElapsedMs(0);
    setErrorText('');
    setInfoText(nextInfoText);
    setIsStopping(false);
    setSuggestionItems([]);
    setSuggestionStatusText('');
    startAtRef.current = null;
    startAtMsRef.current = 0;
    sessionIdRef.current = '';
    ownerUserIdRef.current = '';
    persistedRef.current = false;
    highlightTapsMsRef.current = [];
    appliedVocabularyIdRef.current = undefined;
    appliedVocabularyTermsRef.current = [];
    lastSuggestionAtRef.current = 0;
    suggestionRequestIdRef.current = 0;
    resetSpeakerMode();
  };

  useEffect(() => {
    const subscription = addRecordingKeepaliveStopListener(() => {
      if (status === 'recording' && !isStopping) {
        void stop();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isStopping, status]);

  useEffect(
    () => () => {
      void stopRecordingKeepaliveNotification();
    },
    [],
  );

  useEffect(() => {
    if (status !== 'recording' || !startAtMsRef.current) return;

    setRecordingElapsedMs(Math.max(0, Date.now() - startAtMsRef.current));
    const timer = setInterval(() => {
      setRecordingElapsedMs(Math.max(0, Date.now() - startAtMsRef.current));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [status]);

  const persistSession = async (item: SessionHistoryItem) => {
    if (persistedRef.current || !sessionIdRef.current) return;
    persistedRef.current = true;
    await appendSessionHistory(item, item.ownerUserId);
    onHistoryUpdated?.();
  };

  const persistFailedSession = async (params: { audioFileUri?: string | null; message: string }) => {
    if (!startAtRef.current || !sessionIdRef.current || !ownerUserIdRef.current) return;
    const startedAt = startAtRef.current;
    const endedAt = new Date().toISOString();
    const transcript = transcriptRef.current.trim();
    const transcriptMarkdownUri = transcript
      ? saveTranscriptMarkdown(ownerUserIdRef.current, sessionIdRef.current, transcript)
      : undefined;
    await persistSession({
      id: sessionIdRef.current,
      ownerUserId: ownerUserIdRef.current,
      startedAt,
      endedAt,
      updatedAt: endedAt,
      status: 'failed',
      title: buildFallbackTitle(startedAt),
      previewText: buildTranscriptPreview(transcript) || params.message,
      errorText: params.message,
      transcriptMarkdownUri,
      audioFileUri: params.audioFileUri ?? undefined,
      cloudSyncStatus: 'idle',
    });
  };

  const toast = (message: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  };

  const finalizeCompletedSession = async (event: Extract<AsrEvent, { type: 'final' }>) => {
    if (!startAtRef.current || !sessionIdRef.current || !ownerUserIdRef.current) return;

    const startedAt = startAtRef.current;
    const ownerUserId = ownerUserIdRef.current;
    const endedAt = new Date().toISOString();
    const fallbackTitle = buildFallbackTitle(startedAt);
    const deepSeekApiKey = (await loadEffectiveDeepSeekApiKey())?.trim() || '';
    const hasDeepSeekKey = !!deepSeekApiKey;
    const realtimeTranscriptRaw = event.text.trim();
    const cosSettings = await loadEffectiveCosSettings();
    const runtimeSettings = await getInternalRuntimeSettings();
    const canRunFinalPass = !!event.audioFileUri && hasCompleteCosSettings(cosSettings);
    const initialCloudSyncStatus = event.audioFileUri ? 'pending' : 'idle';

    let sourceAudioRemoteUrl: string | undefined;
    let sourceAudioObjectKey: string | undefined;
    let finalizedSentences: FinalizedSentence[] = [];
    let bestTranscriptText = realtimeTranscriptRaw;

    await persistSession({
      id: sessionIdRef.current,
      ownerUserId,
      startedAt,
      endedAt,
      updatedAt: endedAt,
      status: 'completed',
      title: fallbackTitle,
      previewText: buildTranscriptPreview(realtimeTranscriptRaw) || 'No transcript captured.',
      audioFileUri: event.audioFileUri ?? undefined,
      cloudSyncStatus: initialCloudSyncStatus,
    });

    if (canRunFinalPass && event.audioFileUri) {
      try {
        setInfoText('Uploading audio for final-pass recognition...');
        const stagedAudio = await stageAudioToCos({
          settings: cosSettings,
          sessionId: sessionIdRef.current,
          startedAt,
          audioFileUri: event.audioFileUri,
          signedUrlTtlSec: runtimeSettings.signedUrlTtlSec,
        });
        sourceAudioRemoteUrl = stagedAudio.sourceAudioRemoteUrl;
        sourceAudioObjectKey = stagedAudio.objectKey;

        const finalPassResult = await runDashScopeRecordedFinalPass({
          apiKey: (await loadEffectiveDashScopeApiKey()) || '',
          sourceAudioRemoteUrl,
          timeoutMs: runtimeSettings.finalPassTimeoutSec * 1000,
          vocabularyId: appliedVocabularyIdRef.current,
          speakerMode: finalPassSpeakerModeRef.current,
          onStatus: setInfoText,
        });

        finalizedSentences = anchorHighlightTaps(
          finalPassResult.finalizedSentences,
          highlightTapsMsRef.current,
        );
        bestTranscriptText =
          finalPassResult.transcriptText.trim() ||
          finalizedSentences.map((sentence) => sentence.text).join(' ').trim() ||
          realtimeTranscriptRaw;
      } catch (error) {
        finalizedSentences = [];
        bestTranscriptText = realtimeTranscriptRaw;
      } finally {
        if (runtimeSettings.cosCleanupEnabled) {
          await cleanupCosObjectBestEffort({
            settings: cosSettings,
            objectKey: sourceAudioObjectKey,
          });
        }
      }
    }

    let finalTitle = fallbackTitle;
    if (hasDeepSeekKey && bestTranscriptText.trim()) {
      setInfoText('Generating session title...');
      try {
        finalTitle =
          (await generateSessionTitle({
          apiKey: deepSeekApiKey,
          transcript: bestTranscriptText,
        })) || fallbackTitle;
      } catch {
        finalTitle = fallbackTitle;
      }
    }

    const markdown = buildTranscriptMarkdown({
      title: finalTitle,
      startedAt,
      endedAt,
      sentences: finalizedSentences.length ? finalizedSentences : undefined,
      fallbackTranscript: finalizedSentences.length ? undefined : realtimeTranscriptRaw,
    });
    const transcriptMarkdownUri = saveTranscriptMarkdown(ownerUserId, sessionIdRef.current, markdown);
    const previewText = buildTranscriptPreview(markdown) || 'No transcript captured.';

    let markdownAutoExportStatus: 'completed' | 'failed' = 'failed';
    let markdownLastPath: string | undefined;
    setInfoText('Exporting markdown to Downloads...');
    try {
      markdownLastPath = await exportTextToDownloads({
        fileName: buildMarkdownFileName(startedAt, finalTitle),
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
      updatedAt: new Date().toISOString(),
      title: finalTitle,
      previewText,
      transcriptMarkdownUri,
      cloudSyncStatus: item.audioFileUri ? 'pending' : 'idle',
      exportMetadata: {
        ...item.exportMetadata,
        markdownAutoExportStatus,
        markdownExportedAt: markdownAutoExportStatus === 'completed' ? new Date().toISOString() : undefined,
        markdownLastPath,
      },
    }), ownerUserId);
    onHistoryUpdated?.();

    if (event.audioFileUri) {
      setInfoText('Syncing session to cloud...');
      await uploadSessionToCloud(sessionIdRef.current, ownerUserId);
      onHistoryUpdated?.();
    }
  };

  const start = async () => {
    if (isStopping || status === 'recording' || status === 'review' || status === 'finalizing') return;

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
    setIsRequestingSuggestion(false);
    setRecordingElapsedMs(0);
    setDiscardConfirmArmed(false);
    setIsStopping(false);
    setSuggestionItems([]);
    setSuggestionStatusText('');
    pendingFinalizeEventRef.current = null;
    startAtRef.current = new Date().toISOString();
    startAtMsRef.current = Date.now();
    sessionIdRef.current = buildSessionId();
    ownerUserIdRef.current = await loadEffectiveCloudUserId();
    persistedRef.current = false;
    highlightTapsMsRef.current = [];
    finalPassSpeakerModeRef.current = finalPassSpeakerMode;
    appliedVocabularyIdRef.current = undefined;
    appliedVocabularyTermsRef.current = [];
    lastSuggestionAtRef.current = 0;
    suggestionRequestIdRef.current = 0;

    const vocabularySettings = await loadEffectiveVocabularySettings();
    const vocabularyId = vocabularySettings.syncStatus === 'failed' ? undefined : vocabularySettings.vocabularyId;
    if (vocabularyId) {
      appliedVocabularyIdRef.current = vocabularyId;
      appliedVocabularyTermsRef.current = [...vocabularySettings.terms];
    }

    try {
      await startRecordingKeepaliveNotification();
      sessionRef.current = await dashscopeRealtimeSessionService.start({
        apiKey,
        userId: ownerUserIdRef.current,
        vocabularyId,
        onEvent: (event) => {
          if (event.type === 'live') {
            transcriptRef.current = event.text;
            setTranscriptText(event.text);
            return;
          }
          if (event.type === 'final') {
            void stopRecordingKeepaliveNotification();
            transcriptRef.current = event.text;
            setTranscriptText(event.text);
            setRecordingElapsedMs(Math.max(0, Date.now() - startAtMsRef.current));
            setIsRequestingSuggestion(false);
            setSuggestionItems([]);
            setSuggestionStatusText('');
            pendingFinalizeEventRef.current = event;
            setDiscardConfirmArmed(false);
            setIsStopping(false);
            setStatus('review');
            setInfoText('Review recording: discard or continue.');
            return;
          }
          if (event.type === 'status') {
            setInfoText(event.message);
            return;
          }
          void stopRecordingKeepaliveNotification();
          pendingFinalizeEventRef.current = null;
          setIsRequestingSuggestion(false);
          setSuggestionItems([]);
          setSuggestionStatusText('');
          setErrorText(event.message);
          setStatus('failed');
          setInfoText('');
          setIsStopping(false);
          resetSpeakerMode();
          void persistFailedSession({
            message: event.message,
            audioFileUri: event.audioFileUri,
          });
        },
      });
    } catch (error) {
      await stopRecordingKeepaliveNotification();
      setStatus('failed');
      setInfoText('');
      setIsStopping(false);
      const message = error instanceof Error ? error.message : 'Failed to start audio session.';
      setErrorText(message);
      resetSpeakerMode();
      await persistFailedSession({ message });
    }
  };

  const stop = async () => {
    if (!sessionRef.current || status !== 'recording' || isStopping) return;
    setIsStopping(true);
    try {
      await sessionRef.current.stop();
    } catch (error) {
      await stopRecordingKeepaliveNotification();
      setStatus('failed');
      setInfoText('');
      setIsStopping(false);
      const message = error instanceof Error ? error.message : 'Failed to stop audio session.';
      setErrorText(message);
      resetSpeakerMode();
      await persistFailedSession({ message });
    } finally {
      sessionRef.current = null;
    }
  };

  const markHighlight = () => {
    if (!startAtMsRef.current || status !== 'recording') return;
    highlightTapsMsRef.current = [...highlightTapsMsRef.current, Math.max(0, Date.now() - startAtMsRef.current)];
  };

  const requestSuggestion = async () => {
    if (status !== 'recording' || isStopping || isRequestingSuggestion) return;

    const deepSeekApiKey = (await loadEffectiveDeepSeekApiKey())?.trim() || '';
    if (!deepSeekApiKey) {
      setSuggestionStatusText('Set your DeepSeek API key in Settings before asking for suggestions.');
      return;
    }

    const transcript = transcriptRef.current.trim();
    if (!transcript) {
      setSuggestionStatusText('Speak a bit more before asking for suggestions.');
      return;
    }

    const remainingMs = LIVE_SUGGESTION_COOLDOWN_MS - (Date.now() - lastSuggestionAtRef.current);
    if (lastSuggestionAtRef.current && remainingMs > 0) {
      setSuggestionStatusText(`Wait ${Math.ceil(remainingMs / 1000)}s before asking again.`);
      return;
    }

    const requestId = suggestionRequestIdRef.current + 1;
    suggestionRequestIdRef.current = requestId;
    setIsRequestingSuggestion(true);
    setSuggestionStatusText('Thinking...');
    try {
      const suggestions = await generateLiveSuggestions({
        apiKey: deepSeekApiKey,
        transcript,
      });
      if (suggestionRequestIdRef.current !== requestId) return;
      lastSuggestionAtRef.current = Date.now();
      setSuggestionItems(suggestions);
      setSuggestionStatusText('');
    } catch (error) {
      if (suggestionRequestIdRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : 'Failed to generate suggestions.';
      setSuggestionStatusText(message);
    } finally {
      if (suggestionRequestIdRef.current === requestId) {
        setIsRequestingSuggestion(false);
      }
    }
  };

  const continueFinalize = async () => {
    const event = pendingFinalizeEventRef.current;
    if (!event || status !== 'review') return;
    pendingFinalizeEventRef.current = null;
    setDiscardConfirmArmed(false);
    setStatus('finalizing');
    setErrorText('');
    setInfoText('Finalizing session...');

    try {
      await finalizeCompletedSession(event);
      resetDraftState('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to finalize session.';
      setErrorText(message);
      setStatus('failed');
      setInfoText('');
      setIsStopping(false);
      resetSpeakerMode();
      await persistFailedSession({
        message,
        audioFileUri: event.audioFileUri,
      });
    }
  };

  const discardRecording = async () => {
    const event = pendingFinalizeEventRef.current;
    if (!event || status !== 'review') return;
    if (!discardConfirmArmed) {
      setDiscardConfirmArmed(true);
      setInfoText('Tap discard again to confirm.');
      return;
    }

    if (event.audioFileUri) {
      try {
        const file = new File(event.audioFileUri);
        if (file.exists) file.delete();
      } catch {
        // Best effort cleanup of local recording artifact.
      }
    }

    resetDraftState('Recording discarded.');
  };

  const value: RecordingContextValue = {
    canEditSpeakerMode,
    discardConfirmArmed,
    errorText,
    finalPassSpeakerMode,
    hasPendingReview,
    infoText,
    isBusy,
    isRecording,
    isRequestingSuggestion,
    isStopping,
    recordingElapsedMs,
    setFinalPassSpeakerMode,
    start,
    status,
    stop,
    suggestionItems,
    suggestionStatusText,
    transcriptText,
    markHighlight,
    requestSuggestion,
    continueFinalize,
    discardRecording,
  };

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>;
}

export function useRecording() {
  const value = useContext(RecordingContext);
  if (!value) throw new Error('useRecording must be used within RecordingProvider.');
  return value;
}
