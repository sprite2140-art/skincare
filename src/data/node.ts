// Node 端（测试、校验脚本）读取 data/ 下的 CSV。

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseCities, parseIngredients, parseProducts } from './parse';

const dataDir = fileURLToPath(new URL('../../data/', import.meta.url));
const read = (name: string) => readFileSync(dataDir + name, 'utf8');

export function loadDataFromDisk() {
  return {
    ingredients: parseIngredients(read('ingredients.csv')),
    products: parseProducts(read('products.csv')),
    cities: parseCities(read('cities.csv')),
  };
}
