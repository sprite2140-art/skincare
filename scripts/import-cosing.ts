// npm run import-cosing -- <CosIng 导出的 CSV 文件>
// 把 CosIng "Ingredients & Fragrance Inventory" 原始导出转成 data/cosing_ingredients.csv。

import { readFileSync, writeFileSync } from 'node:fs';
import Papa from 'papaparse';
import { parseCosingExport } from '../src/data/cosing';

const file = process.argv[2];
if (!file) {
  console.error('用法：npm run import-cosing -- <CosIng 导出的 CSV 文件>');
  process.exit(1);
}
const entries = parseCosingExport(readFileSync(file, 'utf8'));
const csv = Papa.unparse(
  entries.map((e) => ({ inci_name: e.inciName, functions: e.functions.join(';'), cas_no: e.casNo, cosing_ref: e.ref, update_date: e.updateDate })),
  { columns: ['inci_name', 'functions', 'cas_no', 'cosing_ref', 'update_date'], newline: '\n' },
);
writeFileSync(new URL('../data/cosing_ingredients.csv', import.meta.url), csv + '\n');
const perfuming = entries.filter((e) => e.functions.some((f) => f.includes('perfuming'))).length;
console.log(`已写入 data/cosing_ingredients.csv：${entries.length} 个成分，其中登记功能含香料（perfuming）${perfuming} 个。`);
