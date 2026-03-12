import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { RecordingProvider } from './src/recording/RecordingProvider';
import {
  addDiagnosticsBreadcrumb,
  captureDiagnosticsException,
} from './src/services/diagnostics/diagnostics';
import { syncHistoryWithCloud } from './src/services/history/cloudHistorySyncService';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme';

type Tab = 'record' | 'history' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('record');
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);

  useEffect(() => {
    let alive = true;
    addDiagnosticsBreadcrumb({
      category: 'app.lifecycle',
      message: 'Startup history sync requested.',
    });
    void syncHistoryWithCloud()
      .then(() => {
        if (alive) setHistoryRefreshToken((value) => value + 1);
        addDiagnosticsBreadcrumb({
          category: 'cloud.sync',
          message: 'Startup history sync completed.',
        });
      })
      .catch((error) => {
        captureDiagnosticsException(error, {
          feature: 'cloud_sync',
          level: 'warning',
          stage: 'startup',
        });
      })
    return () => {
      alive = false;
    };
  }, []);

  const handleHistoryUpdated = useCallback(() => {
    setHistoryRefreshToken((value) => value + 1);
  }, []);

  const body = useMemo(() => {
    if (tab === 'settings') return <SettingsScreen />;
    if (tab === 'history') return <HistoryScreen refreshToken={historyRefreshToken} />;
    return <RecordScreen />;
  }, [historyRefreshToken, tab]);

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
            <Pressable
              onPress={() => setTab('settings')}
              style={[styles.tabButton, tab === 'settings' ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabLabel, tab === 'settings' ? styles.tabLabelActive : null]}>
                Settings
              </Text>
            </Pressable>
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
