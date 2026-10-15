// 问卷答案 → 打分输入。问卷见 docs/PRODUCT.md "问卷设计"。

import type { City, Product, RiskTag, Target } from '../data/types';
import type { BudgetTier } from '../scoring/config';
import type { ScoringProfile, SpecialStatus, WashFrequency } from '../scoring/score';

export type AvoidOption = 'fragrance' | 'alcohol' | 'essential_oil';

export interface BaseAnswers {
  cityKey: string | null; // "城市, 国家"，对应 cities.csv
  budget: BudgetTier;
  specialStatus: SpecialStatus;
  avoid: AvoidOption[];
  avoidIngredients: string[];
}

export type ScalpOilTiming = 'same_day' | 'one_two_days' | 'three_plus_days';
export type ScalpConcern = 'dandruff' | 'itch' | 'redness' | 'hair_loss';

export interface ScalpAnswers {
  oilTiming: ScalpOilTiming | null;
  concerns: ScalpConcern[];
  washFrequency: WashFrequency | null;
}

/**
 * 头皮困扰是多选不排序，平均加权。
 * "发红"在 targets 里暂无对应的头皮取值，不参与需求匹配（会在 PROGRESS 中跟进）。
 */
const SCALP_CONCERN_TARGETS: Record<ScalpConcern, Target | null> = {
  dandruff: 'dandruff',
  itch: 'scalp_itch',
  redness: null,
  hair_loss: 'hair_loss',
};

export function scalpTargets(a: ScalpAnswers): Target[] {
  const targets: Target[] = [];
  for (const c of a.concerns) {
    const t = SCALP_CONCERN_TARGETS[c];
    if (t && !targets.includes(t)) targets.push(t);
  }
  if (a.oilTiming === 'same_day') targets.push('scalp_oil');
  return targets;
}

export function cityKey(c: City): string {
  return `${c.city}, ${c.country}`;
}

export function toScalpScoringProfile(
  base: BaseAnswers,
  scalp: ScalpAnswers,
  cities: City[],
  inUseProducts: Product[],
): ScoringProfile {
  return {
    concerns: scalpTargets(scalp),
    concernsRanked: false,
    // 头皮易痒视为敏感
    sensitive: scalp.concerns.includes('itch'),
    specialStatus: base.specialStatus,
    avoidIngredients: base.avoidIngredients,
    avoidTags: base.avoid as RiskTag[],
    budget: base.budget,
    washFrequency: scalp.washFrequency,
    city: cities.find((c) => cityKey(c) === base.cityKey) ?? null,
    inUseProducts,
  };
}
