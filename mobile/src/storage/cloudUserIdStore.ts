import * as SecureStore from 'expo-secure-store';

const CLOUD_USER_ID_KEY = 'cloud_user_id_v1';
const CLOUD_USER_ID_LENGTH = 10;
const CLOUD_USER_ID_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function buildCloudUserId(): string {
  return Array.from({ length: CLOUD_USER_ID_LENGTH }, () =>
    CLOUD_USER_ID_CHARS[Math.floor(Math.random() * CLOUD_USER_ID_CHARS.length)],
  ).join('');
}

export function looksLikeCloudUserId(value: string): boolean {
  return /^[0-9A-Za-z]{10}$/.test(value.trim());
}

export async function loadCloudUserId(): Promise<string> {
  const raw = (await SecureStore.getItemAsync(CLOUD_USER_ID_KEY))?.trim() || '';
  if (looksLikeCloudUserId(raw)) return raw;

  const next = buildCloudUserId();
  await SecureStore.setItemAsync(CLOUD_USER_ID_KEY, next);
  return next;
}

export async function saveCloudUserId(value: string): Promise<string> {
  const next = value.trim();
  if (!looksLikeCloudUserId(next)) {
    throw new Error('Cloud user ID must be exactly 10 letters and numbers.');
  }
  await SecureStore.setItemAsync(CLOUD_USER_ID_KEY, next);
  return next;
}
