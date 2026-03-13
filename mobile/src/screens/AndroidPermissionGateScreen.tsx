import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  listAndroidRuntimePermissionCards,
  requestAndroidRuntimePermission,
  type AndroidRuntimePermissionCard,
  type AndroidRuntimePermissionId,
} from '../services/permissions/androidRuntimePermissions';
import {
  addDiagnosticsBreadcrumb,
  captureDiagnosticsException,
  initDiagnostics,
} from '../services/diagnostics/diagnostics';
import { colors } from '../theme';

type AndroidPermissionGateScreenProps = {
  onCompleted: () => void;
};

export function AndroidPermissionGateScreen({ onCompleted }: AndroidPermissionGateScreenProps) {
  const [permissions, setPermissions] = useState<AndroidRuntimePermissionCard[]>([]);
  const [errorText, setErrorText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<AndroidRuntimePermissionId | null>(null);
  const didLogGateShownRef = useRef(false);

  const allGranted = permissions.length > 0 && permissions.every((entry) => entry.granted);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (didLogGateShownRef.current) return;
      didLogGateShownRef.current = true;
      await initDiagnostics();
      if (!alive) return;
      addDiagnosticsBreadcrumb({
        category: 'permissions',
        message: 'Android permission gate displayed.',
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const refreshPermissions = async (showLoader = false) => {
      if (showLoader && alive) setIsLoading(true);
      try {
        const next = await listAndroidRuntimePermissionCards();
        if (!alive) return;
        setPermissions(next);
        setErrorText('');
      } catch (error) {
        captureDiagnosticsException(error, {
          feature: 'permissions',
          level: 'warning',
          stage: 'gate_refresh',
        });
        if (alive) setErrorText('Failed to read Android permission state.');
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void refreshPermissions(true);

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermissions();
    });

    return () => {
      alive = false;
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!allGranted) return;
    addDiagnosticsBreadcrumb({
      category: 'permissions',
      data: { permissions: permissions.map((entry) => entry.id) },
      message: 'All Android permission gate requirements are satisfied.',
    });
    onCompleted();
  }, [allGranted, onCompleted, permissions]);

  const handleGrant = async (id: AndroidRuntimePermissionId) => {
    setRequestingId(id);
    addDiagnosticsBreadcrumb({
      category: 'permissions',
      data: { permission: id },
      message: 'Android permission request triggered from permission gate.',
    });
    try {
      const granted = await requestAndroidRuntimePermission(id);
      const next = await listAndroidRuntimePermissionCards();
      setPermissions(next);
      if (!granted) {
        addDiagnosticsBreadcrumb({
          category: 'permissions',
          data: { permission: id },
          level: 'warning',
          message: 'Android permission request was denied from permission gate.',
        });
        setErrorText(
          id === 'microphone'
            ? 'Microphone access is still required to continue.'
            : 'Notification access is still required to continue.',
        );
      } else {
        setErrorText('');
      }
    } catch (error) {
      captureDiagnosticsException(error, {
        feature: 'permissions',
        level: 'warning',
        stage: 'gate_request',
        extras: { permission: id },
      });
      setErrorText('Failed to request Android permission.');
    } finally {
      setRequestingId(null);
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.layout}>
      <View style={styles.hero}>
        <Text style={styles.title}>Android Permissions</Text>
        <Text style={styles.subtitle}>
          Recording stays locked until every required Android permission is granted.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {isLoading && !permissions.length ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.loadingText}>Checking required permissions...</Text>
          </View>
        ) : null}

        {permissions.map((entry) => {
          const disabled = entry.granted || allGranted || requestingId !== null;
          return (
            <View key={entry.id} style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{entry.title}</Text>
                <Text style={[styles.cardStatus, entry.granted ? styles.cardStatusGranted : null]}>
                  {entry.granted ? 'Granted' : 'Required'}
                </Text>
                <Text style={styles.cardDescription}>{entry.description}</Text>
              </View>

              <Pressable
                disabled={disabled}
                onPress={() => void handleGrant(entry.id)}
                style={({ pressed }) => [
                  styles.grantButton,
                  disabled ? styles.grantButtonDisabled : null,
                  pressed && !disabled ? styles.grantButtonPressed : null,
                ]}
              >
                <Text style={styles.grantButtonText}>
                  {entry.granted ? 'Granted' : requestingId === entry.id ? '...' : 'Grant'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {errorText ? (
        <View style={styles.footer}>
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    paddingBottom: 18,
    paddingTop: 8,
  },
  hero: {
    gap: 8,
    marginBottom: 16,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  cardStatus: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardStatusGranted: {
    color: colors.good,
  },
  cardDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  grantButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 88,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  grantButtonDisabled: {
    backgroundColor: colors.border,
  },
  grantButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  grantButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    marginTop: 16,
  },
  errorText: {
    color: '#9D1A1A',
    fontSize: 13,
    fontWeight: '700',
  },
});
