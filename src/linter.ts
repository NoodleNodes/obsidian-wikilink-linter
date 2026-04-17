// Pure transform: finds [[kebab-case-links]] with no existing alias and injects a title-case display alias.
// Skips: transclusions (![[...]]), links that already have an alias (|), links whose filename
// contains purely-numeric segments (e.g. date notes), and content inside code blocks / frontmatter.

const PLACEHOLDER = (i: number) => `%%WLLP${i}%%`;
const PLACEHOLDER_RE = /%%WLLP(\d+)%%/g;

export function lintText(text: string, skipWords: Set<string>): string {
  const slots: string[] = [];

  const protect = (s: string): string => {
    const idx = slots.length;
    slots.push(s);
    return PLACEHOLDER(idx);
  };

  const restore = (s: string): string =>
    s.replace(PLACEHOLDER_RE, (_, i) => slots[parseInt(i, 10)]);

  // Protect frontmatter — only valid at the very start of the file
  let out = text.replace(/^---\n[\s\S]*?\n---(\n|$)/, protect);

  // Protect fenced code blocks (``` or ~~~), using backreference to match the same fence
  out = out.replace(/(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1/g, protect);

  // Protect inline code
  out = out.replace(/`[^`\n]+`/g, protect);

  // Wikilink transform:
  //   (?<!\!)       — not a transclusion (no ! before [[)
  //   \[\[          — opening [[
  //   ([^\]|#\n]+)  — group 1: filename/path (no ], |, #, newline)
  //   (?:#[^\]|\n]*)? — optional heading anchor (not captured into display text)
  //   \]\]          — closing ]]
  // Links with an existing alias already contain | inside [[ ]], so ([^\]|#\n]+) stops before |
  // and the trailing \]\] never matches — those links are safely skipped.
  out = out.replace(
    /(?<!\!)\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?\]\]/g,
    (match, target: string) => {
      const trimmed = target.trim();
      // For paths like "folder/filename", use only the last segment for the display text
      const basename = trimmed.includes('/') ? (trimmed.split('/').pop() ?? trimmed) : trimmed;

      if (!basename.includes('-')) return match;
      if (hasNumericSegment(basename)) return match;

      const display = toTitleCase(basename, skipWords);
      // fullTarget preserves any #heading anchor in the link itself
      const fullTarget = match.slice(2, -2);
      return `[[${fullTarget}|${display}]]`;
    },
  );

  return restore(out);
}

function hasNumericSegment(filename: string): boolean {
  return filename.split('-').some((seg) => /^\d+$/.test(seg));
}

function toTitleCase(filename: string, skipWords: Set<string>): string {
  const segments = filename.split('-');

  // If the first segment starts with a digit it's a Zettelkasten-style ID (e.g. 001k2, 001b1).
  // Strip it from the display alias — the ID belongs in the link target, not the readable title.
  // Pure all-digit segments (dates, ordered prefixes) are already excluded by hasNumericSegment
  // before we get here, so this only fires for mixed alphanumeric IDs like 001k2.
  const start = /^\d/.test(segments[0]) ? 1 : 0;

  return segments
    .slice(start)
    .map((seg, i) => {
      const lower = seg.toLowerCase();
      // Always capitalise the first displayed word; skip-words stay lowercase elsewhere
      return i > 0 && skipWords.has(lower)
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}
