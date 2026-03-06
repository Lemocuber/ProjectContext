import * as SecureStore from 'expo-secure-store';
import type {
  ExportMetadata,
  FinalPassFailureReason,
  FinalPassStatus,
  FinalizedSentence,
  SessionHistoryItem,
  SessionHistoryStatus,
  TitleStatus,
} from '../types/session';

const SESSION_HISTORY_KEY = 'session_history_v2';
const MAX_HISTORY_ITEMS = 20;

function isSessionStatus(value: unknown): value is SessionHistoryStatus {
  return value === 'completed' || value === 'failed';
}

function isTitleStatus(value: unknown): value is TitleStatus {
  return value === 'pending' || value === 'completed' || value === 'failed';
}

function isFinalPassStatus(value: unknown): value is FinalPassStatus {
  return value === 'pending' || value === 'completed' || value === 'failed';
}

function isFinalPassFailureReason(value: unknown): value is FinalPassFailureReason {
  return (
    value === 'upload_failed' ||
    value === 'url_expired' ||
    value === 'recognition_failed' ||
    value === 'timeout' ||
    value === 'unknown'
  );
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

function isFinalizedSentence(value: unknown): value is FinalizedSentence {
  if (!value || typeof value !== 'object') return false;
  const sentence = value as Record<string, unknown>;
  if (typeof sentence.startMs !== 'number' || !Number.isFinite(sentence.startMs)) return false;
  if (typeof sentence.endMs !== 'number' || !Number.isFinite(sentence.endMs)) return false;
  if (typeof sentence.text !== 'string') return false;
  if (
    typeof sentence.speakerLabel !== 'undefined' &&
    typeof sentence.speakerLabel !== 'string'
  ) {
    return false;
  }
  if (typeof sentence.isHighlight !== 'undefined' && typeof sentence.isHighlight !== 'boolean') {
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
  if (!isSessionStatus(item.status)) return false;
  if (typeof item.transcript !== 'string') return false;
  if (
    typeof item.realtimeTranscriptRaw !== 'undefined' &&
    typeof item.realtimeTranscriptRaw !== 'string'
  ) {
    return false;
  }
  if (typeof item.fallbackTitle !== 'string') return false;
  if (!Array.isArray(item.highlightTapsMs)) return false;
  if (!item.highlightTapsMs.every((entry) => typeof entry === 'number' && Number.isFinite(entry))) {
    return false;
  }
  if (
    typeof item.finalizedSentences !== 'undefined' &&
    (!Array.isArray(item.finalizedSentences) ||
      !item.finalizedSentences.every((entry) => isFinalizedSentence(entry)))
  ) {
    return false;
  }
  if (
    typeof item.appliedVocabularyId !== 'undefined' &&
    typeof item.appliedVocabularyId !== 'string'
  ) {
    return false;
  }
  if (
    typeof item.appliedVocabularyTerms !== 'undefined' &&
    (!Array.isArray(item.appliedVocabularyTerms) ||
      !item.appliedVocabularyTerms.every((entry) => typeof entry === 'string'))
  ) {
    return false;
  }
  if (typeof item.generatedTitle !== 'undefined' && typeof item.generatedTitle !== 'string') return false;
  if (typeof item.titleStatus !== 'undefined' && !isTitleStatus(item.titleStatus)) return false;
  if (typeof item.finalPassStatus !== 'undefined' && !isFinalPassStatus(item.finalPassStatus)) return false;
  if (typeof item.finalPassTaskId !== 'undefined' && typeof item.finalPassTaskId !== 'string') return false;
  if (
    typeof item.finalPassFailureReason !== 'undefined' &&
    !isFinalPassFailureReason(item.finalPassFailureReason)
  ) {
    return false;
  }
  if (
    typeof item.sourceAudioRemoteUrl !== 'undefined' &&
    typeof item.sourceAudioRemoteUrl !== 'string'
  ) {
    return false;
  }
  if (
    typeof item.sourceAudioObjectKey !== 'undefined' &&
    typeof item.sourceAudioObjectKey !== 'string'
  ) {
    return false;
  }
  if (
    typeof item.transcriptMarkdownUri !== 'undefined' &&
    typeof item.transcriptMarkdownUri !== 'string'
  ) {
    return false;
  }
  if (
    typeof item.exportMetadata !== 'undefined' &&
    !isExportMetadata(item.exportMetadata)
  ) {
    return false;
  }
  if (typeof item.errorText !== 'undefined' && typeof item.errorText !== 'string') return false;
  if (typeof item.audioFileUri !== 'undefined' && typeof item.audioFileUri !== 'string') return false;
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
    return parsed
      .filter((entry): entry is SessionHistoryItem => isSessionHistoryItem(entry))
      .map((entry) => ({
        ...entry,
        realtimeTranscriptRaw: entry.realtimeTranscriptRaw ?? entry.transcript,
      }));
  } catch {
    return [];
  }
}

export async function appendSessionHistory(item: SessionHistoryItem): Promise<SessionHistoryItem[]> {
  const current = await loadSessionHistory();
  const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);
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
