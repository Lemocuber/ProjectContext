import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  clearApiKey,
  loadApiKey,
  looksLikeDashScopeApiKey,
  maskApiKey,
  saveApiKey,
} from '../storage/apiKeyStore';
import { colors } from '../theme';

export function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [savedMask, setSavedMask] = useState('');

  useEffect(() => {
    void (async () => {
      const stored = await loadApiKey();
      if (stored) {
        setSavedMask(maskApiKey(stored));
      }
    })();
  }, []);

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

  return (
    <View style={styles.card}>
      <Text style={styles.title}>DashScope API Key</Text>
      <Text style={styles.description}>
        Bring your own key for prototype usage. Billing/quota is tied to your key.
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

      <Text style={styles.savedLabel}>
        Saved key: {savedMask || 'Not set'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
