/// <reference types="vitest" />
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import Papa from 'papaparse';
import { normalizeName } from './src/data/ingredientIndex';
import { parseProducts } from './src/data/parse';

/**
 * CosIng 全表有数万行，网页只需要产品成分表中出现的成分：构建时按产品成分名（含"INCI 名/俗名"斜杠前的部分）过滤。
 * 测试和脚本在 Node 里读取完整文件，不经过这里。
 */
function cosingUsed(): Plugin {
  const id = 'virtual:cosing-used';
  const dataFile = (name: string) => new URL(`./data/${name}`, import.meta.url);
  return {
    name: 'cosing-used',
    resolveId: (source) => (source === id ? '\0' + id : null),
    load(resolved) {
      if (resolved !== '\0' + id) return null;
      const cosingPath = dataFile('cosing_ingredients.csv');
      const productsPath = dataFile('products.csv');
      this.addWatchFile(cosingPath.pathname);
      this.addWatchFile(productsPath.pathname);
      const used = new Set<string>();
      for (const p of parseProducts(readFileSync(productsPath, 'utf8'))) {
        for (const n of p.inciList) {
          const key = normalizeName(n);
          used.add(key);
          if (key.includes('/')) used.add(key.split('/')[0].trim());
        }
      }
      const parsed = Papa.parse<Record<string, string>>(readFileSync(cosingPath, 'utf8'), { header: true, skipEmptyLines: true });
      const rows = parsed.data.filter((r) => used.has(normalizeName(r.inci_name ?? '')));
      const fields = parsed.meta.fields ?? ['inci_name', 'functions', 'cas_no', 'cosing_ref', 'update_date'];
      return `export default ${JSON.stringify(Papa.unparse(rows, { columns: fields, newline: '\n' }) || fields.join(','))};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), cosingUsed()],
  // Cloudflare Pages 部署在域名根路径（含 PR 预览地址）
  base: '/',
  test: {
    environment: 'node',
  },
});
