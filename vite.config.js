import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/content/content-script.js'),
      name: 'ContentScript',
      formats: ['iife'],
      fileName: () => 'content-script.bundle.js'
    },
    rollupOptions: {
      output: {
        extend: true
      }
    }
  },
  test: {
    environment: 'node'
  }
});
