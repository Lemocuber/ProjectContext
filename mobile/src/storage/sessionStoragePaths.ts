import { Directory, File, Paths } from 'expo-file-system';

const USERS_DIR_NAME = 'users';
const TRANSCRIPTS_DIR_NAME = 'transcripts';
const RECORDINGS_DIR_NAME = 'recordings';
const HISTORY_FILE_NAME = 'index.json';

export function normalizeStorageUserId(value: string): string {
  return value.trim().replace(/[^0-9A-Za-z_-]+/g, '') || 'default';
}

export function buildUserStorageRoot(userId: string): string {
  return `${USERS_DIR_NAME}/${normalizeStorageUserId(userId)}`;
}

export function buildHistoryRelativePath(): string {
  return HISTORY_FILE_NAME;
}

export function buildTranscriptRelativePath(sessionId: string): string {
  return `${TRANSCRIPTS_DIR_NAME}/${sessionId}.md`;
}

export function buildRecordingRelativePath(sessionId: string): string {
  return `${RECORDINGS_DIR_NAME}/${sessionId}.wav`;
}

function getUserDirectory(userId: string): Directory {
  return new Directory(Paths.document, buildUserStorageRoot(userId));
}

export function getHistoryFile(userId: string): File {
  return new File(getUserDirectory(userId), buildHistoryRelativePath());
}

export function getTranscriptsDirectory(userId: string): Directory {
  return new Directory(getUserDirectory(userId), TRANSCRIPTS_DIR_NAME);
}

export function getRecordingsDirectory(userId: string): Directory {
  return new Directory(getUserDirectory(userId), RECORDINGS_DIR_NAME);
}

export function ensureParentDirectory(file: File): void {
  const parent = file.parentDirectory;
  if (parent && !parent.exists) {
    parent.create({ idempotent: true, intermediates: true });
  }
}
