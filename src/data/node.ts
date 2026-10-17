// Node 端（测试、校验脚本）读取 data/ 下的 CSV。

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseCities, parseExchangeRates, parseIngredients, parseProducts, parseReferenceWater, parseWaterRecords } from './parse';
import { expandIngredients, parseAllergens, parseCosingTable, parseExplanations, parseIngredientList } from './cosing';
import { buildIngredientIndex } from './ingredientIndex';

const dataDir = fileURLToPath(new URL('../../data/', import.meta.url));
const read = (name: string) => readFileSync(dataDir + name, 'utf8');

export function loadDataFromDisk() {
  const ingredients = parseIngredients(read('ingredients.csv'));
  const cosing = parseCosingTable(read('cosing_ingredients.csv'));
  const allergens = parseAllergens(read('eu_fragrance_allergens.csv'));
  const explanations = parseExplanations(read('ingredient_explanations.csv'));
  const lists = {
    chelators: parseIngredientList(read('chelators.csv')),
    fragrances: parseIngredientList(read('fragrance_ingredients.csv')),
  };
  const allIngredients = expandIngredients(ingredients, cosing, allergens, explanations, lists);
  return {
    /** 成分库 ingredients.csv 本身 */
    ingredients,
    cosing,
    allergens,
    /** 常见成分通俗解释（起草稿，未核对） */
    explanations,
    /** 本项目维护的判断清单：螯合剂、加香成分 */
    lists,
    /** 成分库 + CosIng + 致敏原清单，用于匹配产品成分 */
    allIngredients,
    ingredientIndex: buildIngredientIndex(allIngredients),
    products: parseProducts(read('products.csv')),
    water: parseWaterRecords(read('water_hardness.csv')),
    referenceWater: parseReferenceWater(read('water_hardness_reference.csv')),
    cities: parseCities(read('cities.csv'), parseWaterRecords(read('water_hardness.csv'))),
    exchangeRates: parseExchangeRates(read('exchange_rates.csv')),
  };
}
