// 按 INCI 名和别名查找成分。匹配忽略大小写、多余空格、全角/半角差异和括号内的俗名。

import type { Ingredient } from './types';

/** 待核对标记，半角或全角方括号均可，如 `Xxx [待核对]` */
const UNVERIFIED_MARK = /[[【]\s*待核对\s*[\]】]/g;

export interface CleanedName {
  /** 统一后的名称：去掉括号内俗名和待核对标记，合并多余空格 */
  name: string;
  /** 原文带 [待核对] 标记：名称本身未核对，不参与打分 */
  nameUnverified: boolean;
}

/**
 * 统一产品成分表中的一个成分名，保留原有大小写以便展示：
 * - 去掉括号内的俗名：`Rosmarinus Officinalis (Rosemary) Leaf Extract` → `Rosmarinus Officinalis Leaf Extract`
 * - 去掉 `[待核对]` 标记，并记为名称未核对
 * 拼写差异（如 Methylalaninate / Methyl Alaninate）不自动合并，靠成分库的 aliases 登记。
 */
export function cleanInciName(raw: string): CleanedName {
  const nameUnverified = raw.normalize('NFKC').match(UNVERIFIED_MARK) !== null;
  const name = raw
    .normalize('NFKC')
    .replace(UNVERIFIED_MARK, ' ')
    .replace(/\([^()]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,/])/g, '$1')
    .trim();
  return { name, nameUnverified };
}

/** 名称规范化，仅用于匹配：在 cleanInciName 基础上忽略大小写和符号两侧空格。同义名靠成分库的 aliases 字段对应 */
export function normalizeName(name: string): string {
  return cleanInciName(name)
    .name
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
    get: (name) => {
      const key = normalizeName(name);
      const hit = map.get(key);
      if (hit || !key.includes('/')) return hit;
      // "INCI 名/俗名"写法（如 Glycine Soja Oil/Soybean Oil）：整体查不到时，用斜杠前的部分查
      // 只用斜杠前的部分，避免 Hippophae Rhamnoides Fruit/Seed Oil 这类本身带斜杠的 INCI 名被拆错
      return map.get(key.split('/')[0].trim());
    },
    all: ingredients,
  };
}
