type PreparedVocabulary = {
  terms: string[];
  error?: string;
};

function containsNonAscii(value: string): boolean {
  return /[^\x00-\x7F]/.test(value);
}

function tokenCount(value: string): number {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  return tokens.length;
}

export function prepareVocabulary(rawText: string): PreparedVocabulary {
  const seen = new Set<string>();
  const terms: string[] = [];
  let nonEmptyCount = 0;
  const lines = rawText.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const term = line.trim();
    if (!term) continue;

    nonEmptyCount += 1;
    if (nonEmptyCount > 500) {
      return {
        terms: [],
        error: `Line ${index + 1}: max 500 terms allowed.`,
      };
    }

    if (containsNonAscii(term)) {
      if (term.length > 15) {
        return {
          terms: [],
          error: `Line ${index + 1}: non-ASCII term must be <= 15 characters.`,
        };
      }
    } else if (tokenCount(term) > 7) {
      return {
        terms: [],
        error: `Line ${index + 1}: ASCII term must be <= 7 space-separated tokens.`,
      };
    }

    if (!seen.has(term)) {
      seen.add(term);
      terms.push(term);
    }
  }

  return { terms };
}
