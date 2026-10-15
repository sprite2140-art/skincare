// 按 INCI 名和别名查找成分。匹配忽略大小写、多余空格和全角/半角差异。

import type { Ingredient } from './types';

/** 名称规范化，仅用于匹配。Aqua / Water 这类同义名靠成分库的 aliases 字段对应 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([/,()-])\s*/g, '$1')
    .trim();
}

export interface IngredientIndex {
  get(name: string): Ingredient | undefined;
  all: Ingredient[];
}

export function buildIngredientIndex(ingredients: Ingredient[]): IngredientIndex {
  const map = new Map<string, Ingredient>();
  for (const ing of ingredients) {
    for (const name of [ing.inciName, ...ing.aliases]) {
      const key = normalizeName(name);
      // 主名优先：别名与其他成分的主名冲突时不覆盖（冲突由 validate.ts 报告）
      if (!map.has(key)) map.set(key, ing);
    }
  }
  return {
    get: (name) => map.get(normalizeName(name)),
    all: ingredients,
  };
}
