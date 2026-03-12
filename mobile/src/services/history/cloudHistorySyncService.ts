import { Buffer } from 'buffer';
import { File } from 'expo-file-system';
import { loadEffectiveCloudUserId, loadEffectiveCosSettings } from '../../config/defaultSettingsConfig';
import { hasCompleteCosSettings, type CosSettings } from '../../storage/cosSettingsStore';
import {
  loadSessionHistory,
  replaceSessionHistory,
  updateSessionHistoryItem,
} from '../../storage/sessionHistoryStore';
import {
  buildHistoryRelativePath,
  buildRecordingRelativePath,
  buildTranscriptRelativePath,
  buildUserStorageRoot,
} from '../../storage/sessionStoragePaths';
import type { SessionHistoryItem, SessionHistoryStatus } from '../../types/session';
import { saveSessionAudioBase64 } from '../audio/sessionAudio';
import { buildSignedCosUrl } from '../cos/cosSigning';
import {
  addDiagnosticsBreadcrumb,
  captureDiagnosticsException,
} from '../diagnostics/diagnostics';
import { saveTranscriptMarkdown } from '../transcript/transcriptMarkdown';

type CloudHistoryIndexEntry = {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  status: SessionHistoryStatus;
  title: string;
  updatedAt: string;
  previewText?: string;
  errorText?: string;
};

type CloudConfig = {
  settings: CosSettings;
  userId: string;
};

let syncQueue = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = syncQueue.then(task, task);
  syncQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function isSessionStatus(value: unknown): value is SessionHistoryStatus {
  return value === 'completed' || value === 'failed';
}

function isCloudHistoryIndexEntry(value: unknown): value is CloudHistoryIndexEntry {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (typeof item.sessionId !== 'string') return false;
  if (typeof item.startedAt !== 'string') return false;
  if (typeof item.endedAt !== 'string') return false;
  if (typeof item.title !== 'string') return false;
  if (typeof item.updatedAt !== 'string') return false;
  if (!isSessionStatus(item.status)) return false;
  if (typeof item.previewText !== 'undefined' && typeof item.previewText !== 'string') return false;
  if (typeof item.errorText !== 'undefined' && typeof item.errorText !== 'string') return false;
  return true;
}

function buildIndexKey(userId: string): string {
  return `${buildUserStorageRoot(userId)}/${buildHistoryRelativePath()}`;
}

function buildAudioKey(userId: string, sessionId: string): string {
  return `${buildUserStorageRoot(userId)}/${buildRecordingRelativePath(sessionId)}`;
}

function buildMarkdownKey(userId: string, sessionId: string): string {
  return `${buildUserStorageRoot(userId)}/${buildTranscriptRelativePath(sessionId)}`;
}

function compareHistoryItems(left: SessionHistoryItem, right: SessionHistoryItem): number {
  return (
    right.startedAt.localeCompare(left.startedAt) ||
    right.updatedAt.localeCompare(left.updatedAt) ||
    right.id.localeCompare(left.id)
  );
}

function buildIndexEntry(item: SessionHistoryItem): CloudHistoryIndexEntry {
  return {
    sessionId: item.id,
    startedAt: item.startedAt,
    endedAt: item.endedAt,
    status: item.status,
    title: item.title,
    updatedAt: item.updatedAt,
    previewText: item.previewText || undefined,
    errorText: item.errorText || undefined,
  };
}

function getRemoteKeys(userId: string, sessionId: string) {
  return {
    remoteAudioKey: buildAudioKey(userId, sessionId),
    remoteMarkdownKey: buildMarkdownKey(userId, sessionId),
  };
}

function hasLocalFile(uri?: string): boolean {
  return !!uri && new File(uri).exists;
}

function shouldUploadItem(item: SessionHistoryItem): boolean {
  if (item.status !== 'completed') return false;
  if (!hasLocalFile(item.audioFileUri) || !hasLocalFile(item.transcriptMarkdownUri)) return false;
  if (item.cloudSyncStatus === 'pending' || item.cloudSyncStatus === 'failed') return true;
  if (item.cloudSyncStatus === 'synced' && item.cloudUpdatedAt === item.updatedAt) return false;
  return true;
}

async function loadCloudConfig(userId?: string): Promise<CloudConfig | null> {
  const settings = await loadEffectiveCosSettings();
  if (!hasCompleteCosSettings(settings)) return null;
  return {
    settings,
    userId: userId || (await loadEffectiveCloudUserId()),
  };
}

function buildObjectUrl(params: {
  settings: CosSettings;
  objectKey: string;
  method: 'GET' | 'PUT';
}): string {
  return buildSignedCosUrl({
    method: params.method,
    bucket: params.settings.cosBucket,
    region: params.settings.cosRegion,
    key: params.objectKey,
    secretId: params.settings.secretId,
    secretKey: params.settings.secretKey,
    expiresSec: 900,
  });
}

async function readObjectText(params: {
  settings: CosSettings;
  objectKey: string;
}): Promise<string | null> {
  const response = await fetch(
    buildObjectUrl({ settings: params.settings, objectKey: params.objectKey, method: 'GET' }),
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`COS read failed (${response.status}).`);
  }
  return response.text();
}

