# Wikilink Linter

An [Obsidian](https://obsidian.md) plugin with two tools for keeping wikilinks clean when your filenames use kebab-case.

---

## The problem

If your note filenames follow a kebab-case convention (words separated by hyphens, all lowercase), your wikilinks look ugly in both edit and reading view:

```
[[how-to-take-notes-my-obsidian-setup]]
[[building-a-second-brain]]
[[atomic-habits-summary]]
```

And if you rename files outside of Obsidian (using a tool like Hazel), links in other notes break silently because Obsidian can no longer find the old filename.

---

## What this plugin does

### 1 — Alias Linter

Adds a **display alias** to each plain kebab-case wikilink, converting the filename into readable Title Case:

```
[[how-to-take-notes-my-obsidian-setup|How to Take Notes My Obsidian Setup]]
[[building-a-second-brain|Building a Second Brain]]
[[atomic-habits-summary|Atomic Habits Summary]]
```

Obsidian renders the part after the `|` as the visible link text, so your notes look clean without you having to type aliases by hand.

### 2 — Broken Link Repair

Scans your vault for broken wikilinks and matches them to renamed files using the same normalisation rules your renaming tool uses. Shows a **preview of every proposed change** before touching a single file — you confirm before anything is written.

```
[[This is a New Note]]  →  [[this-is-a-new-note|This is a New Note]]
[[John's Notes]]        →  [[johns-notes|John's Notes]]
[[Sönke Ahrens]]        →  [[sonke-ahrens|Sönke Ahrens]]
```

---

## What it leaves alone

| Situation | Behaviour |
|---|---|
| Link already has a display alias `\[\[note\|My Title\]\]` | **Skipped** — your alias is preserved |
| Transclusion `!\[\[note\]\]` (embedded note) | Target fixed, no alias added — adding an alias would break the embed |
| Filename contains numbers `[[2024-01-15-standup]]` | **Skipped** — date-based filenames are left untouched |
| Wikilinks inside code blocks or inline code | **Skipped** — code is never modified |
| Wikilinks inside YAML frontmatter | **Skipped** |
| Link has no hyphens `[[MyNote]]` | **Skipped** — not kebab-case, nothing to convert |
| Link includes a heading anchor `[[note#section]]` | Alias added from the filename only; the `#section` is preserved in the link target |
| Link includes a folder path `[[folder/note-name]]` | Display text is generated from the filename only, not the full path |
| Ambiguous match (broken link could resolve to two or more files) | **Skipped** — listed in the report for manual review |

---

## Installation

### Option A — Manual install (recommended for most users)

1. Download the latest release from the [Releases](../../releases) page — you need three files: **`main.js`**, **`manifest.json`**, and **`styles.css`**.
2. Open Obsidian. Go to **Settings → Community plugins**.
3. If you see a "Restricted mode" banner, click **Turn on community plugins** to disable it.
4. Open your vault's folder on your computer. The easiest way: in Obsidian go to **Settings → Files and links → scroll to the bottom** and click the folder icon next to "Open vault folder". Alternatively, find it in Finder.
5. Inside your vault folder, navigate to `.obsidian/plugins/` (you may need to show hidden files — on Mac press **Cmd + Shift + .** in Finder).
6. Create a new folder called **`wikilink-linter`**.
7. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
8. Go back to Obsidian **Settings → Community plugins** and click the **Reload plugins** button (circular arrow).
9. Find **Wikilink Linter** in the list and toggle it on.

> **Showing hidden files on Mac:** In Finder, press `Cmd + Shift + .` to toggle hidden files visible. The `.obsidian` folder will appear.

> **Showing hidden files on Windows:** In File Explorer, click the **View** tab and check **Hidden items**.

### Option B — BRAT (Beta Reviewers Auto-update Tool)

If you have the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) installed:

1. In Obsidian go to **Settings → BRAT → Add Beta plugin**.
2. Paste this repository's GitHub URL and click **Add plugin**.
3. Enable the plugin under **Settings → Community plugins**.

---

## Usage

### Lint a single file

1. Open a note.
2. Open the **Command palette** (`Cmd + P` on Mac, `Ctrl + P` on Windows/Linux).
3. Search for **"Lint wikilinks in current file"** and press Enter.
4. A notice will tell you whether any links were updated.

### Lint your entire vault

1. Open the **Command palette**.
2. Search for **"Lint wikilinks in entire vault"** and press Enter.
3. The plugin will process every Markdown file. When finished, a notice shows how many files were updated.

> **Tip:** Run "entire vault" once when you first install the plugin to catch all existing links, then use "current file" or lint-on-save going forward.

### Repair broken wikilinks

1. Open the **Command palette**.
2. Search for **"Repair broken wikilinks"** and press Enter.
3. A preview window opens showing every proposed change grouped into three sections:
   - **✅ Will update** — broken links with a clear single match, ready to apply
   - **⚠️ Ambiguous** — links that matched more than one file, skipped for manual review
   - **❌ No match** — links with no matching file found, skipped for manual review
4. Review the list, then click **Apply** to write the changes, or **Cancel** to exit without touching anything.
5. A summary confirms how many links were updated and how many need manual attention.

### Lint on save (automatic)

1. Go to **Settings → Wikilink Linter**.
2. Toggle **Lint on save** on.

