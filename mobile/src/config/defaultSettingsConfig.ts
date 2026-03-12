import { bundleDirectory, readAsStringAsync } from 'expo-file-system/legacy';
import { syncDashScopeVocabulary } from '../services/vocabulary/dashscopeVocabularyService';
import { prepareVocabulary } from '../services/vocabulary/vocabularyUtils';
import {
  loadApiKey as loadStoredApiKey,
  looksLikeDashScopeApiKey,
} from '../storage/apiKeyStore';
import {
  type CosSettings,
  hasCompleteCosSettings,
  loadCosSettings as loadStoredCosSettings,
  normalizeCosSettings,
} from '../storage/cosSettingsStore';
import {
  loadDeepSeekApiKey as loadStoredDeepSeekApiKey,
  looksLikeDeepSeekApiKey,
} from '../storage/deepseekKeyStore';
import { loadCloudUserId, looksLikeCloudUserId } from '../storage/cloudUserIdStore';
import {
  loadVocabularySettings as loadStoredVocabularySettings,
  saveVocabularySettings,
  type VocabularySettings,
} from '../storage/vocabularySettingsStore';

type RawConfig = {
  dashscopeKey?: unknown;
  dashScopeKey?: unknown;
  deepseekKey?: unknown;
  deepSeekKey?: unknown;
  cloudUserId?: unknown;
  tencentCos?: {
    bucketId?: unknown;
    bucketRegion?: unknown;
    secretId?: unknown;
    secretKey?: unknown;
  };
  vocabulary?: unknown;
  internal?: {
    signedUrlTtl?: unknown;
    finalPassTimeout?: unknown;
    cosCleanupEnabled?: unknown;
    sentryDsn?: unknown;
    sentryEnvironment?: unknown;
  };
};

type InternalRuntimeSettings = {
  signedUrlTtlSec: number;
  finalPassTimeoutSec: number;
  cosCleanupEnabled: boolean;
  sentryDsn?: string;
  sentryEnvironment?: string;
};

type ParsedDefaults = {
  dashscopeKey?: string;
  deepseekKey?: string;
  cloudUserId?: string;
  tencentCos?: CosSettings;
  vocabularyTerms?: string[];
  vocabularyRawText?: string;
  internal: InternalRuntimeSettings;
};

type HiddenSettingsSections = {
  dashscope: boolean;
  deepseek: boolean;
  cloudUserId: boolean;
  tencentCos: boolean;
  vocabulary: boolean;
};

const DEFAULT_INTERNAL: InternalRuntimeSettings = {
  signedUrlTtlSec: 7200,
  finalPassTimeoutSec: 1800,
  cosCleanupEnabled: true,
};
const CONFIG_FILE_NAME = 'ProjectContext.config.json';

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toPositiveInt(value: unknown, fallback: number, min: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.floor(value));
}

function parseDashScopeKey(config: RawConfig): string | undefined {
  const key = asTrimmedString(config.dashscopeKey ?? config.dashScopeKey);
  if (!key || !looksLikeDashScopeApiKey(key)) return undefined;
  return key;
}

function parseDeepSeekKey(config: RawConfig): string | undefined {
  const key = asTrimmedString(config.deepseekKey ?? config.deepSeekKey);
  if (!key || !looksLikeDeepSeekApiKey(key)) return undefined;
  return key;
}

function parseCloudUserId(config: RawConfig): string | undefined {
  const value = asTrimmedString(config.cloudUserId);
  if (!value || !looksLikeCloudUserId(value)) return undefined;
  return value;
}

function parseTencentCos(config: RawConfig): CosSettings | undefined {
  const normalized = normalizeCosSettings({
    cosBucket: asTrimmedString(config.tencentCos?.bucketId),
    cosRegion: asTrimmedString(config.tencentCos?.bucketRegion),
    secretId: asTrimmedString(config.tencentCos?.secretId),
    secretKey: asTrimmedString(config.tencentCos?.secretKey),
  });
  if (!hasCompleteCosSettings(normalized)) return undefined;
  return normalized;
}

function parseVocabulary(config: RawConfig): { terms: string[]; rawText: string } | undefined {
  if (!Array.isArray(config.vocabulary)) return undefined;
  if (!config.vocabulary.every((entry) => typeof entry === 'string')) return undefined;

  const rawText = config.vocabulary
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join('\n');
  const prepared = prepareVocabulary(rawText);
  if (prepared.error || !prepared.terms.length) return undefined;

  return {
    terms: prepared.terms,
    rawText,
  };
}

function parseInternal(config: RawConfig): InternalRuntimeSettings {
  const sentryDsn = asTrimmedString(config.internal?.sentryDsn);
  const sentryEnvironment = asTrimmedString(config.internal?.sentryEnvironment);

  return {
    signedUrlTtlSec: toPositiveInt(config.internal?.signedUrlTtl, DEFAULT_INTERNAL.signedUrlTtlSec, 60),
    finalPassTimeoutSec: toPositiveInt(
      config.internal?.finalPassTimeout,
      DEFAULT_INTERNAL.finalPassTimeoutSec,
      30,
    ),
    cosCleanupEnabled:
      typeof config.internal?.cosCleanupEnabled === 'boolean'
        ? config.internal.cosCleanupEnabled
        : DEFAULT_INTERNAL.cosCleanupEnabled,
    sentryDsn: sentryDsn || undefined,
    sentryEnvironment: sentryEnvironment || undefined,
  };
}

