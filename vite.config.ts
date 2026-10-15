/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 相对路径，方便部署到 GitHub Pages 等静态托管的子路径
  base: './',
  test: {
    environment: 'node',
  },
});
