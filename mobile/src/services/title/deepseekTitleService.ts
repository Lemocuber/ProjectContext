import { buildTitlePromptContext } from '../ai/promptContext';
import {
  addDiagnosticsBreadcrumb,
  captureDiagnosticsException,
} from '../diagnostics/diagnostics';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^["'`]+|["'`]+$/g, '').trim().slice(0, 80);
}

export async function generateSessionTitle(params: {
  apiKey: string;
  transcript: string;
}): Promise<string> {
  const transcript = buildTitlePromptContext(params.transcript);
  if (!transcript) {
    throw new Error('Cannot generate title from empty transcript.');
  }

  addDiagnosticsBreadcrumb({
    category: 'deepseek.title',
    message: 'DeepSeek title request started.',
  });
  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.2,
      max_tokens: 40,
      messages: [
        {
          role: 'system',
          content:
            'Return one concise session title in the same language as the transcript (use the dominant language if mixed). Keep it brief and natural for that language, plain text only, and avoid punctuation-heavy styling.',
        },
        {
          role: 'user',
          content: `Transcript:\n${transcript}`,
        },
      ],
    }),
  });

  const raw = await response.text();
  let parsed: DeepSeekChatResponse | null = null;
  try {
    parsed = JSON.parse(raw) as DeepSeekChatResponse;
  } catch {
    // keep null and handle below
  }

  if (!response.ok) {
    const error = new Error(raw || `DeepSeek request failed: HTTP ${response.status}`);
    captureDiagnosticsException(error, {
      feature: 'deepseek_title',
      level: 'error',
      stage: 'http_response',
      tags: { httpStatus: response.status },
    });
    throw error;
  }

  const content = parsed?.choices?.[0]?.message?.content;
  if (!content) {
    const error = new Error('DeepSeek returned no title content.');
    captureDiagnosticsException(error, {
      feature: 'deepseek_title',
      level: 'error',
      stage: 'empty_content',
    });
    throw error;
  }

  const normalized = normalizeTitle(content);
  if (!normalized) {
    const error = new Error('Generated title was empty.');
    captureDiagnosticsException(error, {
      feature: 'deepseek_title',
      level: 'error',
      stage: 'normalize_result',
    });
    throw error;
  }
  addDiagnosticsBreadcrumb({
    category: 'deepseek.title',
    message: 'DeepSeek title request completed.',
  });
  return normalized;
}
