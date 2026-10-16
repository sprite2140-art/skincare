// 打分参数。全部是初始假设（见 docs/PRODUCT.md "打分算法"），朋友试用后调整。

import type { Category, EvidenceLevel, RiskTag } from '../data/types';

export const WEIGHTS = {
  need: 0.5,
  irritation: 0.25,
  evidence: 0.15,
  environment: 0.1,
} as const;
export type DimensionKey = keyof typeof WEIGHTS;

/** 有排序的困扰（面部，最多 3 个）：第 1/2/3 位的权重；超出的按最后一位算 */
export const RANKED_CONCERN_WEIGHTS = [3, 2, 1];

/** 计入刺激风险的标签，每个标签只扣一次 */
export const IRRITANT_TAGS: RiskTag[] = ['fragrance', 'alcohol', 'essential_oil', 'strong_acid', 'sensitizer'];
export const IRRITANT_DEDUCTION = 15;
/** 敏感肌或头皮易痒：扣分加倍 */
export const SENSITIVE_MULTIPLIER = 2;
/** strong_cleanser 只在每天洗头时扣分 */
export const STRONG_CLEANSER_DEDUCTION = 15;

export const EVIDENCE_SCORES: Record<EvidenceLevel, number> = { A: 100, B: 70, C: 40 };

export const ENVIRONMENT_SCORES = {
  hardWithChelator: 100,
  hardWithoutChelator: 50,
  neutral: 50,
} as const;
export const CHELATING_FUNCTION = 'chelating';

/** 高 / 中 / 低 的分界 */
export const LEVEL_THRESHOLDS = { high: 70, medium: 40 } as const;

export type BudgetTier = 'economy' | 'mid' | 'premium' | 'unlimited';
export type PriceTier = Exclude<BudgetTier, 'unlimited'>;

/**
 * 各品类的价格档（USD）。经济 < economyBelow；中档 economyBelow–midUpTo（含两端）；高端 > midUpTo。
 * 其他币种的价格先按 data/exchange_rates.csv 换算成 USD 再归档；展示仍用当地货币。
 * 用户选的预算档是上限：选"中档"排除高端产品，不排除经济产品。高端没有上限，因此选"高端"等同于"不限"。
 * 表里没有的品类不做预算筛选，只给提示。
 */
export const PRICE_TIERS_USD: Partial<Record<Category, { economyBelow: number; midUpTo: number }>> = {
  shampoo: { economyBelow: 12, midUpTo: 30 },
};

/** 冲洗型品类：刺激风险扣分减半。卸妆、去角质因产品形态不一（有免洗型），暂按免洗处理 */
export const RINSE_OFF_CATEGORIES: Category[] = ['cleanser', 'shampoo', 'conditioner', 'hair_mask', 'body_wash', 'body_scrub'];
export const RINSE_OFF_MULTIPLIER = 0.5;
