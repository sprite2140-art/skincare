// 本项目维护的面部有效成分类别清单（data/face_active_classes.csv）。冲突规则、敏感肌规则、
// 特殊状态排除和"未调色物理防晒"判断都按类别，不按 CosIng 功能。做法与螯合剂清单、加香成分清单相同。

import { parseCsv } from './parse';
import { normalizeName, type IngredientIndex } from './ingredientIndex';
import type { Ingredient, Product } from './types';

export const ACTIVE_CLASSES = [
  'retinoid', 'benzoyl_peroxide', 'aha', 'bha', 'vitamin_c', 'sunscreen_mineral', 'sunscreen_organic', 'iron_oxide',
] as const;
export type ActiveClass = (typeof ACTIVE_CLASSES)[number];

/** 只对敏感肌计入刺激风险、所有人显示"从低频开始"的功效成分类别（作者决定 2026-10-20） */
export const IRRITANT_ACTIVE_CLASSES: ActiveClass[] = ['retinoid', 'benzoyl_peroxide', 'aha', 'bha'];
/** 去角质类：同一时段最多一个 */
export const EXFOLIANT_CLASSES: ActiveClass[] = ['aha', 'bha'];

export interface ActiveClassEntry {
  inciName: string;
  activeClass: ActiveClass;
  sourceUrl: string;
  addedOn: string;
}

export function parseActiveClasses(text: string): ActiveClassEntry[] {
  return parseCsv(text).map((r) => ({
    inciName: r.inci_name ?? '',
    activeClass: (r.active_class ?? '') as ActiveClass,
    sourceUrl: r.source_url ?? '',
    addedOn: r.added_on ?? '',
  }));
}

export type ActiveClassIndex = Map<string, ActiveClass>;

export function buildActiveClassIndex(entries: ActiveClassEntry[]): ActiveClassIndex {
  return new Map(entries.map((e) => [normalizeName(e.inciName), e.activeClass]));
}

/** 产品成分表中各类别的成分（原文写法）；按原文、成分库主名和别名查 */
export function productActiveClasses(product: Product, index: IngredientIndex, classes: ActiveClassIndex): Map<ActiveClass, string[]> {
  const out = new Map<ActiveClass, string[]>();
  for (const raw of product.inciList) {
    const ing: Ingredient | undefined = index.get(raw);
    const names = [raw, ...(ing ? [ing.inciName, ...ing.aliases] : [])];
    const cls = names.map((n) => classes.get(normalizeName(n))).find((c) => c !== undefined);
    if (!cls) continue;
    const list = out.get(cls) ?? [];
    if (!list.includes(raw)) list.push(raw);
    out.set(cls, list);
  }
  return out;
}

/** 未调色的物理防晒：防晒剂只有氧化锌和 / 或二氧化钛，且成分表中没有氧化铁（按成分表事实，不推测肤感） */
export function isUntintedMineral(found: Map<ActiveClass, string[]>): boolean {
  return found.has('sunscreen_mineral') && !found.has('sunscreen_organic') && !found.has('iron_oxide');
}
