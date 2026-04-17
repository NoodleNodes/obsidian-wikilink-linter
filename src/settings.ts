export interface WikilinkLinterSettings {
  lintOnSave: boolean;
  skipWords: string;
}

export const DEFAULT_SETTINGS: WikilinkLinterSettings = {
  lintOnSave: false,
  // Standard English title-case exceptions (articles, short prepositions, conjunctions)
  skipWords: 'a, an, the, and, but, or, nor, for, so, yet, at, by, in, of, on, to, up, as, is, it, vs',
};

export function parseSkipWords(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean),
  );
}
