import { MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { lintText } from './linter';
import { buildRepairPlan } from './reconciler';
import { DEFAULT_SETTINGS, WikilinkLinterSettings, parseSkipWords } from './settings';
import RepairModal from './ui/RepairModal';
import WikilinkLinterSettingsTab from './ui/settingstab';

export default class WikilinkLinterPlugin extends Plugin {
  settings: WikilinkLinterSettings;

  // Holds the original save callback so we can restore it on unload
  private _originalSaveCallback: (() => void) | null = null;

  override async onload() {
    await this.loadSettings();
    this.addSettingTab(new WikilinkLinterSettingsTab(this.app, this));

    this.addCommand({
      id: 'lint-wikilinks-current-file',
      name: 'Lint wikilinks in current file',
      editorCallback: async (_editor, ctx) => {
        if (!ctx.file) return;
        const changed = await this.lintFile(ctx.file);
        new Notice(changed ? 'Wikilinks updated.' : 'Nothing to update.');
      },
    });

    this.addCommand({
      id: 'lint-wikilinks-vault',
      name: 'Lint wikilinks in entire vault',
      callback: () => { void this.lintVault(); },
    });

    this.addCommand({
      id: 'repair-broken-wikilinks',
      name: 'Repair broken wikilinks',
      callback: () => {
        const plan = buildRepairPlan(this.app);
        new RepairModal(this.app, plan).open();
      },
    });

    this.hookSaveCommand();
  }

  override onunload() {
    this.restoreSaveCommand();
  }

  async loadSettings() {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...((await this.loadData()) as Partial<WikilinkLinterSettings>),
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Returns true if the file was modified.
  private async lintFile(file: TFile): Promise<boolean> {
    const original = await this.app.vault.read(file);
    const skipWords = parseSkipWords(this.settings.skipWords);
    const updated = lintText(original, skipWords);
    if (updated === original) return false;
    await this.app.vault.modify(file, updated);
    return true;
  }

  private async lintVault() {
    const files = this.app.vault.getMarkdownFiles();
    new Notice(`Linting ${files.length} file${files.length === 1 ? '' : 's'}…`);
    let changed = 0;
    for (const file of files) {
      if (await this.lintFile(file)) changed++;
    }
    new Notice(`Done — ${changed} file${changed === 1 ? '' : 's'} updated.`);
  }

  // Intercepts Obsidian's built-in save command so lint-on-save can run first.
  // This is the standard community pattern; there is no official before-save API.
  private hookSaveCommand() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saveCmd = (this.app as any).commands?.commands?.['editor:save-file'];
    if (!saveCmd?.callback) return;

    const original: () => void = saveCmd.callback.bind(saveCmd);
    this._originalSaveCallback = original;

    saveCmd.callback = () => {
      if (this.settings.lintOnSave) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view?.file) {
          void this.lintFile(view.file);
        }
      }
      original();
    };
  }

  private restoreSaveCommand() {
    if (!this._originalSaveCallback) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saveCmd = (this.app as any).commands?.commands?.['editor:save-file'];
    if (saveCmd) saveCmd.callback = this._originalSaveCallback;
    this._originalSaveCallback = null;
  }
}