Now every time you press `Cmd + S` / `Ctrl + S`, any new kebab-case wikilinks in the current file will automatically get a display alias added.

---

## Workflow for Hazel users

If you use [Hazel](https://www.noodlesoft.com) (or any external tool) to automatically rename files to kebab-case on import, this is the recommended workflow:

1. **Drop your file into the vault.** Hazel renames it to kebab-case automatically (e.g. `Sönke Ahrens Notes.md` → `sonke-ahrens-notes.md`).
2. **Wait a few seconds.** Obsidian watches the file system and updates its internal link index (the metadata cache) in the background. If you run Repair immediately after a rename, the cache may not have caught up yet and some broken links may not appear in the preview.
3. **Open the Command palette and run "Repair broken wikilinks".** The preview will list every link in your vault that pointed to the old filename, with the proposed fix.
4. **Review and click Apply.**
5. **Optionally run "Lint wikilinks in current file"** on any note you just edited to add display aliases to newly created kebab-case links.

> **Why the wait?** Obsidian's metadata cache is updated asynchronously. Running Repair too quickly after a rename means the cache still shows the old filename as valid — so the broken links don't show up yet. A few seconds is usually enough; switching to a different note and back is a reliable way to trigger a refresh if you are unsure.

---

## Settings

Open **Settings → Wikilink Linter**.

### Lint on save
Automatically lint the current file whenever you save. Off by default.

### Title case — words to keep lowercase
A comma-separated list of words that stay lowercase when they appear in the *middle* of a title. The first word of a title is always capitalised regardless.

Default list:
```
a, an, the, and, but, or, nor, for, so, yet, at, by, in, of, on, to, up, as, is, it, vs
```

**Example with defaults:**
`[[how-to-get-things-done]]` → `How to Get Things Done` (not *How **To** Get Things Done*)

You can add or remove words to match your preferred style guide.

---

## Examples

### Alias linter

| Original wikilink | After linting |
|---|---|
| `[[atomic-habits-summary]]` | `[[atomic-habits-summary\|Atomic Habits Summary]]` |
| `[[how-to-take-notes]]` | `[[how-to-take-notes\|How to Take Notes]]` |
| `[[building-a-second-brain]]` | `[[building-a-second-brain\|Building a Second Brain]]` |
| `[[notes/project-management-tips]]` | `[[notes/project-management-tips\|Project Management Tips]]` |
| `[[how-to-focus#deep-work]]` | `[[how-to-focus#deep-work\|How to Focus]]` |
| `[[2024-01-15-meeting-notes]]` | *(unchanged — contains numbers)* |
| `[[001k2-mythology-enters-through-texture]]` | `[[001k2-mythology-enters-through-texture\|Mythology Enters Through Texture]]` |
| `[[MyNote]]` | *(unchanged — no hyphens)* |
| `[[note\|Custom Title]]` | *(unchanged — already has alias)* |
| `![[embedded-note]]` | *(unchanged — transclusion)* |

### Broken link repair

| Broken link (old filename) | After repair |
|---|---|
| `[[This is a New Note]]` | `[[this-is-a-new-note\|This is a New Note]]` |
| `[[John's Notes]]` | `[[johns-notes\|John's Notes]]` |
| `[[Sönke Ahrens]]` | `[[sonke-ahrens\|Sönke Ahrens]]` |
| `[[Building a Second Brain\|Custom Label]]` | `[[building-a-second-brain\|Custom Label]]` |
| `[[Meeting Notes#agenda]]` | `[[meeting-notes#agenda\|Meeting Notes]]` |
| `![[Embedded Note]]` | `![[embedded-note]]` *(target fixed, no alias)* |

---

## For developers

### Prerequisites
- [Node.js](https://nodejs.org) v18 or later
- npm (comes with Node.js)

### Build from source

```bash
git clone https://github.com/your-username/obsidian-wikilink-linter
cd obsidian-wikilink-linter
npm install
npm run build-fast   # produces main.js
```

### Development with live reload

Requires the [hot-reload](https://github.com/pjeby/hot-reload) plugin installed in your target vault.

```bash
npm run dev /path/to/your/vault
```

This watches for file changes and rebuilds directly into your vault's plugin folder. Obsidian will reload the plugin automatically.

### Project structure

```
src/
├── main.ts            — Plugin entry point, commands, lint-on-save hook
├── settings.ts        — Settings interface and defaults
├── linter.ts          — Alias linter (pure function, no Obsidian dependency)
├── reconciler.ts      — Broken link repair logic and normalisation
└── ui/
    ├── SettingsTab.ts — Settings UI
    └── RepairModal.ts — Two-stage preview/summary modal
```

The normalisation function in `reconciler.ts` mirrors the Hazel rename script exactly, so the matching between broken link text and renamed filenames is always deterministic.

---

## Known limitations

**Filenames containing `§` or other Unicode symbols**
The Hazel rename script strips any character outside `[a-z0-9]`, so filenames like `§1.104.md` become `1-104.md` and the `§` is lost entirely. If you use symbol-prefixed filenames as a deliberate organisational system, exclude those files from the Hazel rule until you have decided on a new convention. This is a Hazel script behaviour, not a plugin limitation — the plugin itself handles these files safely.

---

## Licence

MIT
