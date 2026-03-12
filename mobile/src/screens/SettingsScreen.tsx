import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  getHiddenSettingsSections,
  loadEffectiveCosSettings,
  loadEffectiveDashScopeApiKey,
  loadEffectiveDeepSeekApiKey,
  loadEffectiveVocabularySettings,
} from '../config/defaultSettingsConfig';
import {
  captureDiagnosticsException,
  captureDiagnosticsMessage,
  flushDiagnostics,
  getDiagnosticsRelease,
  getDiagnosticsSupportInfo,
  initDiagnostics,
  isDiagnosticsEnabled,
} from '../services/diagnostics/diagnostics';
import { syncDashScopeVocabulary, deleteDashScopeVocabulary } from '../services/vocabulary/dashscopeVocabularyService';
import { prepareVocabulary } from '../services/vocabulary/vocabularyUtils';
import {
  clearApiKey,
  looksLikeDashScopeApiKey,
  maskApiKey,
  saveApiKey,
} from '../storage/apiKeyStore';
import {
  clearDeepSeekApiKey,
  looksLikeDeepSeekApiKey,
  saveDeepSeekApiKey,
} from '../storage/deepseekKeyStore';
import {
  clearVocabularySettings,
  saveVocabularySettings,
  type VocabularySyncStatus,
} from '../storage/vocabularySettingsStore';
import {
  clearCosSettings,
  hasCompleteCosSettings,
  looksLikeCosBucket,
  looksLikeCosRegion,
  normalizeCosSettings,
  saveCosSettings,
  type CosSettings,
} from '../storage/cosSettingsStore';
import {
  loadCloudUserId,
  looksLikeCloudUserId,
  saveCloudUserId,
} from '../storage/cloudUserIdStore';
import { colors } from '../theme';

