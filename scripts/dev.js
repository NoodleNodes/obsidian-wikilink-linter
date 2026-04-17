// @ts-check
// Builds into the vault's plugin folder and watches for changes.
// Requires the pjeby/hot-reload plugin to be installed in your vault.
//
// Usage: node scripts/dev.js /path/to/your/vault

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import esbuild from 'esbuild'
import { sharedConfig } from './esbuild-config.js'

const vaultPath = process.argv[2]
if (!vaultPath) {
  console.error('Usage: node scripts/dev.js /path/to/vault')
  process.exit(1)
}

const manifest = JSON.parse(
  await fs.readFile(new URL('../manifest.json', import.meta.url), 'utf-8'),
)
const pluginDir = path.join(vaultPath, '.obsidian', 'plugins', manifest.id)

await fs.mkdir(pluginDir, { recursive: true })
await fs.copyFile(new URL('../manifest.json', import.meta.url).pathname, path.join(pluginDir, 'manifest.json'))
await fs.writeFile(path.join(pluginDir, '.hotreload'), '')

console.log(`Watching → ${pluginDir}`)

const ctx = await esbuild.context({
  ...sharedConfig,
  outfile: path.join(pluginDir, 'main.js'),
})
await ctx.watch()
