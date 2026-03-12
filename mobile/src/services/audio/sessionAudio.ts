import { File } from 'expo-file-system';
import { ensureParentDirectory, getRecordingsDirectory } from '../../storage/sessionStoragePaths';

export function saveSessionAudioBase64(userId: string, sessionId: string, base64: string): string {
  const file = new File(getRecordingsDirectory(userId), `${sessionId}.wav`);
  ensureParentDirectory(file);
  file.create({ overwrite: true, intermediates: true });
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}
