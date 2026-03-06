export type TitleStatus = 'pending' | 'completed' | 'failed';
export type FinalPassStatus = 'pending' | 'completed' | 'failed';
export type FinalPassFailureReason =
  | 'upload_failed'
  | 'url_expired'
  | 'recognition_failed'
  | 'timeout'
  | 'unknown';

export type SessionHistoryStatus = 'completed' | 'failed';

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
  status: SessionHistoryStatus;
  transcript: string;
  realtimeTranscriptRaw: string;
  fallbackTitle: string;
  highlightTapsMs: number[];
  finalizedSentences?: FinalizedSentence[];
  finalPassStatus?: FinalPassStatus;
  finalPassTaskId?: string;
  finalPassFailureReason?: FinalPassFailureReason;
  sourceAudioRemoteUrl?: string;
  sourceAudioObjectKey?: string;
  appliedVocabularyId?: string;
  appliedVocabularyTerms?: string[];
  generatedTitle?: string;
  titleStatus?: TitleStatus;
  transcriptMarkdownUri?: string;
  exportMetadata?: ExportMetadata;
  errorText?: string;
  audioFileUri?: string;
};

export function getSessionTitle(item: SessionHistoryItem): string {
  return item.generatedTitle?.trim() || item.fallbackTitle;
}
