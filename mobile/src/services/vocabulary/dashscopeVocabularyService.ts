const DASHSCOPE_VOCAB_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization';
const VOCAB_MODEL = 'speech-biasing';
const TARGET_MODEL = 'fun-asr-realtime';
const VOCAB_PREFIX = 'pcv1';

type DashScopeResponse = {
  output?: {
    vocabulary_id?: string;
  };
  code?: string;
  message?: string;
};

async function postDashScopeVocabulary(
  apiKey: string,
  input: Record<string, unknown>,
): Promise<DashScopeResponse> {
  const response = await fetch(DASHSCOPE_VOCAB_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VOCAB_MODEL,
      input,
    }),
  });

  const raw = await response.text();
  let parsed: DashScopeResponse | null = null;
  try {
    parsed = JSON.parse(raw) as DashScopeResponse;
  } catch {
    // keep null and surface raw response below
  }

  if (!response.ok) {
    const detail = parsed?.message || raw || `HTTP ${response.status}`;
    throw new Error(`Vocabulary API request failed: ${detail}`);
  }

  if (parsed?.code) {
    throw new Error(parsed.message || `Vocabulary API error: ${parsed.code}`);
  }

  return parsed ?? {};
}

function toVocabularyEntries(terms: string[]): Array<{ text: string; weight: number }> {
  return terms.map((text) => ({ text, weight: 4 }));
}

export async function syncDashScopeVocabulary(params: {
  apiKey: string;
  terms: string[];
  vocabularyId?: string;
}): Promise<string> {
  const { apiKey, terms, vocabularyId } = params;
  const vocabulary = toVocabularyEntries(terms);

  if (vocabularyId) {
    await postDashScopeVocabulary(apiKey, {
      action: 'update_vocabulary',
      vocabulary_id: vocabularyId,
      vocabulary,
    });
    return vocabularyId;
  }

  const response = await postDashScopeVocabulary(apiKey, {
    action: 'create_vocabulary',
    target_model: TARGET_MODEL,
    prefix: VOCAB_PREFIX,
    vocabulary,
  });
  const nextId = response.output?.vocabulary_id;
  if (!nextId) {
    throw new Error('Vocabulary API returned no vocabulary_id.');
  }
  return nextId;
}

export async function deleteDashScopeVocabulary(params: {
  apiKey: string;
  vocabularyId: string;
}): Promise<void> {
  await postDashScopeVocabulary(params.apiKey, {
    action: 'delete_vocabulary',
    vocabulary_id: params.vocabularyId,
  });
}