async function writeObjectText(params: {
  settings: CosSettings;
  objectKey: string;
  content: string;
  contentType: string;
}): Promise<void> {
  const response = await fetch(
    buildObjectUrl({ settings: params.settings, objectKey: params.objectKey, method: 'PUT' }),
    {
      method: 'PUT',
      headers: {
        'Content-Type': params.contentType,
      },
      body: params.content,
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`COS write failed (${response.status}): ${detail || 'unknown error'}`);
  }
}

async function writeObjectFile(params: {
  settings: CosSettings;
  objectKey: string;
  fileUri: string;
  contentType: string;
}): Promise<void> {
  const file = new File(params.fileUri);
  const payload = Buffer.from(await file.base64(), 'base64');
  const response = await fetch(
    buildObjectUrl({ settings: params.settings, objectKey: params.objectKey, method: 'PUT' }),
    {
      method: 'PUT',
      headers: {
        'Content-Type': params.contentType,
      },
      body: payload,
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`COS upload failed (${response.status}): ${detail || 'unknown error'}`);
  }
}

async function readObjectBase64(params: {
  settings: CosSettings;
  objectKey: string;
}): Promise<string | null> {
  const response = await fetch(
    buildObjectUrl({ settings: params.settings, objectKey: params.objectKey, method: 'GET' }),
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`COS download failed (${response.status}).`);
  }
  return Buffer.from(await response.arrayBuffer()).toString('base64');
}

async function loadRemoteIndex(config: CloudConfig): Promise<CloudHistoryIndexEntry[]> {
  const raw = await readObjectText({
    settings: config.settings,
    objectKey: buildIndexKey(config.userId),
  });
  if (!raw?.trim()) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((entry) => isCloudHistoryIndexEntry(entry))) {
    throw new Error('Cloud history index is invalid.');
  }
  return parsed.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

async function saveRemoteIndex(config: CloudConfig, entries: CloudHistoryIndexEntry[]): Promise<void> {
  await writeObjectText({
    settings: config.settings,
    objectKey: buildIndexKey(config.userId),
    content: JSON.stringify(
      [...entries].sort((left, right) => right.startedAt.localeCompare(left.startedAt)),
    ),
    contentType: 'application/json',
  });
}

async function uploadItem(config: CloudConfig, item: SessionHistoryItem): Promise<SessionHistoryItem> {
  if (item.ownerUserId !== config.userId) return item;
  if (!item.audioFileUri || !item.transcriptMarkdownUri) return item;

  const remoteKeys = getRemoteKeys(config.userId, item.id);
  await writeObjectFile({
    settings: config.settings,
    objectKey: remoteKeys.remoteAudioKey,
    fileUri: item.audioFileUri,
    contentType: 'audio/wav',
  });
  await writeObjectFile({
    settings: config.settings,
    objectKey: remoteKeys.remoteMarkdownKey,
    fileUri: item.transcriptMarkdownUri,
    contentType: 'text/markdown; charset=utf-8',
  });

  const remoteIndex = await loadRemoteIndex(config);
  const nextEntry = buildIndexEntry(item);
  const existing = remoteIndex.find((entry) => entry.sessionId === item.id);
  const resolvedEntry = existing && existing.updatedAt > item.updatedAt ? existing : nextEntry;
  const merged = [
    resolvedEntry,
    ...remoteIndex.filter((entry) => entry.sessionId !== item.id),
  ];
  await saveRemoteIndex(config, merged);

  return {
    ...item,
    cloudSyncStatus: resolvedEntry.updatedAt === item.updatedAt ? 'synced' : 'pending',
    cloudUpdatedAt: resolvedEntry.updatedAt,
    ...remoteKeys,
  };
}

async function pushPendingItems(
  config: CloudConfig,
  items: SessionHistoryItem[],
  targetId?: string,
): Promise<SessionHistoryItem[]> {
  const next: SessionHistoryItem[] = [];

  for (const item of items) {
    if (targetId && item.id !== targetId) {
      next.push(item);
      continue;
    }
    if (!shouldUploadItem(item)) {
      next.push(item);
      continue;
    }

    try {
      next.push(await uploadItem(config, item));
    } catch (error) {
      captureDiagnosticsException(error, {
        extras: {
          hasAudioFile: !!item.audioFileUri,
          hasTranscriptFile: !!item.transcriptMarkdownUri,
          status: item.status,
        },
        feature: 'cloud_sync',
        level: 'warning',
        stage: 'upload_item',
      });
      next.push({
        ...item,
        cloudSyncStatus: 'failed',
        ...getRemoteKeys(config.userId, item.id),
      });
    }
  }

  return next;
}

