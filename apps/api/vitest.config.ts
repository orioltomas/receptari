import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';

function rewriteJsExtensions(): Plugin {
  return {
    name: 'rewrite-js-extensions-to-ts',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) return null;
      if (!source.endsWith('.js')) return null;
      if (!source.startsWith('./') && !source.startsWith('../')) return null;

      const importerDir = dirname(importer);
      const candidates = [
        source.slice(0, -3) + '.ts',
        source.slice(0, -3) + '.tsx',
        source.slice(0, -3) + '/index.ts',
      ];

      for (const candidate of candidates) {
        const abs = isAbsolute(candidate) ? candidate : resolve(importerDir, candidate);
        if (existsSync(abs)) return abs;
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [rewriteJsExtensions()],
  resolve: {
    extensions: ['.mjs', '.mts', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
