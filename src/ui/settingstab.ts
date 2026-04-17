import { App, PluginSettingTab, Setting } from 'obsidian';
import type WikilinkLinterPlugin from '../main';

export default class WikilinkLinterSettingsTab extends PluginSettingTab {
  private plugin: WikilinkLinterPlugin;

  constructor(app: App, plugin: WikilinkLinterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Lint on save')
      .setDesc('Automatically add title-case display aliases to kebab-case wikilinks when saving a file (Ctrl/Cmd + S).')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.lintOnSave)
          .onChange(async (value) => {
            this.plugin.settings.lintOnSave = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Title case — words to keep lowercase')
      .setDesc(
        'Comma-separated list of words to keep lowercase when they appear in the middle of a title (articles, short prepositions, conjunctions). The first word is always capitalised.',
      )
      .addTextArea((area) => {
        area
          .setValue(this.plugin.settings.skipWords)
          .onChange(async (value) => {
            this.plugin.settings.skipWords = value;
            await this.plugin.saveSettings();
          });
        area.inputEl.rows = 3;
        area.inputEl.style.width = '100%';
      });
  }
}
