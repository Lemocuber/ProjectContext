import * as SecureStore from 'expo-secure-store';

const COS_SETTINGS_KEY = 'cos_settings_v1';

export type CosSettings = {
  cosBucket: string;
  cosRegion: string;
  secretId: string;
  secretKey: string;
};

const DEFAULT_SETTINGS: CosSettings = {
  cosBucket: '',
  cosRegion: '',
  secretId: '',
  secretKey: '',
};

function isCosSettings(value: unknown): value is CosSettings {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.cosBucket === 'string' &&
    typeof data.cosRegion === 'string' &&
    typeof data.secretId === 'string' &&
    typeof data.secretKey === 'string'
  );
}

function trimOrEmpty(value: string | undefined): string {
  return (value || '').trim();
}

export function normalizeCosSettings(value: Partial<CosSettings>): CosSettings {
  return {
    cosBucket: trimOrEmpty(value.cosBucket),
    cosRegion: trimOrEmpty(value.cosRegion),
    secretId: trimOrEmpty(value.secretId),
    secretKey: trimOrEmpty(value.secretKey),
  };
}

export function looksLikeCosBucket(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,}-\d{5,}$/.test(value.trim());
}

export function looksLikeCosRegion(value: string): boolean {
  return /^[a-z0-9-]{3,}$/.test(value.trim());
}

export function hasCompleteCosSettings(value: CosSettings): boolean {
  if (!looksLikeCosBucket(value.cosBucket)) return false;
  if (!looksLikeCosRegion(value.cosRegion)) return false;
  return !!value.secretId.trim() && !!value.secretKey.trim();
}

export async function loadCosSettings(): Promise<CosSettings> {
  const raw = await SecureStore.getItemAsync(COS_SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isCosSettings(parsed)) return DEFAULT_SETTINGS;
    return normalizeCosSettings(parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveCosSettings(value: CosSettings): Promise<void> {
  await SecureStore.setItemAsync(COS_SETTINGS_KEY, JSON.stringify(normalizeCosSettings(value)));
}

export async function clearCosSettings(): Promise<void> {
  await SecureStore.setItemAsync(COS_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
}
