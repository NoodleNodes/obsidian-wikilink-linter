// Scans metadataCache.unresolvedLinks, matches broken link text against vault filenames
// using the same normalization as the Hazel rename script, then rewrites the links in place.

import { App, TFile } from 'obsidian';

export interface RepairedLink {
  sourceFile: string;   // vault path of the file containing the broken link
  linkText: string;     // full link text as written (e.g. "This is a New Note")
  displayAlias: string; // alias to use — linkText stripped of any folder prefix
  newTarget: string;    // resolved kebab basename (e.g. "this-is-a-new-note")
}

export interface AmbiguousLink {
  sourceFile: string;
  linkText: string;
  candidates: string[]; // basenames of all possible matches
}

export interface UnmatchedLink {
  sourceFile: string;
  linkText: string;
}

export interface RepairPlan {
  repairs: RepairedLink[];
  ambiguous: AmbiguousLink[];
  unmatched: UnmatchedLink[];
}

// Mirrors the Hazel rename script exactly:
// 1. NFD-decompose and strip combining diacritical marks (é→e, ö→o, etc.)
// 2. Lowercase
// 3. Underscores → dashes
// 4. Remove apostrophes (straight and curly)
// 5. Any remaining non-alphanumeric run → single dash
// 6. Collapse multiple dashes, strip leading/trailing
export function normalizeToKebab(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/['\u2018\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildRepairPlan(app: App): RepairPlan {
  // Build map: normalizedBasename → TFile[]
  // Array because two files could normalize to the same name (ambiguous)
  const fileMap = new Map<string, TFile[]>();
  for (const file of app.vault.getMarkdownFiles()) {
    const key = normalizeToKebab(file.basename);
    const bucket = fileMap.get(key) ?? [];
    bucket.push(file);
    fileMap.set(key, bucket);
  }

  const repairs: RepairedLink[] = [];
  const ambiguous: AmbiguousLink[] = [];
  const unmatched: UnmatchedLink[] = [];

  for (const [sourceFile, links] of Object.entries(app.metadataCache.unresolvedLinks)) {
    for (const rawLinkText of Object.keys(links)) {
      // Strip heading anchor for file matching (e.g. "Note Title#section" → "Note Title")
      const filePartOfLink = rawLinkText.includes('#')
        ? rawLinkText.split('#')[0]
        : rawLinkText;

      // Strip folder prefix for alias display (e.g. "folder/Note Title" → "Note Title")
      const displayAlias = filePartOfLink.includes('/')
        ? (filePartOfLink.split('/').pop() ?? filePartOfLink)
        : filePartOfLink;

      const normalized = normalizeToKebab(displayAlias);
      const candidates = fileMap.get(normalized) ?? [];

      if (candidates.length === 0) {
        unmatched.push({ sourceFile, linkText: filePartOfLink });
      } else if (candidates.length === 1) {
        repairs.push({
          sourceFile,
          linkText: filePartOfLink,
          displayAlias,
          newTarget: candidates[0].basename,
        });
      } else {
        ambiguous.push({
          sourceFile,
          linkText: filePartOfLink,
          candidates: candidates.map((f) => f.basename),
        });
      }
    }
  }

  return { repairs, ambiguous, unmatched };
}

// Applies all repairs for their respective files. Returns the number of files modified.
export async function applyRepairs(app: App, repairs: RepairedLink[]): Promise<number> {
  // Group by source file so we only read/write each file once
  const byFile = new Map<string, RepairedLink[]>();
  for (const repair of repairs) {
    const bucket = byFile.get(repair.sourceFile) ?? [];
    bucket.push(repair);
    byFile.set(repair.sourceFile, bucket);
  }

  let filesChanged = 0;

  for (const [filePath, fileRepairs] of byFile) {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) continue;

    const original = await app.vault.read(file);
    let content = original;

    for (const repair of fileRepairs) {
      content = rewriteLinksInContent(content, repair);
    }

    if (content !== original) {
      await app.vault.modify(file, content);
      filesChanged++;
    }
  }

  return filesChanged;
}

function rewriteLinksInContent(content: string, repair: RepairedLink): string {
  const { linkText, newTarget, displayAlias } = repair;
  const escaped = escapeRegex(linkText);

  // Matches all wikilink variants for this target:
  //   (!?)          — optional transclusion prefix
  //   \[\[          — opening [[
  //   escaped       — the exact broken link text
  //   (#[^\]|]*)?   — optional #heading anchor
  //   (?:\|([^\]]*))?  — optional existing |alias
  //   \]\]          — closing ]]
  const re = new RegExp(
    `(!?)\\[\\[${escaped}(#[^\\]|]*)?(?:\\|([^\\]]*))?\\]\\]`,
    'g',
  );

  return content.replace(
    re,
    (_match, bang: string, anchor: string | undefined, existingAlias: string | undefined) => {
      const anchorPart = anchor ?? '';

      if (bang === '!') {
        // Transclusion: fix target only — an alias would break the embed
        return `![[${newTarget}${anchorPart}]]`;
      }

      // Regular link: preserve any existing alias, otherwise use the original display text
      const alias = existingAlias ?? displayAlias;
      return `[[${newTarget}${anchorPart}|${alias}]]`;
    },
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