export function SettingsScreen() {
  const { height: viewportHeight } = useWindowDimensions();
  const [hiddenSections, setHiddenSections] = useState<{
    dashscope: boolean;
    deepseek: boolean;
    cloudUserId: boolean;
    tencentCos: boolean;
    vocabulary: boolean;
  } | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [savedMask, setSavedMask] = useState('');
  const [deepSeekApiKey, setDeepSeekApiKey] = useState('');
  const [savedDeepSeekMask, setSavedDeepSeekMask] = useState('');
  const [vocabularyText, setVocabularyText] = useState('');
  const [vocabularyId, setVocabularyId] = useState<string | undefined>(undefined);
  const [vocabularySyncStatus, setVocabularySyncStatus] = useState<VocabularySyncStatus>('idle');
  const [vocabularyError, setVocabularyError] = useState('');
  const [vocabularyCount, setVocabularyCount] = useState(0);
  const [vocabularyBusy, setVocabularyBusy] = useState(false);
  const [cosBucket, setCosBucket] = useState('');
  const [cosRegion, setCosRegion] = useState('');
  const [cosSecretId, setCosSecretId] = useState('');
  const [cosSecretKey, setCosSecretKey] = useState('');
  const [cloudUserId, setCloudUserId] = useState('');
  const [savedCloudUserId, setSavedCloudUserId] = useState('');
  const [diagnosticsBusy, setDiagnosticsBusy] = useState(false);
  const [diagnosticsNote, setDiagnosticsNote] = useState('');
  const [diagnosticsStatus, setDiagnosticsStatus] = useState('');
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
  const [supportInfo, setSupportInfo] = useState('');

  useEffect(() => {
    let alive = true;
    void (async () => {
      const sections = await getHiddenSettingsSections();
      if (!alive) return;
      setHiddenSections(sections);
      const showDashScope = !sections.dashscope;
      const showDeepSeek = !sections.deepseek;
      const showCloudUserId = !sections.cloudUserId;
      const showTencentCos = !sections.tencentCos;
      const showVocabulary = !sections.vocabulary;

      const [dashScopeKey, deepSeekKey, vocabularySettings, cosSettings, nextCloudUserId] = await Promise.all([
        showDashScope ? loadEffectiveDashScopeApiKey() : Promise.resolve<string | null>(null),
        showDeepSeek ? loadEffectiveDeepSeekApiKey() : Promise.resolve<string | null>(null),
        showVocabulary
          ? loadEffectiveVocabularySettings()
          : Promise.resolve({
              rawText: '',
              terms: [],
              vocabularyId: undefined,
              syncStatus: 'idle' as const,
            }),
        showTencentCos
          ? loadEffectiveCosSettings()
          : Promise.resolve({
              cosBucket: '',
              cosRegion: '',
              secretId: '',
              secretKey: '',
            }),
        showCloudUserId ? loadCloudUserId() : Promise.resolve(''),
      ]);
      if (!alive) return;

      if (dashScopeKey) setSavedMask(maskApiKey(dashScopeKey));
      if (deepSeekKey) setSavedDeepSeekMask(maskApiKey(deepSeekKey));

      if (showVocabulary) {
        setVocabularyText(vocabularySettings.rawText);
        setVocabularyId(vocabularySettings.vocabularyId);
        setVocabularySyncStatus(vocabularySettings.syncStatus || 'idle');
        setVocabularyCount(vocabularySettings.terms.length);
      }
      if (showTencentCos) {
        hydrateCosSettings(cosSettings);
      }
      if (showCloudUserId) {
        setCloudUserId(nextCloudUserId);
        setSavedCloudUserId(nextCloudUserId);
      }

      await initDiagnostics();
      const [enabled, info] = await Promise.all([
        isDiagnosticsEnabled(),
        getDiagnosticsSupportInfo(),
      ]);
      if (!alive) return;
      setDiagnosticsEnabled(enabled);
      setSupportInfo(info);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const hydrateCosSettings = (settings: CosSettings) => {
    setCosBucket(settings.cosBucket);
    setCosRegion(settings.cosRegion);
    setCosSecretId(settings.secretId);
    setCosSecretKey(settings.secretKey);
  };

  const onSave = async () => {
    if (!looksLikeDashScopeApiKey(apiKey)) {
      Alert.alert('Invalid key', 'Use a DashScope key that starts with sk-.');
      return;
    }

    await saveApiKey(apiKey);
    setSavedMask(maskApiKey(apiKey));
    setApiKey('');
    Alert.alert('Saved', 'API key stored in secure storage.');
  };

  const onClear = async () => {
    await clearApiKey();
    setSavedMask('');
    Alert.alert('Cleared', 'API key removed from secure storage.');
  };

  const onSaveDeepSeek = async () => {
    if (!looksLikeDeepSeekApiKey(deepSeekApiKey)) {
      Alert.alert('Invalid key', 'Use a DeepSeek key that starts with sk-.');
      return;
    }

    await saveDeepSeekApiKey(deepSeekApiKey);
    setSavedDeepSeekMask(maskApiKey(deepSeekApiKey));
    setDeepSeekApiKey('');
    Alert.alert('Saved', 'DeepSeek key stored in secure storage.');
  };

  const onClearDeepSeek = async () => {
    await clearDeepSeekApiKey();
    setSavedDeepSeekMask('');
    Alert.alert('Cleared', 'DeepSeek key removed from secure storage.');
  };

  const onSaveVocabulary = async () => {
    setVocabularyError('');
    const parsed = prepareVocabulary(vocabularyText);
    if (parsed.error) {
      setVocabularyError(parsed.error);
      return;
    }
    if (!parsed.terms.length) {
      setVocabularyError('Enter at least one term, or use Clear to disable vocabulary.');
      return;
    }

    const dashScopeKey = await loadEffectiveDashScopeApiKey();
    if (!dashScopeKey) {
      setVocabularyError('Set DashScope API key before saving vocabulary.');
      return;
    }

    setVocabularyBusy(true);
    setVocabularySyncStatus('syncing');
    try {
      const nextId = await syncDashScopeVocabulary({
        apiKey: dashScopeKey,
        terms: parsed.terms,
        vocabularyId,
      });

      await saveVocabularySettings({
        rawText: vocabularyText,
        terms: parsed.terms,
        vocabularyId: nextId,
        syncStatus: 'idle',
      });
      setVocabularyId(nextId);
      setVocabularySyncStatus('idle');
      setVocabularyCount(parsed.terms.length);
      Alert.alert('Saved', 'Vocabulary synced and will apply to new recordings.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Vocabulary sync failed.';
      captureDiagnosticsException(error, {
        feature: 'vocabulary',
        level: 'warning',
        stage: 'settings_sync',
      });
      setVocabularyError(message);
      setVocabularySyncStatus('failed');
      await saveVocabularySettings({
        rawText: vocabularyText,
        terms: parsed.terms,
        vocabularyId,
        syncStatus: 'failed',
      });
    } finally {
      setVocabularyBusy(false);
    }
  };

  const onClearVocabulary = async () => {
    setVocabularyBusy(true);
    setVocabularyError('');
    try {
      const dashScopeKey = await loadEffectiveDashScopeApiKey();
      if (dashScopeKey && vocabularyId) {
        try {
          await deleteDashScopeVocabulary({
            apiKey: dashScopeKey,
            vocabularyId,
          });
        } catch {
          // best effort delete
        }
      }
      await clearVocabularySettings();
      setVocabularyText('');
      setVocabularyId(undefined);
      setVocabularySyncStatus('idle');
      setVocabularyCount(0);
      Alert.alert('Cleared', 'Vocabulary disabled for new sessions.');
    } finally {
      setVocabularyBusy(false);
    }
  };

  const onSaveCos = async () => {
    const normalized = normalizeCosSettings({
      cosBucket,
      cosRegion,
      secretId: cosSecretId,
      secretKey: cosSecretKey,
    });

    if (!looksLikeCosBucket(normalized.cosBucket)) {
      Alert.alert('Invalid COS bucket', 'Use BucketName-APPID format, e.g. my-bucket-1250000000.');
      return;
    }
    if (!looksLikeCosRegion(normalized.cosRegion)) {
      Alert.alert('Invalid COS region', 'Use a region like ap-beijing.');
      return;
    }
    if (!hasCompleteCosSettings(normalized)) {
      Alert.alert('Missing credentials', 'COS SecretId and SecretKey are required.');
      return;
    }

    await saveCosSettings(normalized);
    hydrateCosSettings(normalized);
    Alert.alert('Saved', 'COS settings saved for post-record file ASR.');
  };

  const onClearCos = async () => {
    await clearCosSettings();
    hydrateCosSettings(await loadEffectiveCosSettings());
    Alert.alert('Cleared', 'COS settings removed.');
  };

  const onSaveCloudUserId = async () => {
    if (!looksLikeCloudUserId(cloudUserId)) {
      Alert.alert('Invalid user ID', 'Use exactly 10 letters and numbers.');
      return;
    }

    const saved = await saveCloudUserId(cloudUserId);
    setCloudUserId(saved);
    setSavedCloudUserId(saved);
    Alert.alert('Saved', 'Cloud user ID updated.');
  };

  const onSendDiagnosticsReport = async () => {
    await initDiagnostics();
    const enabled = await isDiagnosticsEnabled();
    const currentSupportInfo = await getDiagnosticsSupportInfo();
    setDiagnosticsEnabled(enabled);
    setSupportInfo(currentSupportInfo);
    if (!enabled) {
      setDiagnosticsStatus('Diagnostics are disabled. Configure a Sentry DSN first.');
      Alert.alert('Diagnostics disabled', 'Set `internal.sentryDsn` or `EXPO_PUBLIC_SENTRY_DSN` first.');
      return;
    }

    setDiagnosticsBusy(true);
    setDiagnosticsStatus('');
    try {
      const note = diagnosticsNote.trim();
      const eventId = captureDiagnosticsMessage('Manual diagnostics report submitted.', {
        extras: {
          diagnosticsNote: note || undefined,
          release: getDiagnosticsRelease(),
          supportInfo: currentSupportInfo,
        },
        feature: 'manual_report',
        level: 'info',
        stage: 'settings',
      });
      await flushDiagnostics();
      const status = eventId ? `Queued report ${eventId.slice(0, 8)}.` : 'Queued report.';
      setDiagnosticsStatus(status);
      setDiagnosticsNote('');
      Alert.alert('Report sent', status);
    } catch (error) {
      captureDiagnosticsException(error, {
        feature: 'manual_report',
        level: 'warning',
        stage: 'settings_send',
      });
      const message = error instanceof Error ? error.message : 'Diagnostics report failed.';
      setDiagnosticsStatus(message);
      Alert.alert('Report failed', message);
    } finally {
      setDiagnosticsBusy(false);
    }
  };

  const onShareSupportInfo = async () => {
    try {
      const currentSupportInfo = await getDiagnosticsSupportInfo();
      setSupportInfo(currentSupportInfo);
      await Share.share({ message: currentSupportInfo });
    } catch (error) {
      captureDiagnosticsException(error, {
        feature: 'manual_report',
        level: 'warning',
        stage: 'settings_share',
      });
      Alert.alert('Share failed', 'Unable to open the share sheet on this device.');
    }
  };

  if (!hiddenSections) {
    return (
      <ScrollView contentContainerStyle={styles.layout}>
        <View style={styles.card}>
          <Text style={styles.title}>Loading settings config</Text>
        </View>
      </ScrollView>
    );
  }

  const showDashScope = !hiddenSections.dashscope;
  const showDeepSeek = !hiddenSections.deepseek;
  const showCloudUserId = !hiddenSections.cloudUserId;
  const showTencentCos = !hiddenSections.tencentCos;
  const showVocabulary = !hiddenSections.vocabulary;

  return (
    <ScrollView contentContainerStyle={styles.layout}>
      {showDashScope ? (
        <View style={styles.card}>
          <Text style={styles.title}>DashScope API Key</Text>
          <Text style={styles.description}>
            Bring your own key for realtime ASR and vocabulary API usage.
          </Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={apiKey}
          />

          <View style={styles.row}>
            <Pressable onPress={onSave} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Save</Text>
            </Pressable>
            <Pressable onPress={onClear} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
          </View>

          <Text style={styles.savedLabel}>Saved key: {savedMask || 'Not set'}</Text>
        </View>
      ) : null}

      {showDeepSeek ? (
        <View style={styles.card}>
          <Text style={styles.title}>DeepSeek API Key</Text>
          <Text style={styles.description}>
            Used for async session title generation after finalize.
          </Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setDeepSeekApiKey}
            placeholder="sk-..."
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={deepSeekApiKey}
          />

          <View style={styles.row}>
            <Pressable onPress={onSaveDeepSeek} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Save</Text>
            </Pressable>
            <Pressable onPress={onClearDeepSeek} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
          </View>

          <Text style={styles.savedLabel}>Saved key: {savedDeepSeekMask || 'Not set'}</Text>
        </View>
      ) : null}

      {showTencentCos ? (
        <View style={styles.card}>
          <Text style={styles.title}>Tencent COS (BYOK)</Text>
          <Text style={styles.description}>
            Used to stage audio for file ASR final-pass in zero-backend mode.
          </Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setCosBucket}
            placeholder="bucket-name-1250000000"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={cosBucket}
          />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setCosRegion}
            placeholder="ap-beijing"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={cosRegion}
          />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setCosSecretId}
            placeholder="SecretId"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={cosSecretId}
          />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setCosSecretKey}
            placeholder="SecretKey"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={cosSecretKey}
          />

          <View style={styles.row}>
            <Pressable onPress={onSaveCos} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Save</Text>
            </Pressable>
            <Pressable onPress={onClearCos} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showVocabulary ? (
        <View style={styles.card}>
          <Text style={styles.title}>Vocabulary</Text>
          <Text style={styles.description}>
            One term per line. Saved vocabulary applies globally to new recordings.
          </Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            onChangeText={setVocabularyText}
            placeholder="one term per line"
            placeholderTextColor={colors.muted}
            style={styles.textarea}
            textAlignVertical="top"
            value={vocabularyText}
          />

          <View style={styles.row}>
            <Pressable disabled={vocabularyBusy} onPress={onSaveVocabulary} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{vocabularyBusy ? 'Saving...' : 'Save / Update'}</Text>
            </Pressable>
            <Pressable disabled={vocabularyBusy} onPress={onClearVocabulary} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
          </View>

          <Text style={styles.savedLabel}>Terms: {vocabularyCount}</Text>
          <Text style={styles.savedLabel}>Sync: {vocabularySyncStatus}</Text>
          {vocabularyError ? <Text style={styles.errorText}>{vocabularyError}</Text> : null}
        </View>
      ) : null}

      {showCloudUserId ? (
        <View style={styles.card}>
          <Text style={styles.title}>Cloud User ID</Text>
          <Text style={styles.description}>
            Sessions sync under this ID. Use the same value on another device to share History.
          </Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={10}
            onChangeText={setCloudUserId}
            placeholder="10 letters/numbers"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={cloudUserId}
          />

          <View style={styles.row}>
            <Pressable onPress={onSaveCloudUserId} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Save</Text>
            </Pressable>
          </View>

          <Text style={styles.savedLabel}>Current ID: {savedCloudUserId || 'Loading...'}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.title}>Diagnostics</Text>
        <Text style={styles.description}>
          Send a manual diagnostics event and share support info. Do not include transcript text,
          prompts, or keys in the note.
        </Text>

        <TextInput
          autoCapitalize="sentences"
          autoCorrect
          multiline
          onChangeText={setDiagnosticsNote}
          placeholder="Short note about what went wrong"
          placeholderTextColor={colors.muted}
          style={styles.textarea}
          textAlignVertical="top"
          value={diagnosticsNote}
        />

        <View style={styles.row}>
          <Pressable disabled={diagnosticsBusy} onPress={onSendDiagnosticsReport} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{diagnosticsBusy ? 'Sending...' : 'Send Report'}</Text>
          </Pressable>
          <Pressable onPress={onShareSupportInfo} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Share Info</Text>
          </Pressable>
        </View>

        <Text style={styles.savedLabel}>Release: {getDiagnosticsRelease()}</Text>
        <Text style={styles.savedLabel}>Diagnostics: {diagnosticsEnabled ? 'Enabled' : 'Disabled'}</Text>
        {diagnosticsStatus ? <Text style={styles.savedLabel}>{diagnosticsStatus}</Text> : null}
        <Text selectable style={styles.supportInfo}>
          {supportInfo}
        </Text>
      </View>

      <View style={[styles.bottomSpacer, { height: viewportHeight * 0.5 }]} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  layout: {
    gap: 12,
    width: '100%',
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: '100%',
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textarea: {
    backgroundColor: '#F5F5F5',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    marginTop: 14,
    minHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 10,
    flex: 1,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: '700',
  },
  savedLabel: {
    color: colors.muted,
    marginTop: 14,
  },
  supportInfo: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  errorText: {
    color: '#9D1A1A',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  bottomSpacer: {
    width: '100%',
  },
});
