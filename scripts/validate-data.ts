// npm run validate-data：检查 data/ 下的 CSV。有 error 时退出码为 1。

import { loadDataFromDisk } from '../src/data/node';
import { validateData } from '../src/data/validate';

const { ingredients, products, cities, exchangeRates } = loadDataFromDisk();
const issues = validateData(ingredients, products, cities, exchangeRates);
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

for (const i of [...errors, ...warnings]) {
  console.log(`${i.level === 'error' ? 'ERROR' : 'warn '}  ${i.file}  ${i.key}：${i.message}`);
}

const verified = ingredients.filter((i) => i.reviewStatus === 'verified').length;
console.log(
  `\n成分 ${ingredients.length} 个（已核对 ${verified}），产品 ${products.length} 个，城市 ${cities.length} 个；` +
    `${errors.length} 个错误，${warnings.length} 个提示。`,
);
process.exit(errors.length > 0 ? 1 : 0);
