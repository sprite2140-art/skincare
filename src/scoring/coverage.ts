// 数据覆盖统计：问卷里每个可选需求 × 价格上限有多少款可推荐的产品，其中多少款无香。
// 用于发现数据缺口，由 `npm run coverage` 生成 docs/COVERAGE.md。
//
// 口径：
// - 只看默认市场（美国）的产品；
// - 用只含这一个需求、只选这一个价格上限的最简档案打分，没有被硬性过滤排除；
// - "满足"：这一项需求有满分依据（主打成分或成品测试）。一项需求都没满足的产品适合等级最高为"一般"，
//   所以格子按满足数统计、标红；只有部分依据（资料分类、品牌宣称、非主打成分）的另外列出。
// 价格上限与问卷一致：按品类价格的 25% / 50% / 75% 分位数，每列包含更便宜的产品（累计），另加不限。

import type { Product } from '../data/types';
import { EMPTY_HAIR, hairNeeds, scalpNeeds, type NeedChoice } from '../profile/questionnaire';
import { SHAMPOO_SCALP_WEIGHT } from './config';
import { fragranceTier } from './fragrance';
import { DEFAULT_MARKET, inMarket } from './market';
import { scoreProduct, type ScoringData, type ScoringProfile } from './score';
import type { BudgetChoice } from './budget';

export const COVERAGE_BUDGETS: BudgetChoice[] = ['q1', 'q2', 'q3', 'none'];

/** 问卷中可选的需求：头皮困扰（只统计洗发水）和期望效果；"香味好闻"不对应需求，不统计 */
const SCALP_NEEDS = scalpNeeds({ concerns: ['dandruff', 'itch', 'dry_tight', 'oily', 'sensitive', 'hair_loss'], oilTiming: null, washFrequency: null });
// 修护受损、护色、去黄、去橙只在染过或烫漂过时出现，去除造型产品残留只在常用造型产品时出现，统计时都按可选处理
const GOAL_NEEDS = ([
  'smooth', 'moisture', 'less_frizz', 'clean', 'volume', 'shine', 'curl', 'repair', 'color_care', 'tone_yellow', 'tone_orange', 'buildup',
] as const).flatMap((g) => hairNeeds({ ...EMPTY_HAIR, conditions: ['colored'], goals: [g] }, { styling: 'daily' }));

/** 各品类不统计的需求：护发素不统计"清爽洁净"，"去除造型产品残留"只分配给洗发水 */
const SKIPPED_NEEDS: Record<string, string[]> = { conditioner: ['clean', 'buildup'] };

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
  /** 这一项需求"满足"的产品数（能达到"适合"及以上） */
  count: number;
  /** 只有部分依据的产品数（适合等级最高为"一般"） */
  partial: number;
  /** 满足的产品中无香的数量 */
  fragranceFree: number;
  /** 满足的产品 */
  productIds: string[];
}

function minimalProfile(need: NeedChoice, category: string, budget: BudgetChoice): ScoringProfile {
  const scalp = SCALP_NEEDS.some((n) => n.id === need.id);
  return {
    concerns: need.targets,
    concernsRanked: false,
    needs: [{ ...need, weight: scalp && category === 'shampoo' ? SHAMPOO_SCALP_WEIGHT : 1 }],
    sensitive: need.id === 'sensitive',
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
  const scored = products
    // 与推荐结果一致：入库依据待补、儿童 / 婴儿产品不计入
    .filter((p) => p.category === category && inMarket(p, DEFAULT_MARKET) && !p.inclusionPending && p.subtype !== 'kids')
    .map((p) => scoreProduct(p, minimalProfile(need, category, budget), data))
    .filter((r) => !r.excluded && !r.lowMatch && (r.dimensions.need.score ?? 0) > 0);
  // 满足：这一项需求有满分依据（主打成分或成品测试），才能达到"适合"及以上；只有部分依据的最高为"一般"
  const met = scored.filter((r) => r.needMatches.some((m) => m.credit >= 1));
  return {
    count: met.length,
    partial: scored.length - met.length,
    // 无香：有无香声明，或成分表中没有发现加香成分和精油
    fragranceFree: met.filter((r) => fragranceTier(r.fragrance) === 0).length,
    productIds: met.map((r) => r.product.productId),
  };
}

/** 有同系列护发素的洗发水 */
export function shampoosWithPairedConditioner(products: Product[]) {
  const conditioners = new Set(products.filter((p) => p.category === 'conditioner').map((p) => p.productId));
  const shampoos = products.filter((p) => p.category === 'shampoo' && inMarket(p, DEFAULT_MARKET));
  const paired = shampoos.filter((p) => p.pairedProductIds.some((id) => conditioners.has(id)));
  return { total: shampoos.length, paired: paired.length, ids: paired.map((p) => p.productId) };
}
