// 洗护搭配：从各品类可推荐的产品中选一组，总价不超过整套预算。不限定同品牌。
// 没有符合条件的组合时明确返回 no_match，不自动放宽条件。

import type { Category } from '../data/types';
import type { ProductScore } from './score';

export type SlotStatus = 'ok' | 'no_data' | 'no_match';

export interface RoutineSlot {
  category: Category;
  status: SlotStatus;
  /** 可推荐的产品（按分数排序），用于替换 */
  options: ProductScore[];
  chosen: ProductScore | null;
}

export interface Routine {
  slots: RoutineSlot[];
  /** 已选单品的总价（USD）；有单品价格未知时为 null */
  totalUsd: number | null;
  /** 有数据的品类在条件内找不到单品或组合 */
  noMatch: boolean;
}

// 不太匹配（选了需求但需求匹配为 0）的产品不参与搭配
const eligible = (list: ProductScore[]) => list.filter((r) => !r.excluded && r.score !== null && !r.lowMatch);

/**
 * lists：各品类已排序的打分结果（已应用单品预算和成分排除）。
 * totalCapUsd：整套预算上限；null 表示不限。设了上限时，价格未知的产品不参与组合。
 * 在预算内选总分最高的组合，同分取总价低的。
 */
export function buildRoutine(
  categories: Category[],
  lists: Partial<Record<Category, ProductScore[]>>,
  totalCapUsd: number | null,
): Routine {
  const pools = categories.map((c) => {
    const all = lists[c] ?? [];
    const ok = eligible(all).filter((r) => totalCapUsd === null || (r.price.usd !== null && r.price.usd <= totalCapUsd));
    return { category: c, all, ok };
  });
  const withData = pools.filter((p) => p.ok.length > 0);

  let best: ProductScore[] | null = null;
  let bestScore = -1;
  let bestPrice = Infinity;
  const walk = (i: number, picked: ProductScore[], price: number, score: number) => {
    if (totalCapUsd !== null && price > totalCapUsd + 1e-9) return;
    if (i === withData.length) {
      if (score > bestScore || (score === bestScore && price < bestPrice)) {
        best = picked;
        bestScore = score;
        bestPrice = price;
      }
      return;
    }
    for (const r of withData[i].ok) walk(i + 1, [...picked, r], price + (r.price.usd ?? 0), score + (r.score ?? 0));
  };
  if (withData.length > 0) walk(0, [], 0, 0);

  const chosenList: ProductScore[] = best ?? [];
  const slots: RoutineSlot[] = pools.map((p) => {
    const chosen = chosenList.find((r) => r.product.category === p.category) ?? null;
    const status: SlotStatus = p.all.length === 0 ? 'no_data' : chosen ? 'ok' : 'no_match';
    return { category: p.category, status, options: eligible(p.all), chosen };
  });
  return { slots, totalUsd: routineTotal(slots.map((s) => s.chosen)), noMatch: slots.some((s) => s.status === 'no_match') };
}

/** 已选单品的总价（USD）；有价格未知的单品时为 null */
export function routineTotal(items: (ProductScore | null)[]): number | null {
  let sum = 0;
  for (const r of items) {
    if (!r) continue;
    if (r.price.usd === null) return null;
    sum += r.price.usd;
  }
  return sum;
}
