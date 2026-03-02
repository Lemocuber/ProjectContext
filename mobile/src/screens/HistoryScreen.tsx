import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadSessionHistory, type SessionHistoryItem } from '../storage/sessionHistoryStore';
import { colors } from '../theme';

type HistoryScreenProps = {
  refreshToken: number;
};

export function HistoryScreen({ refreshToken }: HistoryScreenProps) {
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState('');
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundOwnerRef = useRef<string | null>(null);

  const refreshHistory = useCallback(async () => {
    setHistory(await loadSessionHistory());
  }, []);

  const unloadSound = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;

    sound.setOnPlaybackStatusUpdate(null);
    soundRef.current = null;
    soundOwnerRef.current = null;
    setPlayingId(null);

    try {
      await sound.unloadAsync();
    } catch {
      // ignore unload failures to keep history UI usable
    }
  }, []);

  const stopPlayback = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;

    try {
      await sound.stopAsync();
    } catch {
      // ignore stop failures and force cleanup
    }

    await unloadSound();
  }, [unloadSound]);

  const togglePlay = useCallback(
    async (item: SessionHistoryItem) => {
      if (!item.audioFileUri) return;
      setAudioError('');

      try {
        if (soundOwnerRef.current === item.id && soundRef.current) {
          const status = await soundRef.current.getStatusAsync();
          if (!status.isLoaded) throw new Error('Saved audio could not be loaded.');

          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setPlayingId(null);
          } else {
            await soundRef.current.playAsync();
            setPlayingId(item.id);
          }
          return;
        }

        await unloadSound();
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

        const { sound } = await Audio.Sound.createAsync(
          { uri: item.audioFileUri },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded) {
              if (status.error) setAudioError('Failed to play saved audio.');
              setPlayingId(null);
              return;
            }

            if (status.didJustFinish) {
              setPlayingId(null);
            } else {
              setPlayingId(status.isPlaying ? item.id : null);
            }
          },
        );

        soundRef.current = sound;
        soundOwnerRef.current = item.id;
        setPlayingId(item.id);
      } catch (error) {
        setPlayingId(null);
        setAudioError(error instanceof Error ? error.message : 'Failed to play saved audio.');
      }
    },
    [unloadSound],
  );

  const toggleExpand = useCallback(
    (item: SessionHistoryItem) => {
      const nextExpanded = expandedId === item.id ? null : item.id;
      setExpandedId(nextExpanded);
      setAudioError('');

      if (soundOwnerRef.current && soundOwnerRef.current !== nextExpanded) {
        void stopPlayback();
      }
    },
    [expandedId, stopPlayback],
  );

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory, refreshToken]);

  useEffect(
    () => () => {
      void unloadSound();
    },
    [unloadSound],
  );

  return (
    <View style={styles.layout}>
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        <ScrollView contentContainerStyle={styles.listWrap} style={styles.list}>
          {history.length ? (
            history.map((item) => {
              const isExpanded = expandedId === item.id;
              const isPlaying = playingId === item.id;

              return (
                <View key={item.id} style={styles.item}>
                  <Pressable onPress={() => toggleExpand(item)} style={styles.itemHeader}>
                    <Text style={styles.itemMeta}>
                      {formatSessionTime(item.startedAt)} • {item.status}
                    </Text>
                    <Text style={styles.itemPreview}>{previewText(item)}</Text>
                    {item.audioFileUri ? <Text style={styles.audioBadge}>Audio saved</Text> : null}
                  </Pressable>

                  {isExpanded ? (
                    <View style={styles.expandedBlock}>
                      <Text style={styles.detailMeta}>
                        {formatSessionRange(item.startedAt, item.endedAt)}
                      </Text>

                      {item.errorText ? <Text style={styles.errorText}>{item.errorText}</Text> : null}

                      <Text style={styles.label}>Full Transcript</Text>
                      <Text style={styles.transcriptText}>{item.transcript || 'No transcript captured.'}</Text>

                      {item.audioFileUri ? (
                        <View style={styles.audioControls}>
                          <Pressable onPress={() => void togglePlay(item)} style={styles.audioButton}>
                            <Text style={styles.audioButtonText}>{isPlaying ? 'Pause' : 'Play audio'}</Text>
                          </Pressable>
                          <Pressable onPress={() => void stopPlayback()} style={styles.audioButtonSecondary}>
                            <Text style={styles.audioButtonSecondaryText}>Stop</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Text style={styles.noAudioText}>No saved audio file for this session.</Text>
                      )}

                      {audioError ? <Text style={styles.errorText}>{audioError}</Text> : null}
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No saved sessions yet.</Text>
          )}
        </ScrollView>
      </View>
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
    paddingBottom: 10,
  },
  itemHeader: {
    gap: 4,
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
  audioBadge: {
    color: colors.good,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  expandedBlock: {
    gap: 8,
    marginTop: 10,
  },
  detailMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  transcriptText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  audioControls: {
    flexDirection: 'row',
    gap: 8,
  },
  audioButton: {
    backgroundColor: colors.ink,
    borderRadius: 8,
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  audioButtonSecondaryText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  noAudioText: {
    color: colors.muted,
    fontSize: 13,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
  errorText: {
    color: '#9D1A1A',
    fontSize: 13,
    fontWeight: '600',
  },
});
