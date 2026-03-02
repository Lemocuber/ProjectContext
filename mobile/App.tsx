import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { RecordScreen } from './src/screens/RecordScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme';

type Tab = 'record' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('record');

  const body = useMemo(() => {
    if (tab === 'settings') return <SettingsScreen />;
    return <RecordScreen />;
  }, [tab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
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
            onPress={() => setTab('settings')}
            style={[styles.tabButton, tab === 'settings' ? styles.tabButtonActive : null]}
          >
            <Text style={[styles.tabLabel, tab === 'settings' ? styles.tabLabelActive : null]}>Settings</Text>
          </Pressable>
        </View>

        {body}
      </View>
    </SafeAreaView>
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
