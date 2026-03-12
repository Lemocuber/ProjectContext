const TITLE_HEAD_TOKENS = 200;
const TITLE_TAIL_TOKENS = 300;
const LIVE_TAIL_TOKENS = 400;

function normalizeTranscript(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function charWeight(char: string): number {
  if (!char.trim()) return 0;

  const codePoint = char.codePointAt(0) || 0;
  if (
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0x3040 && codePoint <= 0x30ff) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7af)
  ) {
    return 1;
  }

  if (/^[A-Za-z]$/.test(char)) return 0.25;
  if (/^\d$/.test(char)) return 0.33;
  return 0.2;
}

function countWeightedLength(chars: string[]): number {
  let total = 0;
  for (const char of chars) total += charWeight(char);
  return total;
}

function sliceFromStart(chars: string[], maxWeight: number): { text: string; endIndex: number } {
  if (!chars.length || maxWeight <= 0) return { text: '', endIndex: 0 };

  let total = 0;
  let endIndex = 0;
  while (endIndex < chars.length) {
    const next = total + charWeight(chars[endIndex]);
    if (next > maxWeight && endIndex > 0) break;
    total = next;
    endIndex += 1;
    if (total >= maxWeight) break;
  }

  return {
    text: chars.slice(0, endIndex).join('').trim(),
    endIndex,
  };
}

function sliceFromEnd(chars: string[], maxWeight: number): { text: string; startIndex: number } {
  if (!chars.length || maxWeight <= 0) return { text: '', startIndex: chars.length };

  let total = 0;
  let startIndex = chars.length;
  while (startIndex > 0) {
    const next = total + charWeight(chars[startIndex - 1]);
    if (next > maxWeight && startIndex < chars.length) break;
    total = next;
    startIndex -= 1;
    if (total >= maxWeight) break;
  }

  return {
    text: chars.slice(startIndex).join('').trim(),
    startIndex,
  };
}

export function estimateTokens(text: string): number {
  const normalized = normalizeTranscript(text);
  return normalized ? Math.ceil(countWeightedLength(Array.from(normalized))) : 0;
}

export function buildTitlePromptContext(transcript: string): string {
  const normalized = normalizeTranscript(transcript);
  if (!normalized) return '';

  const chars = Array.from(normalized);
  if (countWeightedLength(chars) <= TITLE_HEAD_TOKENS + TITLE_TAIL_TOKENS) return normalized;

  const beginning = sliceFromStart(chars, TITLE_HEAD_TOKENS);
  const ending = sliceFromEnd(chars, TITLE_TAIL_TOKENS);
  if (beginning.endIndex >= ending.startIndex) return normalized;

  return `Beginning:\n${beginning.text}\n\n...\n\nEnding:\n${ending.text}`.trim();
}

export function buildLiveSuggestionPromptContext(transcript: string): string {
  const normalized = normalizeTranscript(transcript);
  if (!normalized) return '';

  const chars = Array.from(normalized);
  if (countWeightedLength(chars) <= LIVE_TAIL_TOKENS) return normalized;

  const recent = sliceFromEnd(chars, LIVE_TAIL_TOKENS).text;
  return `Recent context:\n${recent}`.trim();
}
