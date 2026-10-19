// 数据覆盖统计：问卷里每个可选需求 × 价格区间有多少款可推荐的产品，其中多少款无香。
// 用于发现数据缺口，由 `npm run coverage` 生成 docs/COVERAGE.md。
//
// "可推荐"的口径：
// - 只看默认市场（美国）的产品；
// - 用只含这一个需求、只选这一个价格区间的最简档案打分，没有被硬性过滤排除；
// - 需求匹配分大于 0，即至少有一项依据（成品测试、资料分类、品牌宣称或成分功能）。
// 价格区间与问卷一致：按品类价格的四分位数分四个区间（不含下界、含上界），另加不限。

import type { Product } from '../data/types';
import { EMPTY_HAIR, hairNeeds, scalpNeeds, type NeedChoice } from '../profile/questionnaire';
import { SHAMPOO_SCALP_WEIGHT } from './config';
import { fragranceTier } from './fragrance';
import { DEFAULT_MARKET, inMarket } from './market';
import { scoreProduct, type ScoringData, type ScoringProfile } from './score';
import type { BudgetChoice } from './budget';

export const COVERAGE_BUDGETS: BudgetChoice[] = ['q1', 'q2', 'q3', 'q4', 'none'];

/** 问卷中可选的需求：头皮困扰（只统计洗发水）和期望效果；"香味好闻"不对应需求，不统计 */
const SCALP_NEEDS = scalpNeeds({ concerns: ['dandruff', 'itch', 'dry_tight', 'hair_loss'], oilTiming: null, washFrequency: null });
// "去黄""去橙"只在染过或烫漂过时出现，统计时按可选处理
const GOAL_NEEDS = (['smooth', 'moisture', 'less_frizz', 'clean', 'volume', 'shine', 'curl', 'tone_yellow', 'tone_orange'] as const)
  .flatMap((g) => hairNeeds({ ...EMPTY_HAIR, conditions: ['colored'], goals: [g] }));

/** 各品类不统计的需求：护发素不统计"清爽洁净" */
const SKIPPED_NEEDS: Record<string, string[]> = { conditioner: ['clean'] };

export const COVERAGE_GROUPS: { key: 'scalp' | 'goals'; needs: NeedChoice[] }[] = [
  { key: 'scalp', needs: SCALP_NEEDS },
  { key: 'goals', needs: GOAL_NEEDS },
];

/** 护发素不针对头皮，头皮困扰只统计洗发水 */
export function coverageGroups(category: string) {
  const skip = SKIPPED_NEEDS[category] ?? [];
  return COVERAGE_GROUPS
    .filter((g) => category === 'shampoo' || g.key !== 'scalp')
    .map((g) => ({ ...g, needs: g.needs.filter((n) => !skip.includes(n.id)) }));
}

export interface CoverageCell {
  count: number;
  fragranceFree: number;
  productIds: string[];
}

function minimalProfile(need: NeedChoice, category: string, budget: BudgetChoice): ScoringProfile {
  const scalp = SCALP_NEEDS.some((n) => n.id === need.id);
  return {
    concerns: need.targets,
    concernsRanked: false,
    needs: [{ ...need, weight: scalp && category === 'shampoo' ? SHAMPOO_SCALP_WEIGHT : 1 }],
    sensitive: false,
    specialStatus: 'none',
    avoidIngredients: [],
    avoidTags: [],
    budget,
    fragrancePref: null,
    washFrequency: null,
    city: null,
    inUseProducts: [],
  };
}

export function coverageCell(products: Product[], category: string, need: NeedChoice, budget: BudgetChoice, data: ScoringData): CoverageCell {
  const ok = products
    .filter((p) => p.category === category && inMarket(p, DEFAULT_MARKET))
    .map((p) => scoreProduct(p, minimalProfile(need, category, budget), data))
    .filter((r) => !r.excluded && !r.lowMatch && (r.dimensions.need.score ?? 0) > 0);
  return {
    count: ok.length,
    // 无香：有无香声明，或成分表中没有发现加香成分和精油
    fragranceFree: ok.filter((r) => fragranceTier(r.fragrance) === 0).length,
    productIds: ok.map((r) => r.product.productId),
  };
}

/** 有同系列护发素的洗发水 */
export function shampoosWithPairedConditioner(products: Product[]) {
  const conditioners = new Set(products.filter((p) => p.category === 'conditioner').map((p) => p.productId));
  const shampoos = products.filter((p) => p.category === 'shampoo' && inMarket(p, DEFAULT_MARKET));
  const paired = shampoos.filter((p) => p.pairedProductIds.some((id) => conditioners.has(id)));
  return { total: shampoos.length, paired: paired.length, ids: paired.map((p) => p.productId) };
}
