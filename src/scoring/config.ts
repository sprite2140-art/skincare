// 打分参数。全部是初始假设（见 docs/PRODUCT.md "打分算法"），朋友试用后调整。

import type { EvidenceLevel, RiskTag } from '../data/types';

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

/**
 * 各币种单件价格上限。占位值，待作者确定。
 * 按产品自身的币种比较，不做汇率换算；表里没有的币种无法比较，只给提示不排除。
 */
export const BUDGET_LIMITS: Record<Exclude<BudgetTier, 'unlimited'>, Record<string, number>> = {
  economy: { USD: 15, JPY: 1500, KRW: 15000, CNY: 80 },
  mid: { USD: 35, JPY: 3500, KRW: 35000, CNY: 200 },
  premium: { USD: 80, JPY: 8000, KRW: 80000, CNY: 500 },
};
