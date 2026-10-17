// 打分参数。全部是初始假设（见 docs/PRODUCT.md "打分算法"），朋友试用后调整。

import type { EvidenceLevel, RiskTag } from '../data/types';

export const WEIGHTS = {
  need: 0.5,
  irritation: 0.25,
  evidence: 0.15,
  environment: 0.1,
} as const;
export type DimensionKey = keyof typeof WEIGHTS;

/** 需求匹配：成分表中有、但不是产品主打（key_actives）的有效成分，按此比例计分 */
export const NON_KEY_ACTIVE_CREDIT = 0.3;

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

// ---------- 效果依据（需求匹配与证据强度） ----------
// 依据分三类，可靠程度从高到低：可靠的成品测试 > 品牌宣称 > 成分功能。
// 成分功能只做辅助匹配：同一困扰只看"有没有"，不按成分数量加分，也不据此推断实际柔顺程度或留香时长。

/** 有可靠成品测试（products.csv 的 tested_claims）支持的困扰，按此比例计分 */
export const TESTED_CLAIM_CREDIT = 1;
/** 只有品牌宣称（claimed_benefits，产品定位）支持的困扰，按此比例计分 */
export const BRAND_CLAIM_CREDIT = 0.7;
/** 证据强度：成品测试支持的困扰记 100；只有品牌宣称、没有成分证据的困扰记此分 */
export const TESTED_EVIDENCE_SCORE = 100;
export const CLAIM_ONLY_EVIDENCE_SCORE = 30;

/** 成分功能（functions）→ 困扰：用于成分库里暂未逐个标注 targets 的情况 */
export const FUNCTION_TARGETS: Record<string, string[]> = {
  chelating: ['clarifying'],
};

/** 洗发水侧重头皮与清洁：头皮相关困扰的权重；发丝状态和期望效果权重为 1 */
export const SHAMPOO_SCALP_WEIGHT = 2;

/**
 * 品牌主打成分的常见写法 → INCI 名中的关键词（小写），用于把 key_actives 对应到成分表。
 * 只登记明确的对应关系；对应不上的主打成分仍作为品牌宣称展示，不参与成分匹配。
 */
export const KEY_ACTIVE_SYNONYMS: Record<string, string[]> = {
  'hyaluronic acid': ['sodium hyaluronate', 'hyaluronic acid', 'hydrolyzed hyaluronic acid'],
  'fermented hyaluronic acid': ['sodium hyaluronate', 'hyaluronic acid'],
  'vitamin e': ['tocopherol', 'tocopheryl acetate'],
  'vitamin b5': ['panthenol'],
  'pro-vitamin b5': ['panthenol'],
  'pro-vitamin b5 complex': ['panthenol'],
  'vitamin c': ['ascorbic acid'],
  keratin: ['hydrolyzed keratin', 'keratin'],
  'tea tree oil': ['melaleuca alternifolia leaf oil'],
  rosemary: ['rosmarinus officinalis'],
  'rosemary oil': ['rosmarinus officinalis leaf oil'],
  'rosemary extract': ['rosmarinus officinalis leaf extract'],
  peppermint: ['mentha piperita'],
  'argan oil': ['argania spinosa kernel oil'],
  'coconut oil': ['cocos nucifera oil'],
  'avocado oil': ['persea gratissima oil'],
  'shea butter': ['butyrospermum parkii butter'],
  'soybean oil': ['glycine soja oil'],
};
