import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { RecordingProvider } from './src/recording/RecordingProvider';
import {
  addDiagnosticsBreadcrumb,
  captureDiagnosticsException,
  initDiagnostics,
} from './src/services/diagnostics/diagnostics';
import { syncHistoryWithCloud } from './src/services/history/cloudHistorySyncService';
import { hasAllRequiredAndroidPermissions } from './src/services/permissions/androidRuntimePermissions';
import { AndroidPermissionGateScreen } from './src/screens/AndroidPermissionGateScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme';

type Tab = 'record' | 'history' | 'settings';
type AndroidPermissionGateState = 'blocked' | 'exiting' | 'ready';

export default function App() {
  const [tab, setTab] = useState<Tab>('record');
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [permissionGateState, setPermissionGateState] = useState<AndroidPermissionGateState>('ready');
  const { height: windowHeight } = useWindowDimensions();
  const permissionGateTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const granted = await hasAllRequiredAndroidPermissions();
        if (alive && !granted) {
          addDiagnosticsBreadcrumb({
            category: 'permissions',
            data: { source: 'startup_check' },
            message: 'Startup permission check found missing Android permissions.',
          });
          setPermissionGateState('blocked');
        }
      } catch (error) {
        await initDiagnostics();
        captureDiagnosticsException(error, {
          feature: 'permissions',
          level: 'warning',
          stage: 'startup_check',
        });
      }
    })();

    void (async () => {
      await initDiagnostics();
      addDiagnosticsBreadcrumb({
        category: 'app.lifecycle',
        message: 'Startup history sync requested.',
      });
      try {
        await syncHistoryWithCloud();
        if (alive) setHistoryRefreshToken((value) => value + 1);
        addDiagnosticsBreadcrumb({
          category: 'cloud.sync',
          message: 'Startup history sync completed.',
        });
      } catch (error) {
        captureDiagnosticsException(error, {
          feature: 'cloud_sync',
          level: 'warning',
          stage: 'startup',
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleHistoryUpdated = useCallback(() => {
    setHistoryRefreshToken((value) => value + 1);
  }, []);

  const handlePermissionGateCompleted = useCallback(() => {
    if (permissionGateState !== 'blocked') return;
    addDiagnosticsBreadcrumb({
      category: 'permissions',
      message: 'Android permission gate completed. Starting exit animation.',
    });
    setPermissionGateState('exiting');
    Animated.timing(permissionGateTranslateY, {
      toValue: Math.max(windowHeight, 1),
      duration: 800,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      permissionGateTranslateY.setValue(0);
      setPermissionGateState('ready');
    });
  }, [permissionGateState, permissionGateTranslateY, windowHeight]);

  const body = useMemo(() => {
    if (tab === 'settings') return <SettingsScreen />;
    if (tab === 'history') return <HistoryScreen refreshToken={historyRefreshToken} />;
    return <RecordScreen />;
  }, [historyRefreshToken, tab]);

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <StatusBar backgroundColor="transparent" style="dark" translucent />
        <View style={styles.shell}>
          <View style={styles.container}>
            <Text style={styles.title}>Project Context</Text>
            <Text style={styles.subtitle}>Capture first. Understand later.</Text>

            <View style={styles.tabRow}>
              <Pressable
                onPress={() => setTab('record')}
                style={[styles.tabButton, tab === 'record' ? styles.tabButtonActive : null]}
              >
                <Text style={[styles.tabLabel, tab === 'record' ? styles.tabLabelActive : null]}>
                  Record
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTab('history')}
                style={[styles.tabButton, tab === 'history' ? styles.tabButtonActive : null]}
              >
                <Text style={[styles.tabLabel, tab === 'history' ? styles.tabLabelActive : null]}>
                  History
                </Text>
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

          {permissionGateState !== 'ready' ? (
            <Animated.View
              style={[
                styles.permissionGateOverlay,
                { transform: [{ translateY: permissionGateTranslateY }] },
              ]}
            >
              <View style={styles.container}>
                <AndroidPermissionGateScreen onCompleted={handlePermissionGateCompleted} />
              </View>
            </Animated.View>
          ) : null}
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
  shell: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  permissionGateOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    zIndex: 10,
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
