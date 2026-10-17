// Node 端（测试、校验脚本）读取 data/ 下的 CSV。

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseCities, parseExchangeRates, parseIngredients, parseProducts } from './parse';
import { expandIngredients, parseAllergens, parseCosingTable } from './cosing';
import { buildIngredientIndex } from './ingredientIndex';

const dataDir = fileURLToPath(new URL('../../data/', import.meta.url));
const read = (name: string) => readFileSync(dataDir + name, 'utf8');

export function loadDataFromDisk() {
  const ingredients = parseIngredients(read('ingredients.csv'));
  const cosing = parseCosingTable(read('cosing_ingredients.csv'));
  const allergens = parseAllergens(read('eu_fragrance_allergens.csv'));
  const allIngredients = expandIngredients(ingredients, cosing, allergens);
  return {
    /** 成分库 ingredients.csv 本身 */
    ingredients,
    cosing,
    allergens,
    /** 成分库 + CosIng + 致敏原清单，用于匹配产品成分 */
    allIngredients,
    ingredientIndex: buildIngredientIndex(allIngredients),
    products: parseProducts(read('products.csv')),
    cities: parseCities(read('cities.csv')),
    exchangeRates: parseExchangeRates(read('exchange_rates.csv')),
  };
}
