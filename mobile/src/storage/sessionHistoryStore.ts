import * as SecureStore from 'expo-secure-store';

const SESSION_HISTORY_KEY = 'session_history_v1';
const MAX_HISTORY_ITEMS = 20;

export type SessionHistoryStatus = 'completed' | 'failed';

export type SessionHistoryItem = {
  id: string;
  startedAt: string;
  endedAt: string;
  status: SessionHistoryStatus;
  liveText: string;
  finalText: string;
  errorText?: string;
};

function isSessionStatus(value: unknown): value is SessionHistoryStatus {
  return value === 'completed' || value === 'failed';
}

function isSessionHistoryItem(value: unknown): value is SessionHistoryItem {
  if (!value || typeof value !== 'object') return false;

  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string') return false;
  if (typeof item.startedAt !== 'string') return false;
  if (typeof item.endedAt !== 'string') return false;
  if (!isSessionStatus(item.status)) return false;
  if (typeof item.liveText !== 'string') return false;
  if (typeof item.finalText !== 'string') return false;
  if (typeof item.errorText !== 'undefined' && typeof item.errorText !== 'string') return false;
  return true;
}

export async function loadSessionHistory(): Promise<SessionHistoryItem[]> {
  const raw = await SecureStore.getItemAsync(SESSION_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSessionHistoryItem);
  } catch {
    return [];
  }
}

export async function appendSessionHistory(item: SessionHistoryItem): Promise<SessionHistoryItem[]> {
  const current = await loadSessionHistory();
  const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);
  await SecureStore.setItemAsync(SESSION_HISTORY_KEY, JSON.stringify(next));
  return next;
}
