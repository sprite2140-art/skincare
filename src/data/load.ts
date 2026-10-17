// 网页端数据入口：构建时直接导入 data/ 下的 CSV（单一数据源，不复制）。
// 测试和脚本在 Node 里用 fs 读取同样的文件，不经过这里。

import ingredientsCsv from '../../data/ingredients.csv?raw';
import productsCsv from '../../data/products.csv?raw';
import citiesCsv from '../../data/cities.csv?raw';
import waterCsv from '../../data/water_hardness.csv?raw';
import waterReferenceCsv from '../../data/water_hardness_reference.csv?raw';
import exchangeRatesCsv from '../../data/exchange_rates.csv?raw';
import allergensCsv from '../../data/eu_fragrance_allergens.csv?raw';
import explanationsCsv from '../../data/ingredient_explanations.csv?raw';
// CosIng 全表很大，构建时只保留产品成分表中出现的成分（见 vite.config.ts）
import cosingCsv from 'virtual:cosing-used';
import { expandIngredients, parseAllergens, parseCosingTable, parseExplanations } from './cosing';
import { parseCities, parseExchangeRates, parseIngredients, parseProducts, parseReferenceWater, parseWaterRecords } from './parse';
import { buildIngredientIndex } from './ingredientIndex';
import { computeBudgetCaps } from '../scoring/budget';

export const ingredients = parseIngredients(ingredientsCsv);
export const products = parseProducts(productsCsv);
export const cities = parseCities(citiesCsv, parseWaterRecords(waterCsv));
/** 参照城市水硬度，只用于刻度条对照 */
export const referenceWater = parseReferenceWater(waterReferenceCsv);
export const exchangeRates = parseExchangeRates(exchangeRatesCsv);
export const ingredientIndex = buildIngredientIndex(expandIngredients(ingredients, parseCosingTable(cosingCsv), parseAllergens(allergensCsv), parseExplanations(explanationsCsv)));
// 预算档位界线：每次构建时按当前产品库自动重新计算
export const budgetCaps = computeBudgetCaps(products, exchangeRates);
