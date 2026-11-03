import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const listFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : [p];
  });

/**
 * Emits sw.js from sw.template.js with every built file precached, so the app works offline
 * after the first visit. The cache version changes whenever any file does.
 */
function serviceWorker(): Plugin {
  return {
    name: 'bnaa-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const publicDir = join(__dirname, 'public');
      const publicFiles = listFiles(publicDir).map((p) => relative(publicDir, p).split('\\').join('/'));
      const files = [...new Set(['./', 'index.html', ...Object.keys(bundle), ...publicFiles])].filter((f) => !f.endsWith('.map')).sort();

      const hash = createHash('sha256');
      for (const f of files) {
        hash.update(f);
        const chunk = bundle[f];
        if (chunk) hash.update(chunk.type === 'chunk' ? chunk.code : chunk.source);
        else if (publicFiles.includes(f)) hash.update(readFileSync(join(publicDir, f)));
      }

      const source = readFileSync(join(__dirname, 'sw.template.js'), 'utf8')
        .replace('__VERSION__', JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace('__PRECACHE__', JSON.stringify(files, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// base './' so the built app works from any static host or sub-path
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
});
