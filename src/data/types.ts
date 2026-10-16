// 数据类型，对应 docs/DATA_SCHEMA.md。修改字段时两处同步更新。

export const TARGETS = [
  'acne', 'oil', 'dryness', 'redness', 'pigmentation', 'aging', 'pores',
  'dandruff', 'scalp_oil', 'scalp_itch', 'scalp_redness', 'hair_loss',
  'damage', 'frizz', 'flat_hair', 'tangling', 'color_fade',
] as const;
export type Target = (typeof TARGETS)[number];

export const RISK_TAGS = [
  'fragrance', 'essential_oil', 'alcohol', 'strong_acid', 'sensitizer',
  'strong_cleanser', 'pregnancy_caution', 'rx_caution',
] as const;
export type RiskTag = (typeof RISK_TAGS)[number];

export const INGREDIENT_CATEGORIES = ['active', 'risk', 'base'] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const EVIDENCE_LEVELS = ['A', 'B', 'C'] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const REVIEW_STATUSES = ['draft', 'verified'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const CONFLICT_SEVERITIES = ['mild', 'severe'] as const;
export type ConflictSeverity = (typeof CONFLICT_SEVERITIES)[number];

/** 品类编号（products.csv 的 category） */
export const CATEGORIES = [
  'makeup_remover', 'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'exfoliator',
  'shampoo', 'scalp_care',
  'conditioner', 'hair_mask', 'hair_oil',
  'body_wash', 'body_lotion', 'body_scrub',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const ZONES = ['face', 'scalp', 'hair', 'body'] as const;
export type Zone = (typeof ZONES)[number];

export const REGIONS = ['US', 'JP', 'KR', 'CN'] as const;
export type Region = (typeof REGIONS)[number];

export const CN_AVAILABILITY = ['yes', 'cross_border', 'unknown'] as const;
export type CnAvailability = (typeof CN_AVAILABILITY)[number];

export const TRANSPARENCY = ['high', 'medium', 'low'] as const;
export type Transparency = (typeof TRANSPARENCY)[number];

export const WATER_HARDNESS = ['soft', 'moderate', 'hard', 'unknown'] as const;
export type WaterHardness = (typeof WATER_HARDNESS)[number];

export interface Conflict {
  inci: string;
  severity: ConflictSeverity;
}

export interface Ingredient {
  inciName: string;
  nameZh: string;
  aliases: string[];
  category: IngredientCategory;
  functions: string[];
  targets: Target[];
  effectiveRange: string;
  maxLimit: string;
  evidenceLevel: EvidenceLevel | null;
  riskTags: RiskTag[];
  conflictsWith: Conflict[];
  explainZh: string;
  explainEn: string;
  sources: string[];
  reviewStatus: ReviewStatus;
  reviewedOn: string;
}

export interface Product {
  productId: string;
  brand: string;
  nameEn: string;
  nameZh: string;
  zone: Zone;
  category: string;
  /** 产品表填写的使用方式；为空时用品类默认值，见 usageTypeOf() */
  usageType: UsageType | null;
  region: Region;
  formulaNote: string;
  channels: string[];
  inclusionBasis: string;
  /** 英文 INCI 名，按包装顺序；解析时已统一写法（去掉括号俗名和 [待核对] 标记），打分用这一列 */
  inciList: string[];
  /** inciList 中原文带 [待核对] 标记的成分（统一后的名称）：名称未核对，不参与打分 */
  inciNameUnverified: string[];
  /** 包装原文成分表（如中文、日文、韩文），原样保存，仅供展示和核对 */
  inciListOriginal: string;
  price: number | null;
  currency: string;
  /** 规格（毫升） */
  sizeMl: number | null;
  availableInCn: CnAvailability;
  transparency: Transparency;
  /** 成分表来源，可有多个 */
  sourceUrls: string[];
  reviewedOn: string;
}

export interface ExchangeRate {
  currency: string;
  /** 1 USD 兑多少该货币（与美联储 H.10 的报价方式一致） */
  perUsd: number;
  /** 汇率对应的数据日期 */
  dataDate: string;
  source: string;
}

export const USAGE_TYPES = ['rinse_off', 'leave_on'] as const;
export type UsageType = (typeof USAGE_TYPES)[number];

/**
 * 各品类的默认使用方式。卸妆和去角质没有统一默认值，必须按单个产品填写：
 * 卸妆油、卸妆膏、磨砂膏、含酸洁面为 rinse_off；卸妆水、酸类爽肤水和精华为 leave_on。
 */
export const CATEGORY_DEFAULT_USAGE: Record<Category, UsageType | null> = {
  makeup_remover: null,
  cleanser: 'rinse_off',
  toner: 'leave_on',
  serum: 'leave_on',
  moisturizer: 'leave_on',
  sunscreen: 'leave_on',
  exfoliator: null,
  shampoo: 'rinse_off',
  scalp_care: 'leave_on',
  conditioner: 'rinse_off',
  hair_mask: 'rinse_off',
  hair_oil: 'leave_on',
  body_wash: 'rinse_off',
  body_lotion: 'leave_on',
  body_scrub: 'rinse_off',
};

/** 产品实际的使用方式：产品填写的值优先，否则用品类默认值；都没有时为 null */
export function usageTypeOf(product: Pick<Product, 'category' | 'usageType'>): UsageType | null {
  return product.usageType ?? CATEGORY_DEFAULT_USAGE[product.category as Category] ?? null;
}

export interface City {
  city: string;
  country: string;
  waterHardness: WaterHardness;
  source: string;
  reviewStatus: ReviewStatus;
}
