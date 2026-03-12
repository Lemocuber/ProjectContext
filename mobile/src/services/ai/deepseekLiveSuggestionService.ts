import { buildLiveSuggestionPromptContext } from './promptContext';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function normalizeSuggestionLine(value: string): string {
  return value.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/\s+/g, ' ').trim();
}

function parseSuggestions(content: string): string[] {
  const lines = content
    .split(/\r?\n+/)
    .map(normalizeSuggestionLine)
    .filter(Boolean);

  if (lines.length > 1) return lines.slice(0, 3);

  const sentenceChunks = content
    .split(/(?<=[.!?。！？])\s+/)
    .map(normalizeSuggestionLine)
    .filter(Boolean);
  return (sentenceChunks.length ? sentenceChunks : [normalizeSuggestionLine(content)]).slice(0, 3);
}

export async function generateLiveSuggestions(params: {
  apiKey: string;
  transcript: string;
}): Promise<string[]> {
  const context = buildLiveSuggestionPromptContext(params.transcript);
  if (!context) {
    throw new Error('Cannot generate suggestions from empty transcript.');
  }

  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.3,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content:
            'You are assisting during an ongoing conversation. Return 1 to 3 short actionable suggestions for what the user should say, ask, or do next. Keep the response concise, practical, and in the same dominant language as the transcript. Plain text only.',
        },
        {
          role: 'user',
          content: context,
        },
      ],
    }),
  });

  const raw = await response.text();
  let parsed: DeepSeekChatResponse | null = null;
  try {
    parsed = JSON.parse(raw) as DeepSeekChatResponse;
  } catch {
    // Keep null and handle below.
  }

  if (!response.ok) {
    throw new Error(raw || `DeepSeek request failed: HTTP ${response.status}`);
  }

  const content = parsed?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('DeepSeek returned no suggestion content.');
  }

  const suggestions = parseSuggestions(content);
  if (!suggestions.length) {
    throw new Error('DeepSeek returned empty suggestions.');
  }
  return suggestions;
}
