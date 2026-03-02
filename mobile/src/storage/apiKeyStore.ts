import * as SecureStore from 'expo-secure-store';

const API_KEY_NAME = 'dashscope_api_key';

export async function loadApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY_NAME);
}

export async function saveApiKey(value: string): Promise<void> {
  const normalized = value.trim();
  await SecureStore.setItemAsync(API_KEY_NAME, normalized);
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_NAME);
}

export function maskApiKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 10) return '****';
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

export function looksLikeDashScopeApiKey(value: string): boolean {
  return /^sk-[A-Za-z0-9_-]{8,}$/.test(value.trim());
}
