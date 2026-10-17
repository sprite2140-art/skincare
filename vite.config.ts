/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Cloudflare Pages 部署在域名根路径（含 PR 预览地址）
  base: '/',
  test: {
    environment: 'node',
  },
});
