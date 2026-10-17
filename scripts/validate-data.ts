// npm run validate-data：检查 data/ 下的 CSV。有 error 时退出码为 1。

import { loadDataFromDisk } from '../src/data/node';
import { validateData } from '../src/data/validate';
import { computeBudgetCaps } from '../src/scoring/budget';

const { ingredients, products, cities, exchangeRates, cosing, allergens, water } = loadDataFromDisk();
const issues = validateData(ingredients, products, cities, exchangeRates, { cosing, allergens, water });
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

for (const i of [...errors, ...warnings]) {
  console.log(`${i.level === 'error' ? 'ERROR' : 'warn '}  ${i.file}  ${i.key}：${i.message}`);
}

const verified = ingredients.filter((i) => i.reviewStatus === 'verified').length;
console.log(
  `\n成分库 ${ingredients.length} 个（已核对 ${verified}），CosIng ${cosing.length} 个，香料致敏原清单 ${allergens.length} 个，产品 ${products.length} 个，城市 ${cities.length} 个；` +
    `${errors.length} 个错误，${warnings.length} 个提示。`,
);
const caps = computeBudgetCaps(products, exchangeRates);
for (const [category, c] of Object.entries(caps)) {
  if (c) console.log(`预算档位 ${category}：≤ ${c.p33.toFixed(2)} USD / ≤ ${c.p67.toFixed(2)} USD / 不限（${c.sampleSize} 个有价格的产品）`);
}
process.exit(errors.length > 0 ? 1 : 0);
