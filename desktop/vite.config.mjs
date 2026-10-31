import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  root: path.resolve(import.meta.dirname, 'src/renderer'),
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src/renderer'),
    },
  },
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, 'src/renderer/index.html'),
    },
  },
});
