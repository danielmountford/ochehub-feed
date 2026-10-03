/**
 * Build script. `node scripts/build.mjs` writes dist/; add `--watch` to rebuild
 * on save and serve it. esbuild is the only build dependency.
 */
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const watch = process.argv.includes('--watch');

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'assets'), { recursive: true });
await cp(join(root, 'public'), dist, { recursive: true });

const options = {
  absWorkingDir: root,
  entryPoints: { app: 'src/main.tsx' },
  outdir: 'dist/assets',
  bundle: true,
  format: 'esm',
  target: ['es2020', 'safari15'],
  jsx: 'automatic',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  // Fonts are copied from public/ as-is, so leave their URLs alone.
  external: ['*.ttf', '*.woff2'],
  logLevel: 'info',
};

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
  const { serve } = await import('./serve.mjs');
  serve(dist);
} else {
  await esbuild.build(options);
}