function mergeRemoteIndex(config: CloudConfig, localItems: SessionHistoryItem[], remoteEntries: CloudHistoryIndexEntry[]) {
  const localById = new Map(localItems.map((item) => [item.id, item]));
  const merged = new Map<string, SessionHistoryItem>();

  for (const entry of remoteEntries) {
    const current = localById.get(entry.sessionId);
    const remoteKeys = getRemoteKeys(config.userId, entry.sessionId);

    if (!current) {
      merged.set(entry.sessionId, {
        id: entry.sessionId,
        ownerUserId: config.userId,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        updatedAt: entry.updatedAt,
        status: entry.status,
        title: entry.title,
        previewText: entry.previewText || entry.errorText || '',
        errorText: entry.errorText,
        cloudSyncStatus: 'synced',
        cloudUpdatedAt: entry.updatedAt,
        ...remoteKeys,
      });
      continue;
    }

    if (entry.updatedAt > current.updatedAt) {
      merged.set(entry.sessionId, {
        ...current,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        updatedAt: entry.updatedAt,
        status: entry.status,
        title: entry.title,
        previewText: entry.previewText || entry.errorText || '',
        errorText: entry.errorText,
        cloudSyncStatus: 'synced',
        cloudUpdatedAt: entry.updatedAt,
        ...remoteKeys,
      });
      continue;
    }

    merged.set(entry.sessionId, {
      ...current,
      cloudSyncStatus:
        current.updatedAt > entry.updatedAt && shouldUploadItem(current) ? 'pending' : 'synced',
      cloudUpdatedAt: entry.updatedAt,
      ...remoteKeys,
    });
  }

  for (const item of localItems) {
    if (merged.has(item.id)) continue;
    merged.set(item.id, item);
  }

  return [...merged.values()].sort(compareHistoryItems);
}

export async function syncHistoryWithCloud(): Promise<SessionHistoryItem[]> {
  return enqueue(async () => {
    addDiagnosticsBreadcrumb({
      category: 'cloud.sync',
      message: 'History sync started.',
    });
    const userId = await loadEffectiveCloudUserId();
    const config = await loadCloudConfig(userId);
    const localItems = await loadSessionHistory(userId);
    if (!config) return localItems;

    const pushed = await pushPendingItems(config, localItems);
    await replaceSessionHistory(pushed, userId);

    try {
      const remoteEntries = await loadRemoteIndex(config);
      const merged = mergeRemoteIndex(config, pushed, remoteEntries);
      await replaceSessionHistory(merged, userId);
      addDiagnosticsBreadcrumb({
        category: 'cloud.sync',
        data: { itemCount: merged.length },
        message: 'History sync completed.',
      });
      return merged;
    } catch (error) {
      captureDiagnosticsException(error, {
        feature: 'cloud_sync',
        level: 'warning',
        stage: 'load_remote_index',
      });
      return pushed;
    }
  });
}

export async function uploadSessionToCloud(sessionId: string, userId?: string): Promise<SessionHistoryItem | null> {
  return enqueue(async () => {
    addDiagnosticsBreadcrumb({
      category: 'cloud.sync',
      message: 'Single-session upload started.',
    });
    const resolvedUserId = userId || (await loadEffectiveCloudUserId());
    const config = await loadCloudConfig(resolvedUserId);
    const items = await loadSessionHistory(resolvedUserId);
    if (!config) return items.find((item) => item.id === sessionId) ?? null;

    const next = await pushPendingItems(config, items, sessionId);
    await replaceSessionHistory(next, resolvedUserId);
    addDiagnosticsBreadcrumb({
      category: 'cloud.sync',
      message: 'Single-session upload completed.',
    });
    return next.find((item) => item.id === sessionId) ?? null;
  });
}

export async function ensureSessionTranscriptAvailable(
  sessionId: string,
): Promise<SessionHistoryItem | null> {
  return enqueue(async () => {
    const userId = await loadEffectiveCloudUserId();
    const current = (await loadSessionHistory(userId)).find((item) => item.id === sessionId) ?? null;
    if (!current || hasLocalFile(current.transcriptMarkdownUri) || !current.remoteMarkdownKey) {
      return current;
    }

    const config = await loadCloudConfig(current.ownerUserId);
    if (!config) return current;

    const markdown = await readObjectText({
      settings: config.settings,
      objectKey: current.remoteMarkdownKey,
    });
    if (!markdown) return current;

    const transcriptMarkdownUri = saveTranscriptMarkdown(current.ownerUserId, current.id, markdown);
    return updateSessionHistoryItem(current.id, (item) => ({
      ...item,
      transcriptMarkdownUri,
    }), current.ownerUserId);
  });
}

export async function ensureSessionAudioAvailable(sessionId: string): Promise<SessionHistoryItem | null> {
  return enqueue(async () => {
    const userId = await loadEffectiveCloudUserId();
    const current = (await loadSessionHistory(userId)).find((item) => item.id === sessionId) ?? null;
    if (!current || hasLocalFile(current.audioFileUri) || !current.remoteAudioKey) return current;

    const config = await loadCloudConfig(current.ownerUserId);
    if (!config) return current;

    const audioBase64 = await readObjectBase64({
      settings: config.settings,
      objectKey: current.remoteAudioKey,
    });
    if (!audioBase64) return current;

    const audioFileUri = saveSessionAudioBase64(current.ownerUserId, current.id, audioBase64);
    return updateSessionHistoryItem(current.id, (item) => ({
      ...item,
      audioFileUri,
    }), current.ownerUserId);
  });
}
