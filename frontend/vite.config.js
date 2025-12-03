import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// サブディレクトリパス（末尾スラッシュ必須）
const BASE_PATH = '/autosurvey/';

export default defineConfig({
  plugins: [react()],
  base: BASE_PATH,
  server: {
    port: 5173,
    proxy: {
      '/autosurvey/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/autosurvey/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
