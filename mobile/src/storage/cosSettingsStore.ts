import * as SecureStore from 'expo-secure-store';

const COS_SETTINGS_KEY = 'cos_settings_v1';
const DEFAULT_SIGNED_URL_EXPIRES_SEC = 7200;
const DEFAULT_FINAL_PASS_TIMEOUT_MS = 30 * 60 * 1000;

export type CosSettings = {
  cosBucket: string;
  cosRegion: string;
  secretId: string;
  secretKey: string;
  sessionToken?: string;
  credentialExpiresAt?: string;
  cosKeyPrefix?: string;
  signedUrlExpiresSec: number;
  finalPassTimeoutMs: number;
  cleanupEnabled: boolean;
};

const DEFAULT_SETTINGS: CosSettings = {
  cosBucket: '',
  cosRegion: '',
  secretId: '',
  secretKey: '',
  sessionToken: '',
  credentialExpiresAt: '',
  cosKeyPrefix: '',
  signedUrlExpiresSec: DEFAULT_SIGNED_URL_EXPIRES_SEC,
  finalPassTimeoutMs: DEFAULT_FINAL_PASS_TIMEOUT_MS,
  cleanupEnabled: true,
};

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isCosSettings(value: unknown): value is CosSettings {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (typeof data.cosBucket !== 'string') return false;
  if (typeof data.cosRegion !== 'string') return false;
  if (typeof data.secretId !== 'string') return false;
  if (typeof data.secretKey !== 'string') return false;
  if (typeof data.sessionToken !== 'undefined' && typeof data.sessionToken !== 'string') return false;
  if (
    typeof data.credentialExpiresAt !== 'undefined' &&
    typeof data.credentialExpiresAt !== 'string'
  ) {
    return false;
  }
  if (typeof data.cosKeyPrefix !== 'undefined' && typeof data.cosKeyPrefix !== 'string') return false;
  if (!isPositiveNumber(data.signedUrlExpiresSec)) return false;
  if (!isPositiveNumber(data.finalPassTimeoutMs)) return false;
  if (typeof data.cleanupEnabled !== 'boolean') return false;
  return true;
}

function trimOrEmpty(value: string | undefined): string {
  return (value || '').trim();
}

export function normalizeCosSettings(value: Partial<CosSettings>): CosSettings {
  const signedUrlExpiresSec = Math.max(
    60,
    Math.floor(value.signedUrlExpiresSec || DEFAULT_SIGNED_URL_EXPIRES_SEC),
  );
  const finalPassTimeoutMs = Math.max(
    30_000,
    Math.floor(value.finalPassTimeoutMs || DEFAULT_FINAL_PASS_TIMEOUT_MS),
  );
  return {
    cosBucket: trimOrEmpty(value.cosBucket),
    cosRegion: trimOrEmpty(value.cosRegion),
    secretId: trimOrEmpty(value.secretId),
    secretKey: trimOrEmpty(value.secretKey),
    sessionToken: trimOrEmpty(value.sessionToken),
    credentialExpiresAt: trimOrEmpty(value.credentialExpiresAt),
    cosKeyPrefix: trimOrEmpty(value.cosKeyPrefix),
    signedUrlExpiresSec,
    finalPassTimeoutMs,
    cleanupEnabled: value.cleanupEnabled ?? true,
  };
}

export function looksLikeCosBucket(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,}-\d{5,}$/.test(value.trim());
}

export function looksLikeCosRegion(value: string): boolean {
  return /^[a-z0-9-]{3,}$/.test(value.trim());
}

export function isCosCredentialLikelyExpired(value: string | undefined): boolean {
  const trimmed = trimOrEmpty(value);
  if (!trimmed) return false;
  const time = Date.parse(trimmed);
  if (Number.isNaN(time)) return false;
  return time <= Date.now() + 30_000;
}

export function hasCompleteCosSettings(value: CosSettings): boolean {
  if (!looksLikeCosBucket(value.cosBucket)) return false;
  if (!looksLikeCosRegion(value.cosRegion)) return false;
  if (!value.secretId.trim() || !value.secretKey.trim()) return false;
  if (isCosCredentialLikelyExpired(value.credentialExpiresAt)) return false;
  return true;
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

