import * as SecureStore from 'expo-secure-store';

const DEEPSEEK_KEY_NAME = 'deepseek_api_key';

export async function loadDeepSeekApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(DEEPSEEK_KEY_NAME);
}

export async function saveDeepSeekApiKey(value: string): Promise<void> {
  await SecureStore.setItemAsync(DEEPSEEK_KEY_NAME, value.trim());
}

export async function clearDeepSeekApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(DEEPSEEK_KEY_NAME);
}

export function looksLikeDeepSeekApiKey(value: string): boolean {
  return /^sk-[A-Za-z0-9_-]{8,}$/.test(value.trim());
}
