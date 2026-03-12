import * as SecureStore from 'expo-secure-store';
import type {
  CloudSyncStatus,
  ExportMetadata,
  SessionHistoryItem,
  SessionHistoryStatus,
} from '../types/session';

const SESSION_HISTORY_KEY = 'session_history_v2';

function isSessionStatus(value: unknown): value is SessionHistoryStatus {
  return value === 'completed' || value === 'failed';
}

function isCloudSyncStatus(value: unknown): value is CloudSyncStatus {
  return value === 'idle' || value === 'pending' || value === 'synced' || value === 'failed';
}

function isExportMetadata(value: unknown): value is ExportMetadata {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (
    typeof data.markdownExportedAt !== 'undefined' &&
    typeof data.markdownExportedAt !== 'string'
  ) {
    return false;
  }
  if (
    typeof data.markdownLastPath !== 'undefined' &&
    typeof data.markdownLastPath !== 'string'
  ) {
    return false;
  }
  if (
    typeof data.markdownAutoExportStatus !== 'undefined' &&
    data.markdownAutoExportStatus !== 'completed' &&
    data.markdownAutoExportStatus !== 'failed'
  ) {
    return false;
  }
  if (typeof data.audioExportedAt !== 'undefined' && typeof data.audioExportedAt !== 'string') {
    return false;
  }
  if (typeof data.audioLastPath !== 'undefined' && typeof data.audioLastPath !== 'string') {
    return false;
  }
  return true;
}

function isSessionHistoryItem(value: unknown): value is SessionHistoryItem {
  if (!value || typeof value !== 'object') return false;

  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string') return false;
  if (typeof item.startedAt !== 'string') return false;
  if (typeof item.endedAt !== 'string') return false;
  if (typeof item.updatedAt !== 'string') return false;
  if (!isSessionStatus(item.status)) return false;
  if (typeof item.title !== 'string') return false;
  if (typeof item.previewText !== 'string') return false;
  if (
    typeof item.transcriptMarkdownUri !== 'undefined' &&
    typeof item.transcriptMarkdownUri !== 'string'
  ) {
    return false;
  }
  if (typeof item.exportMetadata !== 'undefined' && !isExportMetadata(item.exportMetadata)) {
    return false;
  }
  if (typeof item.errorText !== 'undefined' && typeof item.errorText !== 'string') return false;
  if (typeof item.audioFileUri !== 'undefined' && typeof item.audioFileUri !== 'string') return false;
  if (
    typeof item.cloudSyncStatus !== 'undefined' &&
    !isCloudSyncStatus(item.cloudSyncStatus)
  ) {
    return false;
  }
  if (
    typeof item.cloudUpdatedAt !== 'undefined' &&
    typeof item.cloudUpdatedAt !== 'string'
  ) {
    return false;
  }
  if (
    typeof item.remoteAudioKey !== 'undefined' &&
    typeof item.remoteAudioKey !== 'string'
  ) {
    return false;
  }
  if (
    typeof item.remoteMarkdownKey !== 'undefined' &&
    typeof item.remoteMarkdownKey !== 'string'
  ) {
    return false;
  }
  return true;
}

async function saveSessionHistory(items: SessionHistoryItem[]): Promise<void> {
  await SecureStore.setItemAsync(SESSION_HISTORY_KEY, JSON.stringify(items));
}

export async function loadSessionHistory(): Promise<SessionHistoryItem[]> {
  const raw = await SecureStore.getItemAsync(SESSION_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is SessionHistoryItem => isSessionHistoryItem(entry));
  } catch {
    return [];
  }
}

export async function appendSessionHistory(item: SessionHistoryItem): Promise<SessionHistoryItem[]> {
  const current = await loadSessionHistory();
  const next = [item, ...current.filter((entry) => entry.id !== item.id)];
  await saveSessionHistory(next);
  return next;
}

export async function updateSessionHistoryItem(
  id: string,
  updater: (item: SessionHistoryItem) => SessionHistoryItem,
): Promise<SessionHistoryItem | null> {
  const current = await loadSessionHistory();
  let updated: SessionHistoryItem | null = null;
  const next = current.map((item) => {
    if (item.id !== id) return item;
    updated = updater(item);
    return updated;
  });
  if (!updated) return null;
  await saveSessionHistory(next);
  return updated;
}