function parseDefaults(input: unknown): ParsedDefaults {
  const config = (input && typeof input === 'object' ? input : {}) as RawConfig;
  const vocabulary = parseVocabulary(config);

  return {
    dashscopeKey: parseDashScopeKey(config),
    deepseekKey: parseDeepSeekKey(config),
    cloudUserId: parseCloudUserId(config),
    tencentCos: parseTencentCos(config),
    vocabularyTerms: vocabulary?.terms,
    vocabularyRawText: vocabulary?.rawText,
    internal: parseInternal(config),
  };
}
let defaultsPromise: Promise<ParsedDefaults> | undefined;

function getRuntimeConfigUri(): string | null {
  if (!bundleDirectory) return null;
  return `${bundleDirectory.endsWith('/') ? bundleDirectory : `${bundleDirectory}/`}${CONFIG_FILE_NAME}`;
}

async function loadRuntimeConfig(): Promise<ParsedDefaults> {
  if (!defaultsPromise) {
    defaultsPromise = (async () => {
      try {
        const configUri = getRuntimeConfigUri();
        if (!configUri) return parseDefaults({});
        const rawText = await readAsStringAsync(configUri);
        return parseDefaults(JSON.parse(rawText));
      } catch {
        return parseDefaults({});
      }
    })();
  }
  return defaultsPromise;
}

function sameTerms(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export async function getHiddenSettingsSections(): Promise<HiddenSettingsSections> {
  const defaults = await loadRuntimeConfig();
  return {
    dashscope: !!defaults.dashscopeKey,
    deepseek: !!defaults.deepseekKey,
    cloudUserId: !!defaults.cloudUserId,
    tencentCos: !!defaults.tencentCos,
    vocabulary: !!defaults.vocabularyTerms?.length,
  };
}

export async function shouldHideSettingsTab(): Promise<boolean> {
  const sections = await getHiddenSettingsSections();
  return (
    sections.dashscope &&
    sections.deepseek &&
    sections.cloudUserId &&
    sections.tencentCos &&
    sections.vocabulary
  );
}

export async function loadEffectiveCloudUserId(): Promise<string> {
  const defaults = await loadRuntimeConfig();
  if (defaults.cloudUserId) return defaults.cloudUserId;
  return loadCloudUserId();
}

export async function getInternalRuntimeSettings(): Promise<InternalRuntimeSettings> {
  const defaults = await loadRuntimeConfig();
  return defaults.internal;
}

export async function loadDiagnosticsRuntimeConfig(): Promise<{
  dsn: string | null;
  environment: string | null;
}> {
  const defaults = await loadRuntimeConfig();
  const envDsn =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SENTRY_DSN
      ? process.env.EXPO_PUBLIC_SENTRY_DSN.trim()
      : '';
  const envName =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SENTRY_ENVIRONMENT
      ? process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT.trim()
      : '';

  return {
    dsn: defaults.internal.sentryDsn || envDsn || null,
    environment: defaults.internal.sentryEnvironment || envName || null,
  };
}

export async function loadEffectiveDashScopeApiKey(): Promise<string | null> {
  const defaults = await loadRuntimeConfig();
  if (defaults.dashscopeKey) return defaults.dashscopeKey;
  return loadStoredApiKey();
}

export async function loadEffectiveDeepSeekApiKey(): Promise<string | null> {
  const defaults = await loadRuntimeConfig();
  if (defaults.deepseekKey) return defaults.deepseekKey;
  return loadStoredDeepSeekApiKey();
}

export async function loadEffectiveCosSettings(): Promise<CosSettings> {
  const defaults = await loadRuntimeConfig();
  if (defaults.tencentCos) return defaults.tencentCos;
  return loadStoredCosSettings();
}

export async function loadEffectiveVocabularySettings(): Promise<VocabularySettings> {
  const defaults = await loadRuntimeConfig();
  if (!defaults.vocabularyTerms?.length || !defaults.vocabularyRawText) {
    return loadStoredVocabularySettings();
  }

  const stored = await loadStoredVocabularySettings();
  const rawText = defaults.vocabularyRawText;
  const terms = defaults.vocabularyTerms;

  if (stored.vocabularyId && sameTerms(stored.terms, terms)) {
    if (stored.rawText === rawText && stored.syncStatus === 'idle') return stored;

    const normalized = {
      rawText,
      terms,
      vocabularyId: stored.vocabularyId,
      syncStatus: 'idle' as const,
    };
    await saveVocabularySettings(normalized);
    return normalized;
  }

  const apiKey = await loadEffectiveDashScopeApiKey();
  if (!apiKey) {
    const missingKey = {
      rawText,
      terms,
      vocabularyId: stored.vocabularyId,
      syncStatus: 'failed' as const,
    };
    await saveVocabularySettings(missingKey);
    return missingKey;
  }

  try {
    const nextId = await syncDashScopeVocabulary({
      apiKey,
      terms,
      vocabularyId: stored.vocabularyId,
    });
    const synced = {
      rawText,
      terms,
      vocabularyId: nextId,
      syncStatus: 'idle' as const,
    };
    await saveVocabularySettings(synced);
    return synced;
  } catch {
    const failed = {
      rawText,
      terms,
      vocabularyId: stored.vocabularyId,
      syncStatus: 'failed' as const,
    };
    await saveVocabularySettings(failed);
    return failed;
  }
}
