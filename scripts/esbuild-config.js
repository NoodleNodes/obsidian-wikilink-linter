// @ts-check

/** @type {import("esbuild").BuildOptions} */
export const sharedConfig = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron'],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: 'inline',
  treeShaking: true,
}
