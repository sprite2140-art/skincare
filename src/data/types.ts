// 数据类型，对应 docs/DATA_SCHEMA.md。修改字段时两处同步更新。

export const TARGETS = [
  'acne', 'oil', 'dryness', 'redness', 'pigmentation', 'aging', 'pores',
  'dandruff', 'scalp_oil', 'scalp_itch', 'hair_loss', 'damage', 'frizz', 'flat_hair',
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
  region: Region;
  formulaNote: string;
  channels: string[];
  inclusionBasis: string;
  inciList: string[];
  price: number | null;
  currency: string;
  availableInCn: CnAvailability;
  transparency: Transparency;
  sourceUrl: string;
  reviewedOn: string;
}

export interface City {
  city: string;
  country: string;
  waterHardness: WaterHardness;
  source: string;
  reviewStatus: ReviewStatus;
}
