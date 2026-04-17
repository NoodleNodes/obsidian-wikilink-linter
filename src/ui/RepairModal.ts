import { App, Modal } from 'obsidian';
import { applyRepairs, RepairPlan } from '../reconciler';

export default class RepairModal extends Modal {
  constructor(
    app: App,
    private readonly plan: RepairPlan,
  ) {
    super(app);
    this.modalEl.addClass('wl-repair-modal');
  }

  onOpen() {
    this.showPreview();
  }

  onClose() {
    this.contentEl.empty();
  }

  // ── Stage 1: Preview ─────────────────────────────────────────────────────

  private showPreview() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Wikilink Repair' });

    const { repairs, ambiguous, unmatched } = this.plan;
    const total = repairs.length + ambiguous.length + unmatched.length;

    if (total === 0) {
      contentEl.createEl('p', { text: 'No broken links found in your vault.', cls: 'wl-empty' });
      this.addButtonRow(contentEl, [{ label: 'Close', cta: false, onClick: () => this.close() }]);
      return;
    }

    // ── Will update ──────────────────────────────────────────────────────
    if (repairs.length > 0) {
      this.addSectionHeading(contentEl, `✅  Will update — ${repairs.length} link${repairs.length === 1 ? '' : 's'}`);
      const ul = contentEl.createEl('ul', { cls: 'wl-list' });
      for (const r of repairs) {
        const li = ul.createEl('li');
        li.createEl('span', { text: `"${r.linkText}"`, cls: 'wl-original' });
        li.createEl('span', { text: '  →  ', cls: 'wl-arrow' });
        li.createEl('code', { text: `[[${r.newTarget}|${r.displayAlias}]]`, cls: 'wl-result' });
        li.createEl('span', {
          text: `  in: ${fileBasename(r.sourceFile)}`,
          cls: 'wl-source',
        });
      }
      contentEl.createEl('p', {
        text: 'Note: transclusions (![[…]]) will have their target fixed but will not receive an alias.',
        cls: 'wl-footnote',
      });
    }

    // ── Ambiguous ────────────────────────────────────────────────────────
    if (ambiguous.length > 0) {
      this.addSectionHeading(contentEl, `⚠️  Ambiguous — ${ambiguous.length} skipped`);
      const ul = contentEl.createEl('ul', { cls: 'wl-list' });
      for (const a of ambiguous) {
        const li = ul.createEl('li');
        li.createEl('span', { text: `"${a.linkText}"`, cls: 'wl-original' });
        li.createEl('span', {
          text: `  ${a.candidates.length} candidates: ${a.candidates.join(', ')}`,
          cls: 'wl-candidates',
        });
        li.createEl('span', {
          text: `  in: ${fileBasename(a.sourceFile)}`,
          cls: 'wl-source',
        });
      }
    }

    // ── No match ─────────────────────────────────────────────────────────
    if (unmatched.length > 0) {
      this.addSectionHeading(contentEl, `❌  No match — ${unmatched.length} link${unmatched.length === 1 ? '' : 's'}`);
      const ul = contentEl.createEl('ul', { cls: 'wl-list' });
      for (const u of unmatched) {
        const li = ul.createEl('li');
        li.createEl('span', { text: `"${u.linkText}"`, cls: 'wl-original' });
        li.createEl('span', {
          text: `  in: ${fileBasename(u.sourceFile)}`,
          cls: 'wl-source',
        });
      }
    }

    // ── Buttons ──────────────────────────────────────────────────────────
    const buttons: ButtonDef[] = [
      { label: 'Cancel', cta: false, onClick: () => this.close() },
    ];

    if (repairs.length > 0) {
      buttons.push({
        label: `Apply ${repairs.length} change${repairs.length === 1 ? '' : 's'}`,
        cta: true,
        onClick: async (btn) => {
          btn.disabled = true;
          btn.textContent = 'Applying…';
          const filesChanged = await applyRepairs(this.app, this.plan.repairs);
          this.showSummary(this.plan.repairs.length, filesChanged);
        },
      });
    }

    this.addButtonRow(contentEl, buttons);
  }

  // ── Stage 2: Summary ─────────────────────────────────────────────────────

  private showSummary(linksChanged: number, filesChanged: number) {
    const { contentEl } = this;
    const { ambiguous, unmatched } = this.plan;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Wikilink Repair — Done' });

    contentEl.createEl('p', {
      text: `✅  Updated ${linksChanged} link${linksChanged === 1 ? '' : 's'} across ${filesChanged} file${filesChanged === 1 ? '' : 's'}.`,
      cls: 'wl-summary-line',
    });

    if (ambiguous.length > 0) {
      contentEl.createEl('p', {
        text: `⚠️  ${ambiguous.length} ambiguous link${ambiguous.length === 1 ? '' : 's'} skipped — multiple files matched. Fix manually.`,
        cls: 'wl-summary-line',
      });
    }

    if (unmatched.length > 0) {
      contentEl.createEl('p', {
        text: `❌  ${unmatched.length} link${unmatched.length === 1 ? '' : 's'} had no matching file. Fix manually.`,
        cls: 'wl-summary-line',
      });
    }

    this.addButtonRow(contentEl, [
      { label: 'Close', cta: true, onClick: () => this.close() },
    ]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private addSectionHeading(container: HTMLElement, text: string) {
    container.createEl('h3', { text, cls: 'wl-section' });
  }

  private addButtonRow(container: HTMLElement, buttons: ButtonDef[]) {
    const row = container.createEl('div', { cls: 'wl-button-row' });
    for (const def of buttons) {
      const btn = row.createEl('button', {
        text: def.label,
        cls: def.cta ? 'mod-cta' : '',
      });
      btn.addEventListener('click', () => def.onClick(btn));
    }
  }
}

interface ButtonDef {
  label: string;
  cta: boolean;
  onClick: (btn: HTMLButtonElement) => void | Promise<void>;
}

function fileBasename(path: string): string {
  return path.split('/').pop() ?? path;
}
