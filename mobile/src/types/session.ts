export type TitleStatus = 'pending' | 'completed' | 'failed';

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
  fallbackTitle: string;
  highlightTapsMs: number[];
  finalizedSentences?: FinalizedSentence[];
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
