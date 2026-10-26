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

/** 别名类型：美国药品标签写法、美国色素名、植物油的省略写法（只收 CosIng 中对应唯一的） */
export const INCI_ALIAS_TYPES = ['us_drug_name', 'us_color_name', 'plant_oil_short'] as const;
export type InciAliasType = (typeof INCI_ALIAS_TYPES)[number];

/** data/inci_aliases.csv 的一行：产品成分表里的非 INCI 写法 → INCI 名。products.csv 的原文不改 */
export interface InciAlias {
  alias: string;
  inci: string;
  aliasType: InciAliasType;
  sourceUrl: string;
}

/** 别名表：规范化后的别名 → 规范化后的 INCI 名 */
export function aliasMap(aliases: InciAlias[]): Map<string, string> {
  return new Map(aliases.map((a) => [normalizeName(a.alias), normalizeName(a.inci)]));
}

/** 产品成分名对应的规范化 INCI 名：先查别名表，查不到时返回自身 */
export function resolveAlias(name: string, aliases: Map<string, string>): string {
  const key = normalizeName(name);
  return aliases.get(key) ?? key;
}

export function buildIngredientIndex(ingredients: Ingredient[], aliases: InciAlias[] = []): IngredientIndex {
  const alias = aliasMap(aliases);
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
      // 先查别名表（如 Red 4 → CI 14700），再按名称查
      const key = resolveAlias(name, alias);
      // 成分表最后一项常带句号（如 "Fragrance."）：查不到时去掉句号再查；"Alcohol Denat." 这类本身带句号的名称照常命中
      const hit = map.get(key) ?? (key.endsWith('.') ? map.get(resolveAlias(key.slice(0, -1).trim(), alias)) : undefined);
      if (hit || !key.includes('/')) return hit;
      // "INCI 名/俗名"写法（如 Glycine Soja Oil/Soybean Oil）：整体查不到时，用斜杠前的部分查
      // 只用斜杠前的部分，避免 Hippophae Rhamnoides Fruit/Seed Oil 这类本身带斜杠的 INCI 名被拆错
      return map.get(resolveAlias(key.split('/')[0].trim(), alias));
    },
    all: ingredients,
  };
}
