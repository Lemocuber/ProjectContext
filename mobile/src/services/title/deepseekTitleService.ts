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
  highlights?: string[];
}): Promise<string> {
  const transcript = params.transcript.trim();
  if (!transcript) {
    throw new Error('Cannot generate title from empty transcript.');
  }

  const highlightsBlock =
    params.highlights && params.highlights.length
      ? `\nHighlights:\n${params.highlights.map((entry) => `- ${entry}`).join('\n')}`
      : '';

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
          content: `Transcript:\n${transcript}${highlightsBlock}`,
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
    throw new Error(raw || `DeepSeek request failed: HTTP ${response.status}`);
  }

  const content = parsed?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek returned no title content.');
  }

  const normalized = normalizeTitle(content);
  if (!normalized) {
    throw new Error('Generated title was empty.');
  }
  return normalized;
}
