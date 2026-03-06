import { Directory, File, Paths } from 'expo-file-system';
import type { FinalizedSentence } from '../../types/session';

const TRANSCRIPTS_DIR_NAME = 'transcripts';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateTimeShort(date: Date): string {
  return `${pad2(date.getFullYear() % 100)}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatTimestamp(startMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(startMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `[${pad2(minutes)}:${pad2(seconds)}]`;
}

function buildTimeRangeLine(startedAt: Date, endedAt: Date): string {
  const dayDelta = Math.max(
    0,
    Math.floor(
      (new Date(
        endedAt.getFullYear(),
        endedAt.getMonth(),
        endedAt.getDate(),
        0,
        0,
        0,
        0,
      ).getTime() -
        new Date(
          startedAt.getFullYear(),
          startedAt.getMonth(),
          startedAt.getDate(),
          0,
          0,
          0,
          0,
        ).getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );
  const daySuffix = dayDelta > 0 ? ` (+${dayDelta}d)` : '';
  const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

  return `${formatDateTimeShort(startedAt)} - ${pad2(endedAt.getHours())}:${pad2(endedAt.getMinutes())}${daySuffix} (${durationMinutes} minutes)`;
}

export function buildTranscriptMarkdown(params: {
  title: string;
  startedAt: string;
  endedAt: string;
  sentences?: FinalizedSentence[];
  fallbackTranscript?: string;
}): string {
  const started = new Date(params.startedAt);
  const ended = new Date(params.endedAt);
  const timeLine = buildTimeRangeLine(started, ended);

  const finalized = params.sentences || [];
  const body = finalized.length
    ? finalized
        .map((sentence) => {
          const parts = [formatTimestamp(sentence.startMs)];
          if (sentence.speakerLabel) parts.push(`[${sentence.speakerLabel}]`);
          if (sentence.isHighlight) parts.push('[!IMPORTANT]');
          parts.push(sentence.text.trim());
          return parts.join(' ');
        })
        .join('\n')
    : (params.fallbackTranscript || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');

  return `# ${params.title}\n${timeLine}\n---\n${body}`.trim();
}

export function sanitizeFileNameSegment(value: string): string {
  const clean = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return clean || 'session';
}

export function buildMarkdownFileName(startedAt: string, title: string): string {
  const date = new Date(startedAt);
  const y = pad2(date.getFullYear() % 100);
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}${m}${d}-${sanitizeFileNameSegment(title)}.md`;
}

export function saveTranscriptMarkdown(sessionId: string, markdown: string): string {
  const directory = new Directory(Paths.document, TRANSCRIPTS_DIR_NAME);
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }

  const file = new File(directory, `${sessionId}.md`);
  file.create({ overwrite: true, intermediates: true });
  file.write(markdown);
  return file.uri;
}

export function overwriteTranscriptMarkdown(uri: string, markdown: string): void {
  const file = new File(uri);
  if (!file.exists) {
    file.create({ overwrite: true, intermediates: true });
  }
  file.write(markdown);
}

export async function loadTranscriptMarkdown(uri: string): Promise<string> {
  const file = new File(uri);
  return file.text();
}
