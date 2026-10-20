// npm run validate-data：检查 data/ 下的 CSV。有 error 时退出码为 1。

import { readFileSync } from 'node:fs';
import { loadDataFromDisk } from '../src/data/node';
import { parsePurchaseLinks, parseRetailRatings } from '../src/data/parse';

const readData = (name: string) => readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8');
import { validateData } from '../src/data/validate';
import { computeBudgetCaps } from '../src/scoring/budget';

const { formulaChecks, ingredients, products, cities, exchangeRates, cosing, allergens, water, referenceWater, explanations, lists, aliases, faceClassList } = loadDataFromDisk();
const issues = validateData(ingredients, products, cities, exchangeRates, { cosing, allergens, water, referenceWater, explanations, lists, aliases, faceClasses: faceClassList });
// 评分和购买链接文件里的 product_id 必须在产品库中
{
  const ids = new Set(products.map((p) => p.productId));
  for (const [file, rows] of [['retail_ratings.csv', parseRetailRatings(readData('retail_ratings.csv'))], ['purchase_links.csv', parsePurchaseLinks(readData('purchase_links.csv'))]] as const) {
    for (const r of rows) if (!ids.has(r.productId)) issues.push({ level: 'error', file, key: r.productId, message: 'product_id 不在 products.csv' });
  }
  for (const c of formulaChecks) {
    if (!ids.has(c.productId)) issues.push({ level: 'error', file: 'formula_version_checks.csv', key: c.productId, message: 'product_id 不在 products.csv' });
    if (c.status !== 'pending') issues.push({ level: 'error', file: 'formula_version_checks.csv', key: c.productId, message: `status 只能是 pending：${c.status}` });
  }
}
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
  if (c) console.log(`价格上限 ${category}：${c.q1.toFixed(2)} / ${c.q2.toFixed(2)} / ${c.q3.toFixed(2)} USD 以内 / 不限（${c.sampleSize} 个有价格的产品）`);
}
process.exit(errors.length > 0 ? 1 : 0);
