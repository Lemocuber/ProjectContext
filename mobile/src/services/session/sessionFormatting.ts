import type { FinalizedSentence } from '../../types/session';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function buildFallbackTitle(startedAtIso: string): string {
  const date = new Date(startedAtIso);
  return `Record ${pad2(date.getFullYear() % 100)}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function ensureFinalizedSentences(
  finalizedSentences: FinalizedSentence[],
  transcriptText: string,
): FinalizedSentence[] {
  if (finalizedSentences.length) return finalizedSentences;
  const text = transcriptText.trim();
  if (!text) return [];
  return [{ startMs: 0, endMs: 0, text }];
}

export function anchorHighlightTaps(
  sentences: FinalizedSentence[],
  tapsMs: number[],
): FinalizedSentence[] {
  if (!sentences.length) return sentences;
  if (!tapsMs.length) return sentences;

  const flagged = new Set<number>();
  for (const tapMs of tapsMs) {
    let index = sentences.findIndex((sentence) => sentence.startMs <= tapMs && tapMs <= sentence.endMs);
    if (index < 0) {
      index = sentences.findIndex((sentence) => sentence.startMs > tapMs);
    }
    if (index < 0) {
      index = sentences.length - 1;
    }
    flagged.add(index);
  }

  return sentences.map((sentence, index) =>
    flagged.has(index) ? { ...sentence, isHighlight: true } : { ...sentence, isHighlight: false },
  );
}

export function collectHighlightTexts(sentences: FinalizedSentence[]): string[] {
  return sentences.filter((entry) => entry.isHighlight).map((entry) => entry.text.trim()).filter(Boolean);
}
