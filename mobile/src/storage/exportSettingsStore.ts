import * as SecureStore from 'expo-secure-store';

const EXPORT_SETTINGS_KEY = 'export_settings_v1';

export type ExportSettings = {
  downloadsDirectoryUri?: string;
};

function isExportSettings(value: unknown): value is ExportSettings {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (
    typeof data.downloadsDirectoryUri !== 'undefined' &&
    typeof data.downloadsDirectoryUri !== 'string'
  ) {
    return false;
  }
  return true;
}

const DEFAULT_SETTINGS: ExportSettings = {};

export async function loadExportSettings(): Promise<ExportSettings> {
  const raw = await SecureStore.getItemAsync(EXPORT_SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isExportSettings(parsed)) return DEFAULT_SETTINGS;
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveExportSettings(settings: ExportSettings): Promise<void> {
  await SecureStore.setItemAsync(EXPORT_SETTINGS_KEY, JSON.stringify(settings));
}
