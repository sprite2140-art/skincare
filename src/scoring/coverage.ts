// 数据覆盖统计：每个需求 × 预算档位有多少款可推荐的产品，其中多少款无香。
// 用于发现数据缺口，由 `npm run coverage` 生成 docs/COVERAGE.md。
//
// "可推荐"的口径：
// - 只看默认市场（美国）的产品；
// - 用只含这一个需求、只选这一档预算的最简档案打分，没有被硬性过滤排除；
// - 需求匹配分大于 0，即至少有一项依据（成品测试、资料分类、品牌宣称或成分功能）。
// 预算档位与问卷一致：第一档 = 价格不超过 33% 分位，第二档 = 不超过 67% 分位（含第一档），不限 = 全部。

import type { Product, Target } from '../data/types';
import { SHAMPOO_SCALP_WEIGHT } from './config';
import { fragranceTier } from './fragrance';
import { DEFAULT_MARKET, inMarket } from './market';
import { scoreProduct, type ScoringData, type ScoringProfile } from './score';
import type { BudgetChoice } from './budget';

export const COVERAGE_BUDGETS: BudgetChoice[] = ['p33', 'p67', 'none'];

/** 问卷中的需求分组；"香味好闻"不对应任何需求，不统计 */
export const COVERAGE_GROUPS: { key: 'scalp' | 'hair' | 'goals'; targets: Target[] }[] = [
  { key: 'scalp', targets: ['dandruff', 'scalp_oil', 'scalp_itch', 'dry_scalp', 'sensitive_scalp', 'scalp_redness', 'hair_loss', 'buildup'] },
  { key: 'hair', targets: ['dryness', 'tangling', 'damage', 'color_fade'] },
  { key: 'goals', targets: ['frizz', 'flat_hair', 'shine', 'clarifying', 'curl_definition', 'tone_yellow', 'tone_orange'] },
];

/** 护发素不针对头皮，头皮困扰只统计洗发水 */
export function coverageGroups(category: string) {
  return COVERAGE_GROUPS.filter((g) => category === 'shampoo' || g.key !== 'scalp');
}

export interface CoverageCell {
  count: number;
  fragranceFree: number;
  productIds: string[];
}

function minimalProfile(target: Target, category: string, budget: BudgetChoice): ScoringProfile {
  const scalp = COVERAGE_GROUPS[0].targets.includes(target);
  return {
    concerns: [target],
    concernsRanked: false,
    targetWeights: { [target]: scalp && category === 'shampoo' ? SHAMPOO_SCALP_WEIGHT : 1 },
    sensitive: target === 'sensitive_scalp',
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

export function coverageCell(products: Product[], category: string, target: Target, budget: BudgetChoice, data: ScoringData): CoverageCell {
  const ok = products
    .filter((p) => p.category === category && inMarket(p, DEFAULT_MARKET))
    .map((p) => scoreProduct(p, minimalProfile(target, category, budget), data))
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
