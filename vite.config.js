import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    // 避免只起 Vite 时自动打开系统浏览器；桌面端由 npm run dev 里的 electron 启动
    open: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  clearScreen: false
});

