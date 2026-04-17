// @ts-check

import process from 'node:process'
import esbuild from 'esbuild'
import { sharedConfig } from './esbuild-config.js'

const prod = process.argv[2] === 'production'

const ctx = await esbuild.context({
  ...sharedConfig,
  sourcemap: prod ? false : 'inline',
  outfile: 'main.js',
})

if (prod) {
  await ctx.rebuild()
  process.exit(0)
} else {
  await ctx.watch()
}
