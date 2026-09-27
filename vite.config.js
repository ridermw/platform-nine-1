import { defineConfig } from 'vite';

export default defineConfig({
  base: '/platform-nine-1/',
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
});
