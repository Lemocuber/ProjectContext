import Slider from '@react-native-community/slider';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { loadSessionHistory, type SessionHistoryItem } from '../storage/sessionHistoryStore';
import { colors } from '../theme';

type HistoryScreenProps = {
  refreshToken: number;
};

type PlayerState = {
  durationMillis: number;
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
};

const EMPTY_PLAYER_STATE: PlayerState = {
  durationMillis: 0,
  isLoaded: false,
  isPlaying: false,
  positionMillis: 0,
};

export function HistoryScreen({ refreshToken }: HistoryScreenProps) {
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SessionHistoryItem | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(EMPTY_PLAYER_STATE);
  const [audioError, setAudioError] = useState('');
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPositionMillis, setSeekPositionMillis] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundOwnerRef = useRef<string | null>(null);
  const loadSeqRef = useRef(0);

  const refreshHistory = useCallback(async () => {
    setHistory(await loadSessionHistory());
  }, []);

  const syncPlayerFromStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setPlayerState(EMPTY_PLAYER_STATE);
      if (status.error) setAudioError('Failed to play saved audio.');
      return;
    }

    setPlayerState({
      durationMillis: status.durationMillis ?? 0,
      isLoaded: true,
      isPlaying: status.isPlaying,
      positionMillis: status.positionMillis,
    });
  }, []);

  const unloadSound = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    soundOwnerRef.current = null;
    setPlayerState(EMPTY_PLAYER_STATE);
    setIsSeeking(false);
    setSeekPositionMillis(0);

    if (!sound) return;
    sound.setOnPlaybackStatusUpdate(null);

    try {
      await sound.unloadAsync();
    } catch {
      // keep UI responsive even if sound unload fails
    }
  }, []);

  const loadSoundForItem = useCallback(
    async (item: SessionHistoryItem): Promise<boolean> => {
      if (!item.audioFileUri) return false;

      const seq = loadSeqRef.current + 1;
      loadSeqRef.current = seq;
      setLoadingAudio(true);
      setAudioError('');

      await unloadSound();
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: item.audioFileUri },
          { shouldPlay: false },
          (nextStatus) => syncPlayerFromStatus(nextStatus),
        );

        if (loadSeqRef.current !== seq) {
          sound.setOnPlaybackStatusUpdate(null);
          await sound.unloadAsync();
          return false;
        }

        soundRef.current = sound;
        soundOwnerRef.current = item.id;
        syncPlayerFromStatus(status);
        return true;
      } catch (error) {
        if (loadSeqRef.current === seq) {
          setAudioError(error instanceof Error ? error.message : 'Failed to load saved audio.');
        }
        return false;
      } finally {
        if (loadSeqRef.current === seq) {
          setLoadingAudio(false);
        }
      }
    },
    [syncPlayerFromStatus, unloadSound],
  );

  const openDetails = useCallback(
    (item: SessionHistoryItem) => {
      setSelectedItem(item);
      setAudioError('');
      if (item.audioFileUri) {
        void loadSoundForItem(item);
      } else {
        void unloadSound();
      }
    },
    [loadSoundForItem, unloadSound],
  );

  const closeDetails = useCallback(async () => {
    loadSeqRef.current += 1;
    setSelectedItem(null);
    setAudioError('');
    await unloadSound();
  }, [unloadSound]);

  const togglePlayPause = useCallback(async () => {
    const item = selectedItem;
    if (!item?.audioFileUri) return;
    setAudioError('');

    try {
      if (!soundRef.current || soundOwnerRef.current !== item.id) {
        const loaded = await loadSoundForItem(item);
        if (!loaded) return;
      }

      const sound = soundRef.current;
      if (!sound) return;

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) throw new Error('Saved audio could not be loaded.');

      if (status.isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Failed to play saved audio.');
    }
  }, [loadSoundForItem, selectedItem]);

  const stopPlayback = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;

    try {
      await sound.stopAsync();
      const status = await sound.getStatusAsync();
      syncPlayerFromStatus(status);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Failed to stop saved audio.');
    }
  }, [syncPlayerFromStatus]);

  const onSeekStart = useCallback(() => {
    if (!playerState.isLoaded || playerState.durationMillis <= 0) return;
    setIsSeeking(true);
    setSeekPositionMillis(playerState.positionMillis);
  }, [playerState]);

  const onSeekChange = useCallback((value: number) => {
    setSeekPositionMillis(value);
  }, []);

  const onSeekComplete = useCallback(async (value: number) => {
    const sound = soundRef.current;
    setIsSeeking(false);
    setSeekPositionMillis(value);
    if (!sound) return;

    try {
      await sound.setPositionAsync(value);
      const status = await sound.getStatusAsync();
      syncPlayerFromStatus(status);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Failed to seek saved audio.');
    }
  }, [syncPlayerFromStatus]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory, refreshToken]);

  useEffect(
    () => () => {
      loadSeqRef.current += 1;
      void unloadSound();
    },
    [unloadSound],
  );

  const displayPosition = useMemo(
    () => (isSeeking ? seekPositionMillis : playerState.positionMillis),
    [isSeeking, playerState.positionMillis, seekPositionMillis],
  );
  const canScrub = playerState.isLoaded && playerState.durationMillis > 0;
  const sliderMax = canScrub ? playerState.durationMillis : 1;
  const sliderValue = Math.max(0, Math.min(displayPosition, sliderMax));

  return (
    <View style={styles.layout}>
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        <ScrollView contentContainerStyle={styles.listWrap} style={styles.list}>
          {history.length ? (
            history.map((item) => (
              <Pressable key={item.id} onPress={() => openDetails(item)} style={styles.item}>
                <Text style={styles.itemMeta}>
                  {formatSessionTime(item.startedAt)} • {item.status}
                </Text>
                <Text style={styles.itemPreview}>{previewText(item)}</Text>
                <View style={styles.itemFooter}>
                  {item.audioFileUri ? <Text style={styles.audioBadge}>Audio saved</Text> : null}
                  <Text style={styles.detailsHint}>Tap for details</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>No saved sessions yet.</Text>
          )}
        </ScrollView>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => void closeDetails()}
        transparent
        visible={!!selectedItem}
      >
        <View style={styles.modalBackdrop}>
          <Pressable onPress={() => void closeDetails()} style={styles.modalDismissArea} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Session Details</Text>
              <Pressable onPress={() => void closeDetails()} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>

            {selectedItem ? (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <Text style={styles.detailMeta}>
                  {formatSessionRange(selectedItem.startedAt, selectedItem.endedAt)}
                </Text>
                <Text style={styles.detailMeta}>Status: {selectedItem.status}</Text>
                {selectedItem.errorText ? <Text style={styles.errorText}>{selectedItem.errorText}</Text> : null}

                <View style={styles.playerCard}>
                  <Text style={styles.label}>Audio Player</Text>
                  {selectedItem.audioFileUri ? (
                    <>
                      <View style={styles.audioControls}>
                        <Pressable onPress={() => void togglePlayPause()} style={styles.audioButton}>
                          <Text style={styles.audioButtonText}>
                            {playerState.isPlaying ? 'Pause' : 'Play'}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => void stopPlayback()} style={styles.audioButtonSecondary}>
                          <Text style={styles.audioButtonSecondaryText}>Stop</Text>
                        </Pressable>
                        {loadingAudio ? <ActivityIndicator color={colors.accent} size="small" /> : null}
                      </View>

                      <Slider
                        disabled={!canScrub}
                        maximumTrackTintColor={colors.border}
                        maximumValue={sliderMax}
                        minimumTrackTintColor={colors.accent}
                        minimumValue={0}
                        onSlidingComplete={(value) => void onSeekComplete(value)}
                        onSlidingStart={onSeekStart}
                        onValueChange={onSeekChange}
                        step={1000}
                        thumbTintColor={colors.accent}
                        value={sliderValue}
                      />

                      <View style={styles.timeRow}>
                        <Text style={styles.timeText}>{formatClock(displayPosition)}</Text>
                        <Text style={styles.timeText}>{formatClock(playerState.durationMillis)}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.noAudioText}>No saved audio file for this session.</Text>
                  )}

                  {audioError ? <Text style={styles.errorText}>{audioError}</Text> : null}
                </View>

                <Text style={styles.label}>Full Transcript</Text>
                <Text style={styles.transcriptText}>
                  {selectedItem.transcript || 'No transcript captured.'}
                </Text>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatSessionTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatSessionRange(startedAt: string, endedAt: string): string {
  const started = formatSessionTime(startedAt);
  const ended = formatSessionTime(endedAt);
  return `Recorded ${started} to ${ended}`;
}

function formatClock(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '00:00';

  const totalSeconds = Math.floor(value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function previewText(item: SessionHistoryItem): string {
  const text = item.transcript || item.errorText || 'No transcript captured.';
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    paddingBottom: 14,
    width: '100%',
  },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    width: '100%',
  },
  list: {
    flex: 1,
  },
  listWrap: {
    gap: 10,
    padding: 14,
    paddingTop: 8,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    paddingHorizontal: 14,
    paddingTop: 14,
    textTransform: 'uppercase',
  },
  item: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: 10,
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  itemPreview: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  itemFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  audioBadge: {
    color: colors.good,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  detailsHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
    width: '100%',
  },
  modalCard: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    minHeight: '55%',
    paddingHorizontal: 16,
    paddingTop: 14,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBody: {
    gap: 10,
    paddingBottom: 18,
  },
  detailMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  playerCard: {
    backgroundColor: '#F8F6F2',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  audioControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  audioButton: {
    backgroundColor: colors.ink,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  audioButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  audioButtonSecondary: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  audioButtonSecondaryText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: colors.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  transcriptText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  noAudioText: {
    color: colors.muted,
    fontSize: 13,
  },
  errorText: {
    color: '#9D1A1A',
    fontSize: 13,
    fontWeight: '600',
  },
});
