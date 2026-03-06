import * as SecureStore from 'expo-secure-store';

const VOCABULARY_SETTINGS_KEY = 'vocabulary_settings_v1';

export type VocabularySyncStatus = 'idle' | 'syncing' | 'failed';

export type VocabularySettings = {
  rawText: string;
  terms: string[];
  vocabularyId?: string;
  syncStatus?: VocabularySyncStatus;
};

const DEFAULT_SETTINGS: VocabularySettings = {
  rawText: '',
  terms: [],
  syncStatus: 'idle',
};

function isVocabularySettings(value: unknown): value is VocabularySettings {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (typeof data.rawText !== 'string') return false;
  if (!Array.isArray(data.terms) || !data.terms.every((entry) => typeof entry === 'string')) {
    return false;
  }
  if (typeof data.vocabularyId !== 'undefined' && typeof data.vocabularyId !== 'string') {
    return false;
  }
  if (
    typeof data.syncStatus !== 'undefined' &&
    data.syncStatus !== 'idle' &&
    data.syncStatus !== 'syncing' &&
    data.syncStatus !== 'failed'
  ) {
    return false;
  }
  return true;
}

export async function loadVocabularySettings(): Promise<VocabularySettings> {
  const raw = await SecureStore.getItemAsync(VOCABULARY_SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isVocabularySettings(parsed)) return DEFAULT_SETTINGS;
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveVocabularySettings(value: VocabularySettings): Promise<void> {
  await SecureStore.setItemAsync(VOCABULARY_SETTINGS_KEY, JSON.stringify(value));
}

export async function clearVocabularySettings(): Promise<void> {
  await saveVocabularySettings(DEFAULT_SETTINGS);
}
