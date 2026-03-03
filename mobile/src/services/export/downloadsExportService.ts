import { File } from 'expo-file-system';
import {
  EncodingType,
  StorageAccessFramework,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { loadExportSettings, saveExportSettings } from '../../storage/exportSettingsStore';

async function resolveDownloadsDirectoryUri(forcePick: boolean): Promise<string> {
  if (!forcePick) {
    const cached = await loadExportSettings();
    if (cached.downloadsDirectoryUri) return cached.downloadsDirectoryUri;
  }

  const initialUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
  if (!permission.granted || !permission.directoryUri) {
    throw new Error('Downloads permission not granted.');
  }
  await saveExportSettings({ downloadsDirectoryUri: permission.directoryUri });
  return permission.directoryUri;
}

async function createTargetFile(
  directoryUri: string,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const firstName = fileName.trim() || 'export';

  try {
    return await StorageAccessFramework.createFileAsync(directoryUri, firstName, mimeType);
  } catch {
    const suffix = Date.now().toString().slice(-6);
    return StorageAccessFramework.createFileAsync(
      directoryUri,
      `${firstName}-${suffix}`,
      mimeType,
    );
  }
}

export async function exportTextToDownloads(params: {
  fileName: string;
  content: string;
  mimeType?: string;
  forcePickDirectory?: boolean;
}): Promise<string> {
  const write = async (forcePickDirectory: boolean) => {
    const directoryUri = await resolveDownloadsDirectoryUri(forcePickDirectory);
    const targetUri = await createTargetFile(
      directoryUri,
      params.fileName,
      params.mimeType || 'text/markdown',
    );
    await writeAsStringAsync(targetUri, params.content, { encoding: EncodingType.UTF8 });
    return targetUri;
  };

  try {
    return await write(!!params.forcePickDirectory);
  } catch (error) {
    if (params.forcePickDirectory) throw error;
    return write(true);
  }
}

export async function exportFileToDownloads(params: {
  fileName: string;
  sourceFileUri: string;
  mimeType: string;
  forcePickDirectory?: boolean;
}): Promise<string> {
  const source = new File(params.sourceFileUri);
  const base64 = await source.base64();
  const write = async (forcePickDirectory: boolean) => {
    const directoryUri = await resolveDownloadsDirectoryUri(forcePickDirectory);
    const targetUri = await createTargetFile(directoryUri, params.fileName, params.mimeType);
    await writeAsStringAsync(targetUri, base64, { encoding: EncodingType.Base64 });
    return targetUri;
  };

  try {
    return await write(!!params.forcePickDirectory);
  } catch (error) {
    if (params.forcePickDirectory) throw error;
    return write(true);
  }
}
