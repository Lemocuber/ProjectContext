import { Buffer } from 'buffer';
import { File } from 'expo-file-system';
import type { CosSettings } from '../../storage/cosSettingsStore';
import { buildSignedCosUrl } from './cosSigning';

export type CosStagedAudio = {
  objectKey: string;
  sourceAudioRemoteUrl: string;
};

function datePart(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function buildObjectKey(prefix: string | undefined, sessionId: string, startedAt: string): string {
  const stem = `${datePart(startedAt)}/${sessionId}.wav`;
  const cleanPrefix = trimSlashes((prefix || '').trim());
  return cleanPrefix ? `${cleanPrefix}/${stem}` : stem;
}

function parseTime(value: string | undefined): number | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function assertCredentialWindow(settings: CosSettings): void {
  const credentialExpiry = parseTime(settings.credentialExpiresAt);
  if (credentialExpiry === null) return;

  const requiredUntil = Date.now() + settings.finalPassTimeoutMs + 60_000;
  if (credentialExpiry <= requiredUntil) {
    throw new Error('COS temporary credentials expire before final-pass timeout window.');
  }
}

async function uploadToCos(params: {
  settings: CosSettings;
  objectKey: string;
  audioFileUri: string;
}): Promise<void> {
  const uploadUrl = buildSignedCosUrl({
    method: 'PUT',
    bucket: params.settings.cosBucket,
    region: params.settings.cosRegion,
    key: params.objectKey,
    secretId: params.settings.secretId,
    secretKey: params.settings.secretKey,
    sessionToken: params.settings.sessionToken,
    expiresSec: Math.min(params.settings.signedUrlExpiresSec, 900),
  });

  const file = new File(params.audioFileUri);
  const base64 = await file.base64();
  const payload = Buffer.from(base64, 'base64');

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'audio/wav',
    },
    body: payload,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`COS upload failed (${response.status}): ${detail || 'unknown error'}`);
  }
}

export async function stageAudioToCos(params: {
  settings: CosSettings;
  sessionId: string;
  startedAt: string;
  audioFileUri: string;
}): Promise<CosStagedAudio> {
  assertCredentialWindow(params.settings);
  const objectKey = buildObjectKey(params.settings.cosKeyPrefix, params.sessionId, params.startedAt);

  await uploadToCos({
    settings: params.settings,
    objectKey,
    audioFileUri: params.audioFileUri,
  });

  const sourceAudioRemoteUrl = buildSignedCosUrl({
    method: 'GET',
    bucket: params.settings.cosBucket,
    region: params.settings.cosRegion,
    key: objectKey,
    secretId: params.settings.secretId,
    secretKey: params.settings.secretKey,
    sessionToken: params.settings.sessionToken,
    expiresSec: params.settings.signedUrlExpiresSec,
  });
  return { objectKey, sourceAudioRemoteUrl };
}

export async function cleanupCosObjectBestEffort(params: {
  settings: CosSettings;
  objectKey?: string;
}): Promise<void> {
  const objectKey = (params.objectKey || '').trim();
  if (!objectKey) return;

  try {
    const deleteUrl = buildSignedCosUrl({
      method: 'DELETE',
      bucket: params.settings.cosBucket,
      region: params.settings.cosRegion,
      key: objectKey,
      secretId: params.settings.secretId,
      secretKey: params.settings.secretKey,
      sessionToken: params.settings.sessionToken,
      expiresSec: 900,
    });

    await fetch(deleteUrl, { method: 'DELETE' });
  } catch {
    // best effort cleanup
  }
}

