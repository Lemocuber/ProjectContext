import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { RecordingProvider } from './src/recording/RecordingProvider';
import { shouldHideSettingsTab } from './src/config/defaultSettingsConfig';
import { syncHistoryWithCloud } from './src/services/history/cloudHistorySyncService';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme';

type Tab = 'record' | 'history' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('record');
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [settingsTabHidden, setSettingsTabHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const hidden = await shouldHideSettingsTab();
      if (alive) setSettingsTabHidden(hidden);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void syncHistoryWithCloud()
      .then(() => {
        if (alive) setHistoryRefreshToken((value) => value + 1);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (settingsTabHidden && tab === 'settings') {
      setTab('record');
    }
  }, [settingsTabHidden, tab]);

  const handleHistoryUpdated = useCallback(() => {
    setHistoryRefreshToken((value) => value + 1);
  }, []);

  const body = useMemo(() => {
    if (!settingsTabHidden && tab === 'settings') return <SettingsScreen />;
    if (tab === 'history') return <HistoryScreen refreshToken={historyRefreshToken} />;
    return <RecordScreen />;
  }, [historyRefreshToken, settingsTabHidden, tab]);

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <StatusBar backgroundColor="transparent" style="dark" translucent />
        <View style={styles.container}>
          <Text style={styles.title}>Project Context</Text>
          <Text style={styles.subtitle}>Capture first. Understand later.</Text>

          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setTab('record')}
              style={[styles.tabButton, tab === 'record' ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabLabel, tab === 'record' ? styles.tabLabelActive : null]}>Record</Text>
            </Pressable>
            <Pressable
              onPress={() => setTab('history')}
              style={[styles.tabButton, tab === 'history' ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabLabel, tab === 'history' ? styles.tabLabelActive : null]}>History</Text>
            </Pressable>
            {!settingsTabHidden ? (
              <Pressable
                onPress={() => setTab('settings')}
                style={[styles.tabButton, tab === 'settings' ? styles.tabButtonActive : null]}
              >
                <Text style={[styles.tabLabel, tab === 'settings' ? styles.tabLabelActive : null]}>
                  Settings
                </Text>
              </Pressable>
            ) : null}
          </View>

          <RecordingProvider onHistoryUpdated={handleHistoryUpdated}>{body}</RecordingProvider>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginTop: 16,
  },
  tabButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.ink,
  },
  tabLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#fff',
  },
});
