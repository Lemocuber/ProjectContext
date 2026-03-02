import * as SecureStore from 'expo-secure-store';

const SESSION_HISTORY_KEY = 'session_history_v1';
const MAX_HISTORY_ITEMS = 20;

export type SessionHistoryStatus = 'completed' | 'failed';

export type SessionHistoryItem = {
  id: string;
  startedAt: string;
  endedAt: string;
  status: SessionHistoryStatus;
  transcript: string;
  errorText?: string;
  audioFileUri?: string;
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
  if (typeof item.transcript !== 'string') return false;
  if (typeof item.errorText !== 'undefined' && typeof item.errorText !== 'string') return false;
  if (typeof item.audioFileUri !== 'undefined' && typeof item.audioFileUri !== 'string') return false;
  return true;
}

function normalizeLegacySessionHistoryItem(value: unknown): SessionHistoryItem | null {
  if (isSessionHistoryItem(value)) return value;
  if (!value || typeof value !== 'object') return null;

  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string') return null;
  if (typeof item.startedAt !== 'string') return null;
  if (typeof item.endedAt !== 'string') return null;
  if (!isSessionStatus(item.status)) return null;
  if (typeof item.liveText !== 'string' && typeof item.finalText !== 'string') return null;

  const transcriptSource =
    typeof item.finalText === 'string' && item.finalText.trim().length
      ? item.finalText
      : typeof item.liveText === 'string'
        ? item.liveText
        : '';

  return {
    id: item.id,
    startedAt: item.startedAt,
    endedAt: item.endedAt,
    status: item.status,
    transcript: transcriptSource,
    errorText: typeof item.errorText === 'string' ? item.errorText : undefined,
    audioFileUri: typeof item.audioFileUri === 'string' ? item.audioFileUri : undefined,
  };
}

export async function loadSessionHistory(): Promise<SessionHistoryItem[]> {
  const raw = await SecureStore.getItemAsync(SESSION_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeLegacySessionHistoryItem(entry))
      .filter((entry): entry is SessionHistoryItem => !!entry);
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
