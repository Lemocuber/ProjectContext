import type { FinalPassFailureReason, FinalizedSentence } from '../../types/session';

const DASHSCOPE_RECORDED_RECOGNITION_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription';
const DASHSCOPE_TASK_QUERY_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks';

const POLL_INTERVAL_MS = 2000;

type DashScopeTaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | string;

type DashScopeTaskResponse = {
  output?: {
    task_id?: string;
    task_status?: DashScopeTaskStatus;
    results?: Array<{
      transcription_url?: string;
      [key: string]: unknown;
    }>;
  };
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type RawSentenceLike = {
  text: string;
  startMs: number | null;
  endMs: number | null;
  speakerLabel?: string;
};

export type FinalPassSpeakerMode = 'auto' | 'one' | 'two' | 'three';

export class FinalPassError extends Error {
  reason: FinalPassFailureReason;

  constructor(reason: FinalPassFailureReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function formatSpeakerLabel(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `Speaker ${Math.floor(value)}`;
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) return `Speaker ${trimmed}`;
  const speakerMatch = trimmed.match(/^speaker\s+(\d+)$/i);
  if (speakerMatch?.[1]) return `Speaker ${speakerMatch[1]}`;
  return trimmed;
}

function speakerFromRecord(record: Record<string, unknown>): string | undefined {
  return (
    formatSpeakerLabel(record.speaker_id) ||
    formatSpeakerLabel(record.spk_id) ||
    formatSpeakerLabel(record.speaker) ||
    formatSpeakerLabel(record.speaker_label)
  );
}

function timingFromWords(words: unknown): { startMs: number | null; endMs: number | null } {
  if (!Array.isArray(words) || !words.length) {
    return { startMs: null, endMs: null };
  }

  const first = asObject(words[0]);
  const last = asObject(words[words.length - 1]);
  const startMs =
    toNumber(first?.begin_time) ??
    toNumber(first?.start_time) ??
    toNumber(first?.start_ms) ??
    null;
  const endMs =
    toNumber(last?.end_time) ??
    toNumber(last?.end_ms) ??
    toNumber(last?.stop_time) ??
    null;
  return { startMs, endMs };
}

function parseSentenceRecord(record: Record<string, unknown>): RawSentenceLike | null {
  const text = asString(record.text);
  if (!text) return null;

  const startMs =
    toNumber(record.begin_time) ??
    toNumber(record.start_time) ??
    toNumber(record.start_ms) ??
    toNumber(record.begin_ms);
  const endMs =
    toNumber(record.end_time) ??
    toNumber(record.stop_time) ??
    toNumber(record.end_ms) ??
    toNumber(record.finish_time);

  const wordsTiming = timingFromWords(record.words);
  return {
    text,
    startMs: startMs ?? wordsTiming.startMs,
    endMs: endMs ?? wordsTiming.endMs,
    speakerLabel: speakerFromRecord(record),
  };
}

function collectSentenceRecords(value: unknown): RawSentenceLike[] {
  const byContainer = new Map<string, RawSentenceLike[]>();
  const seen = new Set<string>();
  const sentenceContainers = new Set(['sentences', 'segments', 'utterances']);

  const append = (container: string, entry: RawSentenceLike | null) => {
    if (!entry) return;
    const key = `${entry.startMs ?? -1}|${entry.endMs ?? -1}|${entry.speakerLabel || ''}|${entry.text}`;
    if (seen.has(key)) return;
    seen.add(key);
    const list = byContainer.get(container) || [];
    list.push(entry);
    byContainer.set(container, list);
  };

  const visit = (node: unknown, parentKey = '') => {
    if (Array.isArray(node)) {
      const key = parentKey.trim().toLowerCase();
      if (sentenceContainers.has(key)) {
        for (const item of node) {
          append(key, parseSentenceRecord(asObject(item) || {}));
        }
        return;
      }
      for (const item of node) visit(item);
      return;
    }
    const obj = asObject(node);
    if (!obj) return;

    for (const [key, child] of Object.entries(obj)) visit(child, key);
  };

  visit(value);
  const preferred = ['sentences', 'segments', 'utterances'];
  for (const key of preferred) {
    const list = byContainer.get(key);
    if (list?.length) return list;
  }
  return [];
}

function pickFallbackTranscript(value: unknown): string {
  const obj = asObject(value);
  if (!obj) return '';
  const direct =
    asString(obj.text) || asString(obj.transcript) || asString(obj.full_text) || asString(obj.content);
  if (direct) return direct;

  if (Array.isArray(obj.transcripts)) {
    const combined = obj.transcripts
      .map((entry) => {
        const item = asObject(entry);
        return asString(item?.text) || asString(item?.transcript) || asString(item?.full_text);
      })
      .filter(Boolean)
      .join(' ')
      .trim();
    if (combined) return combined;
  }
  return '';
}

function toFinalizedSentences(entries: RawSentenceLike[], fallbackText: string): FinalizedSentence[] {
  const sentences = [...entries]
    .filter((entry) => entry.text.trim())
    .sort((a, b) => {
      const left = a.startMs ?? Number.MAX_SAFE_INTEGER;
      const right = b.startMs ?? Number.MAX_SAFE_INTEGER;
      if (left === right) return a.text.localeCompare(b.text);
      return left - right;
    });

  const result: FinalizedSentence[] = [];
  let previousEndMs = 0;

  for (const sentence of sentences) {
    const startMs = sentence.startMs ?? previousEndMs;
    const endMs = Math.max(startMs, sentence.endMs ?? startMs);
    previousEndMs = endMs;

    result.push({
      startMs,
      endMs,
      text: sentence.text.trim(),
      speakerLabel: sentence.speakerLabel,
    });
  }

  if (result.length) return result;
  const fallback = fallbackText.trim();
  if (!fallback) return [];
  return [{ startMs: 0, endMs: 0, text: fallback }];
}

async function readJsonSafe(response: Response): Promise<DashScopeTaskResponse | null> {
  const raw = await response.text();
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as DashScopeTaskResponse;
  } catch {
    return null;
  }
}

function maybeThrowApiError(parsed: DashScopeTaskResponse | null, fallbackMessage: string): void {
  if (!parsed?.code) return;
  const message = parsed.message || fallbackMessage;
  throw new FinalPassError('recognition_failed', message);
}

async function submitRecordedRecognitionTask(params: {
  apiKey: string;
  sourceAudioRemoteUrl: string;
  vocabularyId?: string;
  speakerMode?: FinalPassSpeakerMode;
}): Promise<string> {
  const diarizationParams =
    params.speakerMode === 'one'
      ? { diarization_enabled: false }
      : params.speakerMode === 'two'
        ? { diarization_enabled: true, speaker_count: 2 }
        : params.speakerMode === 'three'
          ? { diarization_enabled: true, speaker_count: 3 }
          : { diarization_enabled: true };

  const response = await fetch(DASHSCOPE_RECORDED_RECOGNITION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey.trim()}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'fun-asr',
      input: {
        file_urls: [params.sourceAudioRemoteUrl],
      },
      parameters: {
        ...diarizationParams,
        ...(params.vocabularyId?.trim() ? { vocabulary_id: params.vocabularyId.trim() } : {}),
      },
    }),
  });

  const parsed = await readJsonSafe(response);
  if (!response.ok) {
    const detail = parsed?.message || `HTTP ${response.status}`;
    throw new FinalPassError('recognition_failed', `File ASR submission failed: ${detail}`);
  }
  maybeThrowApiError(parsed, 'File ASR submission failed.');

  const taskId = asString(parsed?.output?.task_id);
  if (!taskId) {
    throw new FinalPassError('recognition_failed', 'File ASR returned no task_id.');
  }
  return taskId;
}

