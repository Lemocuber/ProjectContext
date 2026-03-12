export type TitleStatus = 'pending' | 'completed' | 'failed';
export type FinalPassStatus = 'pending' | 'completed' | 'failed';
export type FinalPassFailureReason =
  | 'upload_failed'
  | 'url_expired'
  | 'recognition_failed'
  | 'timeout'
  | 'unknown';

export type SessionHistoryStatus = 'completed' | 'failed';
export type CloudSyncStatus = 'idle' | 'pending' | 'synced' | 'failed';

export type FinalizedSentence = {
  startMs: number;
  endMs: number;
  text: string;
  speakerLabel?: string;
  isHighlight?: boolean;
};

export type ExportMetadata = {
  markdownExportedAt?: string;
  markdownLastPath?: string;
  markdownAutoExportStatus?: 'completed' | 'failed';
  audioExportedAt?: string;
  audioLastPath?: string;
};

export type SessionHistoryItem = {
  id: string;
  startedAt: string;
  endedAt: string;
  updatedAt: string;
  status: SessionHistoryStatus;
  title: string;
  previewText: string;
  transcriptMarkdownUri?: string;
  exportMetadata?: ExportMetadata;
  errorText?: string;
  audioFileUri?: string;
  cloudSyncStatus?: CloudSyncStatus;
  cloudUpdatedAt?: string;
  remoteAudioKey?: string;
  remoteMarkdownKey?: string;
};

export function getSessionTitle(item: SessionHistoryItem): string {
  return item.title.trim();
}
