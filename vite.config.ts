/// <reference types="vitest" />
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import Papa from 'papaparse';
import { aliasMap, normalizeName, resolveAlias } from './src/data/ingredientIndex';
import { parseInciAliases } from './src/data/cosing';
import { parseProducts } from './src/data/parse';

/**
 * CosIng 全表有数万行，网页只需要产品成分表中出现的成分：构建时按产品成分名（含"INCI 名/俗名"斜杠前的部分，
 * 以及别名表 inci_aliases.csv 对应的 INCI 名）过滤。
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
      const aliasesPath = dataFile('inci_aliases.csv');
      this.addWatchFile(aliasesPath.pathname);
      // 别名表里的写法按对应的 INCI 名保留
      const aliases = aliasMap(parseInciAliases(readFileSync(aliasesPath, 'utf8')));
      const used = new Set<string>();
      for (const p of parseProducts(readFileSync(productsPath, 'utf8'))) {
        for (const n of p.inciList) {
          const key = resolveAlias(n, aliases);
          used.add(key);
          if (key.includes('/')) used.add(resolveAlias(key.split('/')[0].trim(), aliases));
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
