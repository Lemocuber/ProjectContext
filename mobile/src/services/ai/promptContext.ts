import { Tiktoken } from 'js-tiktoken/lite';
import o200kBase from 'js-tiktoken/ranks/o200k_base';

const enc = new Tiktoken(o200kBase);
const TITLE_HEAD_TOKENS = 200;
const TITLE_TAIL_TOKENS = 300;
const LIVE_TAIL_TOKENS = 400;

function normalizeTranscript(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function sliceTokens(tokens: number[], maxTokens: number, fromTail = false): string {
  if (!tokens.length || maxTokens <= 0) return '';
  const sliced = fromTail ? tokens.slice(-maxTokens) : tokens.slice(0, maxTokens);
  return enc.decode(sliced).replace(/\s+/g, ' ').trim();
}

export function estimateTokens(text: string): number {
  const normalized = normalizeTranscript(text);
  return normalized ? enc.encode(normalized).length : 0;
}

export function buildTitlePromptContext(transcript: string): string {
  const normalized = normalizeTranscript(transcript);
  if (!normalized) return '';

  const tokens = enc.encode(normalized);
  if (tokens.length <= TITLE_HEAD_TOKENS + TITLE_TAIL_TOKENS) return normalized;

  const beginning = sliceTokens(tokens, TITLE_HEAD_TOKENS);
  const ending = sliceTokens(tokens, TITLE_TAIL_TOKENS, true);
  return `Beginning:\n${beginning}\n\n...\n\nEnding:\n${ending}`.trim();
}

export function buildLiveSuggestionPromptContext(transcript: string): string {
  const normalized = normalizeTranscript(transcript);
  if (!normalized) return '';

  const tokens = enc.encode(normalized);
  if (tokens.length <= LIVE_TAIL_TOKENS) return normalized;

  const recent = sliceTokens(tokens, LIVE_TAIL_TOKENS, true);
  return `Recent context:\n${recent}`.trim();
}
