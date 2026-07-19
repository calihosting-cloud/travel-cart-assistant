import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Shared chunks (e.g. quoteConfig.js) break classic Chrome content scripts.
 * Build content as a single IIFE so it has zero imports.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/content/content.ts'),
      name: 'TCEContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        extend: true,
      },
    },
  },
});
