import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { FinalPassSpeakerMode } from '../services/asr/dashscopeRecordedRecognition';
import { useRecording } from '../recording/RecordingProvider';
import { colors } from '../theme';

const AUTO_SCROLL_INACTIVITY_MS = 15_000;
const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 56;
const AUTO_SCROLL_THROTTLE_MS = 250;

type FinalPassSpeakerModeOption = {
  value: FinalPassSpeakerMode;
  badge: string;
  icon: 'person' | 'group' | 'groups' | 'hdr-auto';
};

const FINAL_PASS_SPEAKER_MODE_OPTIONS: FinalPassSpeakerModeOption[] = [
  { value: 'auto', badge: 'Auto', icon: 'hdr-auto' },
  { value: 'one', badge: '1', icon: 'person' },
  { value: 'two', badge: '2', icon: 'group' },
  { value: 'three', badge: '3', icon: 'groups' },
];

function formatClock(value: number): string {
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function RecordScreen() {
  const {
    canEditSpeakerMode,
    continueFinalize,
    discardConfirmArmed,
    discardRecording,
    errorText,
    finalPassSpeakerMode,
    hasPendingReview,
    infoText,
    isBusy,
    isRecording,
    isRequestingSuggestion,
    isStopping,
    markHighlight,
    recordingElapsedMs,
    requestSuggestion,
    setFinalPassSpeakerMode,
    start,
    status,
    stop,
    suggestionItems,
    suggestionStatusText,
    transcriptText,
  } = useRecording();
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

  const statusLabel = useMemo(() => {
    if (status === 'review') return 'Review Needed';
    if (isStopping) return 'Stopping';
    if (status === 'recording') return 'Recording';
    if (status === 'finalizing') return 'Finalizing';
    if (status === 'failed') return 'Failed';
    return 'Idle';
  }, [isStopping, status]);

  return (
    <View style={styles.layout}>
      <View style={styles.statusPill}>
        <Text style={styles.statusLabel}>{statusLabel}</Text>
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
        <View style={styles.recordingActionsRow}>
          <Pressable onPress={markHighlight} style={[styles.actionButton, styles.highlightButton]}>
            <MaterialIcons color="#fff" name="flag" size={18} />
            <Text style={styles.highlightButtonText}>Mark</Text>
          </Pressable>
          <Pressable
            disabled={isStopping || isRequestingSuggestion}
            onPress={requestSuggestion}
            style={[
              styles.actionButton,
              styles.suggestionButton,
              isStopping || isRequestingSuggestion ? styles.actionButtonDisabled : null,
            ]}
          >
            <MaterialIcons color="#fff" name="emoji-objects" size={18} />
            <Text style={styles.suggestionButtonText}>
              {isRequestingSuggestion ? 'Thinking...' : 'Insights'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.speakerModeSelectWrap}>
          {FINAL_PASS_SPEAKER_MODE_OPTIONS.map((entry) => {
            const selected = entry.value === finalPassSpeakerMode;
            return (
              <Pressable
                disabled={!canEditSpeakerMode}
                key={entry.value}
                onPress={() => setFinalPassSpeakerMode(entry.value)}
                style={[
                  styles.speakerModeChip,
                  entry.value === 'auto' ? styles.speakerModeChipAuto : styles.speakerModeChipNumber,
                  selected ? styles.speakerModeChipSelected : null,
                  !canEditSpeakerMode ? styles.speakerModeChipDisabled : null,
                ]}
              >
                <Text style={styles.speakerModeBadge}>{entry.badge}</Text>
                <MaterialIcons color={colors.ink} name={entry.icon} size={18} />
              </Pressable>
            );
          })}
        </View>
      )}
      <Text style={styles.recordingTimerText}>{formatClock(recordingElapsedMs)}</Text>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      {infoText ? <Text style={styles.infoText}>{infoText}</Text> : null}
      {suggestionStatusText || suggestionItems.length ? (
        <View style={styles.suggestionPanel}>
          <Text style={styles.suggestionTitle}>Insights</Text>
          {suggestionStatusText ? <Text style={styles.suggestionStatusText}>{suggestionStatusText}</Text> : null}
          {suggestionItems.map((item, index) => (
            <Text key={`${index}-${item}`} style={styles.suggestionItemText}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}

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
  recordingActionsRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
    width: 242,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 42,
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.75,
  },
  highlightButton: {
    backgroundColor: colors.ink,
  },
  highlightButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionButton: {
    backgroundColor: colors.accent,
  },
  suggestionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  speakerModeSelectWrap: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    width: 242,
  },
  speakerModeChip: {
    alignItems: 'center',
    backgroundColor: '#ECE7DD',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    height: 42,
    justifyContent: 'center',
  },
  speakerModeChipAuto: {
    flex: 1.35,
  },
  speakerModeChipNumber: {
    flex: 0.9,
  },
  speakerModeChipSelected: {
    backgroundColor: '#F8E5BF',
    borderColor: '#D2B59B',
  },
  speakerModeChipDisabled: {
    opacity: 0.75,
  },
  speakerModeBadge: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
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
  recordingTimerText: {
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
  suggestionPanel: {
    backgroundColor: '#F2ECE2',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  suggestionTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionStatusText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionItemText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
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
