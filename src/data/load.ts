// 网页端数据入口：构建时直接导入 data/ 下的 CSV（单一数据源，不复制）。
// 测试和脚本在 Node 里用 fs 读取同样的文件，不经过这里。

import ingredientsCsv from '../../data/ingredients.csv?raw';
import productsCsv from '../../data/products.csv?raw';
import citiesCsv from '../../data/cities.csv?raw';
import exchangeRatesCsv from '../../data/exchange_rates.csv?raw';
import { parseCities, parseExchangeRates, parseIngredients, parseProducts } from './parse';
import { buildIngredientIndex } from './ingredientIndex';
import { computeBudgetCaps } from '../scoring/budget';

export const ingredients = parseIngredients(ingredientsCsv);
export const products = parseProducts(productsCsv);
export const cities = parseCities(citiesCsv);
export const exchangeRates = parseExchangeRates(exchangeRatesCsv);
export const ingredientIndex = buildIngredientIndex(ingredients);
// 预算档位界线：每次构建时按当前产品库自动重新计算
export const budgetCaps = computeBudgetCaps(products, exchangeRates);
