// 成分出现频率：按统一后的名称合并计算，用来决定成分库优先整理哪些成分。
// 同一成分的不同写法（括号俗名、大小写、成分库 aliases 中登记的别名）合并为一项；
// 已在成分库的成分按成分库主名合并，不在库的按统一后的名称合并。

import { normalizeName, type IngredientIndex } from './ingredientIndex';
import type { Ingredient, Product, ReviewStatus } from './types';

export interface FrequencyRow {
  /** 成分库主名；不在库时为最先出现的统一后写法 */
  name: string;
  /** 出现在多少个产品中（同一产品内重复只算一次） */
  productCount: number;
  /** 合并进来的各种写法 */
  spellings: string[];
  /** 成分库中的核对状态；不在库为 null */
  reviewStatus: ReviewStatus | null;
  /** 条目来源：成分库 / CosIng / 致敏原清单；不在任何来源为 null */
  origin: Ingredient['origin'] | null;
  /** 有多少个产品中这个成分带 [待核对] 标记 */
  nameUnverifiedCount: number;
}

export function ingredientFrequency(products: Product[], index: IngredientIndex): FrequencyRow[] {
  const rows = new Map<string, FrequencyRow>();
  for (const p of products) {
    const flagged = new Set(p.inciNameUnverified);
    const seenInProduct = new Set<string>();
    for (const name of p.inciList) {
      const ing = index.get(name);
      const key = ing ? `lib:${normalizeName(ing.inciName)}` : `raw:${normalizeName(name)}`;
      let row = rows.get(key);
      if (!row) {
        row = { name: ing?.inciName ?? name, productCount: 0, spellings: [], reviewStatus: ing?.reviewStatus ?? null, origin: ing ? ing.origin ?? 'library' : null, nameUnverifiedCount: 0 };
        rows.set(key, row);
      }
      if (!row.spellings.includes(name)) row.spellings.push(name);
      if (seenInProduct.has(key)) continue;
      seenInProduct.add(key);
      row.productCount += 1;
      if (flagged.has(name)) row.nameUnverifiedCount += 1;
    }
  }
  return [...rows.values()].sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
}
