import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Background / bridge / popup. Content is built separately as IIFE
 * (see vite.content.config.ts) so it never depends on shared chunks.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.ts'),
        bridge: resolve(__dirname, 'src/content/bridge.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
        log: resolve(__dirname, 'src/log/log.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
