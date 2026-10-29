// 网页端数据入口：构建时直接导入 data/ 下的 CSV（单一数据源，不复制）。
// 测试和脚本在 Node 里用 fs 读取同样的文件，不经过这里。

import ingredientsCsv from '../../data/ingredients.csv?raw';
import productsCsv from '../../data/products.csv?raw';
import ratingsCsv from '../../data/retail_ratings.csv?raw';
import linksCsv from '../../data/purchase_links.csv?raw';
import citiesCsv from '../../data/cities.csv?raw';
import waterCsv from '../../data/water_hardness.csv?raw';
import waterReferenceCsv from '../../data/water_hardness_reference.csv?raw';
import exchangeRatesCsv from '../../data/exchange_rates.csv?raw';
import allergensCsv from '../../data/eu_fragrance_allergens.csv?raw';
import explanationsCsv from '../../data/ingredient_explanations.csv?raw';
import chelatorsCsv from '../../data/chelators.csv?raw';
import fragrancesCsv from '../../data/fragrance_ingredients.csv?raw';
import aromaticsCsv from '../../data/aromatic_botanicals.csv?raw';
import aliasesCsv from '../../data/inci_aliases.csv?raw';
import formulaChecksCsv from '../../data/formula_version_checks.csv?raw';
import faceClassesCsv from '../../data/face_active_classes.csv?raw';
import faceConflictsCsv from '../../data/face_conflicts.csv?raw';
// CosIng 全表很大，构建时只保留产品成分表中出现的成分（见 vite.config.ts）
import cosingCsv from 'virtual:cosing-used';
import { expandIngredients, parseAllergens, parseAromaticBotanicals, parseCosingTable, parseExplanations, parseInciAliases, parseIngredientList } from './cosing';
import { parseCities, parseExchangeRates, parseFormulaVersionChecks, parseIngredients, attachRetail, parseProducts, parsePurchaseLinks, parseReferenceWater, parseRetailRatings, parseWaterRecords } from './parse';
import { buildIngredientIndex } from './ingredientIndex';
import { buildActiveClassIndex, parseActiveClasses, parseFaceConflicts } from './faceActives';
import { computeBudgetCaps } from '../scoring/budget';

export const ingredients = parseIngredients(ingredientsCsv);
export const products = attachRetail(parseProducts(productsCsv), parseRetailRatings(ratingsCsv), parsePurchaseLinks(linksCsv), parseFormulaVersionChecks(formulaChecksCsv));
export const cities = parseCities(citiesCsv, parseWaterRecords(waterCsv));
/** 参照城市水硬度，只用于刻度条对照 */
export const referenceWater = parseReferenceWater(waterReferenceCsv);
export const exchangeRates = parseExchangeRates(exchangeRatesCsv);
export const ingredientIndex = buildIngredientIndex(expandIngredients(ingredients, parseCosingTable(cosingCsv), parseAllergens(allergensCsv), parseExplanations(explanationsCsv), {
  chelators: parseIngredientList(chelatorsCsv),
  fragrances: parseIngredientList(fragrancesCsv),
  aromatics: parseAromaticBotanicals(aromaticsCsv),
}), parseInciAliases(aliasesCsv));
/** 面部有效成分类别清单（本项目维护） */
export const faceActiveClasses = buildActiveClassIndex(parseActiveClasses(faceClassesCsv));
/** 面部搭配提醒（说明和出处） */
export const faceConflictNotes = parseFaceConflicts(faceConflictsCsv);
// 预算价格上限界线：每次构建时按当前产品库自动重新计算
export const budgetCaps = computeBudgetCaps(products, exchangeRates);