async function queryTaskOnce(apiKey: string, taskId: string): Promise<DashScopeTaskResponse> {
  const headers = {
    Authorization: `Bearer ${apiKey.trim()}`,
    'Content-Type': 'application/json',
  };

  const getResponse = await fetch(`${DASHSCOPE_TASK_QUERY_BASE_URL}/${taskId}`, {
    method: 'GET',
    headers,
  });
  if (getResponse.ok) {
    const parsed = await readJsonSafe(getResponse);
    return parsed || {};
  }

  const postResponse = await fetch(`${DASHSCOPE_TASK_QUERY_BASE_URL}/${taskId}`, {
    method: 'POST',
    headers,
  });
  const parsed = await readJsonSafe(postResponse);
  if (!postResponse.ok) {
    const detail = parsed?.message || `HTTP ${postResponse.status}`;
    throw new FinalPassError('recognition_failed', `Task query failed: ${detail}`);
  }
  return parsed || {};
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function transcriptionUrlFromTask(task: DashScopeTaskResponse): string {
  const results = Array.isArray(task.output?.results) ? task.output?.results : [];
  for (const result of results) {
    const url = asString(result?.transcription_url);
    if (url) return url;
  }
  return '';
}

async function fetchTranscriptionPayload(params: {
  apiKey: string;
  transcriptionUrl: string;
}): Promise<unknown> {
  const first = await fetch(params.transcriptionUrl);
  if (first.ok) return first.json();

  const second = await fetch(params.transcriptionUrl, {
    headers: {
      Authorization: `Bearer ${params.apiKey.trim()}`,
    },
  });
  if (!second.ok) {
    throw new FinalPassError(
      'recognition_failed',
      `Failed to fetch transcription result (${second.status}).`,
    );
  }
  return second.json();
}

export async function runDashScopeRecordedFinalPass(params: {
  apiKey: string;
  sourceAudioRemoteUrl: string;
  timeoutMs: number;
  vocabularyId?: string;
  speakerMode?: FinalPassSpeakerMode;
  onStatus?: (message: string) => void;
}): Promise<{ taskId: string; finalizedSentences: FinalizedSentence[]; transcriptText: string }> {
  const taskId = await submitRecordedRecognitionTask({
    apiKey: params.apiKey,
    sourceAudioRemoteUrl: params.sourceAudioRemoteUrl,
    vocabularyId: params.vocabularyId,
    speakerMode: params.speakerMode,
  });
  params.onStatus?.('Final-pass recognition started.');

  const deadline = Date.now() + Math.max(30_000, Math.floor(params.timeoutMs));
  while (Date.now() < deadline) {
    const task = await queryTaskOnce(params.apiKey, taskId);
    maybeThrowApiError(task, 'File ASR task failed.');

    const status = asString(task.output?.task_status).toUpperCase();
    if (status === 'SUCCEEDED') {
      const transcriptionUrl = transcriptionUrlFromTask(task);
      if (!transcriptionUrl) {
        throw new FinalPassError(
          'recognition_failed',
          'File ASR succeeded but returned no transcription_url.',
        );
      }

      params.onStatus?.('Parsing final-pass transcript...');
      const payload = await fetchTranscriptionPayload({
        apiKey: params.apiKey,
        transcriptionUrl,
      });
      const transcriptText = pickFallbackTranscript(payload);
      const finalizedSentences = toFinalizedSentences(
        collectSentenceRecords(payload),
        transcriptText,
      );
      return {
        taskId,
        finalizedSentences,
        transcriptText: finalizedSentences.map((entry) => entry.text).join(' ').trim() || transcriptText,
      };
    }

    if (status === 'FAILED' || status === 'CANCELED') {
      throw new FinalPassError('recognition_failed', `File ASR task ${status.toLowerCase()}.`);
    }

    params.onStatus?.(`Final-pass status: ${status || 'pending'}...`);
    await delay(POLL_INTERVAL_MS);
  }

  throw new FinalPassError('timeout', 'File ASR final pass timed out.');
}
