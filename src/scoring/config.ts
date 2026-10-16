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

/** 预算档位由产品价格的分位数自动计算，见 budget.ts */

/** 冲洗型产品（usage_type = rinse_off）刺激风险扣分乘以此系数 */
export const RINSE_OFF_MULTIPLIER = 0.5;

/**
 * 测试模式：允许 review_status = draft 的有效成分和风险成分参与打分，结果页标注"测试数据，尚未核对"。
 * 仅用于开发测试阶段看推荐效果。**正式上线前必须改为 false。**
 */
export const TEST_MODE_DRAFT_SCORING = true;
