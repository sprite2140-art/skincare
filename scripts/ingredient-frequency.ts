// npm run ingredient-frequency：列出产品成分表中各成分的出现次数（按统一后的名称合并），用于决定成分库整理的优先顺序。

import { ingredientFrequency } from '../src/data/frequency';
import { loadDataFromDisk } from '../src/data/node';

const { products, ingredientIndex } = loadDataFromDisk();
const rows = ingredientFrequency(products, ingredientIndex);
const status = (r: (typeof rows)[number]) =>
  r.reviewStatus === null ? '不在库' : r.origin === 'cosing' ? '仅CosIng' : r.reviewStatus === 'verified' ? '已核对' : '未核对';

console.log(`产品数\t状态\t成分\t写法`);
for (const r of rows) {
  const flag = r.nameUnverifiedCount > 0 ? `（${r.nameUnverifiedCount} 处名称待核对）` : '';
  console.log(`${r.productCount}\t${status(r)}\t${r.name}${flag}\t${r.spellings.join(' / ')}`);
}
console.log(`\n共 ${rows.length} 个成分，${products.length} 个产品。`);
