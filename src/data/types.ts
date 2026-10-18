// 数据类型，对应 docs/DATA_SCHEMA.md。修改字段时两处同步更新。

export const TARGETS = [
  'acne', 'oil', 'dryness', 'redness', 'pigmentation', 'aging', 'pores',
  'dandruff', 'scalp_oil', 'scalp_itch', 'scalp_redness', 'hair_loss',
  'damage', 'frizz', 'flat_hair', 'tangling', 'color_fade',
  // 头皮状态与发丝效果（主要来自品牌宣称，成分库暂少有对应）
  'dry_scalp', 'sensitive_scalp', 'clarifying', 'shine', 'curl_definition', 'tone_yellow', 'tone_orange',
  // 造型产品残留：只来自问卷（常用造型产品的用户），由螯合剂清单匹配
  'buildup',
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
  'conditioner', 'hair_mask', 'leave_in', 'hair_oil',
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

/** varies：同一城市不同供水分区或时期的硬度等级不同，无法确定住户用水 */
export const WATER_HARDNESS = ['soft', 'moderate', 'hard', 'very_hard', 'varies', 'unknown'] as const;
export type WaterHardness = (typeof WATER_HARDNESS)[number];

/** 产品是否明确标注 fragrance-free（无香） */
export const FRAGRANCE_FREE_CLAIMS = ['yes', 'no', 'unknown'] as const;
export type FragranceFreeClaim = (typeof FRAGRANCE_FREE_CLAIMS)[number];

/**
 * claimed_benefits 的来源：brand_text = 品牌原文（产品页明确写的）；data_classification = 资料整理时的分类。
 * 两者都按"产品定位"计分，页面分别标注"品牌宣称"和"资料分类"。
 */
export const CLAIM_SOURCES = ['brand_text', 'data_classification'] as const;
export type ClaimSource = (typeof CLAIM_SOURCES)[number];

/**
 * 品牌产品页的效果宣称（不是独立验证的效果）。
 * brand_page_summary = brand_claims 是品牌页的中文概括；brand_page_quote = brand_claims 是品牌页英文原文摘录；
 * version_mismatch = 在售版本与品牌页不一致，留空；not_collected = 尚未收集。
 */
export const BRAND_CLAIM_STATUSES = ['brand_page_summary', 'brand_page_quote', 'version_mismatch', 'not_collected'] as const;
export type BrandClaimStatus = (typeof BRAND_CLAIM_STATUSES)[number];

export interface BrandClaims {
  /** 中文概括；status = brand_page_quote 时为英文原文摘录 */
  text: string;
  /** 产品页短原文 */
  quote: string;
  sourceUrl: string;
  /** 按品牌明确宣称的效果对应的困扰（brand_claim_targets），计分时按"品牌宣称"计 */
  targets: Target[];
  status: BrandClaimStatus | null;
}

/** 产品细分类型：co_wash = 清洁型护发素（代替洗发水使用，归入 shampoo 品类，按清洁步骤使用） */
export const PRODUCT_SUBTYPES = ['co_wash'] as const;
export type ProductSubtype = (typeof PRODUCT_SUBTYPES)[number];

/** 榜单 / 奖项，结果页显示为标签，详情注明来源与年份 */
export interface Award {
  source: string;
  year: string;
  title: string;
  url: string;
}

/** 可靠的成品测试（第三方或公开方法的测试），目前没有数据 */
export interface TestedClaim {
  target: Target;
  description: string;
  year: string;
  url: string;
}

export interface Conflict {
  inci: string;
  severity: ConflictSeverity;
}

/** 成分条目的来源：成分库（ingredients.csv）/ 欧盟 CosIng 批量导入 / 欧盟香料致敏原清单 */
export type IngredientOrigin = 'library' | 'cosing' | 'eu_allergen_list';

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
  /** 来源；成分库的条目为 library（解析 CSV 时省略，见 expandIngredients） */
  origin?: IngredientOrigin;
  /** 在欧盟需标注的香料致敏原清单上 */
  euAllergen?: boolean;
  /** 在本项目维护的加香成分清单（data/fragrance_ingredients.csv）上 */
  fragranceListed?: boolean;
  /** 在本项目维护的螯合剂清单（data/chelators.csv）上 */
  chelator?: boolean;
  /** CosIng 登记的功能（小写），仅批量导入后才有；只用于展示，不参与打分 */
  cosingFunctions?: string[];
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
  /** 细分类型（subtype），如 co_wash；普通产品为 null */
  subtype: ProductSubtype | null;
  region: Region;
  formulaNote: string;
  channels: string[];
  inclusionBasis: string;
  awards: Award[];
  /** 产品定位针对的困扰 / 效果 */
  claimedBenefits: Target[];
  /** claimedBenefits 的来源；没有填写时为 null（按资料分类处理） */
  claimSource: ClaimSource | null;
  brandClaims: BrandClaims;
  testedClaims: TestedClaim[];
  fragranceFreeClaim: FragranceFreeClaim;
  /** 无香声明的出处（fragrance_free_claim = yes 时必填） */
  fragranceFreeSourceUrl: string;
  /** 英文 INCI 名，按包装顺序；解析时已统一写法（去掉括号俗名和 [待核对] 标记），打分用这一列 */
  inciList: string[];
  /** inciList 中原文带 [待核对] 标记的成分（统一后的名称）：名称未核对，不参与打分 */
  inciNameUnverified: string[];
  /**
   * 品牌宣称的主打成分，按品牌原文保存（可含浓度、复配物或技术名称）。
   * 空数组 = 还没填写；keyActivesDisclosed 为 false 表示品牌没有单独公布（填 Not separately disclosed）。
   */
  keyActives: string[];
  keyActivesDisclosed: boolean;
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
  /** 购买链接（零售商或品牌产品页） */
  purchaseUrl: string;
  /** 同系列的其他品类产品（如洗发水对应的护发素）；不代表必须成套购买 */
  pairedProductIds: string[];
  /** 产品图：只有 image_license 写明可用时才展示，否则用统一占位图 */
  imageUrl: string;
  imageSource: string;
  imageLicense: string;
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
  leave_in: 'leave_on',
  hair_oil: 'leave_on',
  body_wash: 'rinse_off',
  body_lotion: 'leave_on',
  body_scrub: 'rinse_off',
};

/** 产品实际的使用方式：产品填写的值优先，否则用品类默认值；都没有时为 null */
export function usageTypeOf(product: Pick<Product, 'category' | 'usageType'>): UsageType | null {
  return product.usageType ?? CATEGORY_DEFAULT_USAGE[product.category as Category] ?? null;
}

/** 一条水硬度记录（data/water_hardness.csv）：某个供水系统、水厂、水源或配水点在某个时期的数据 */
export interface WaterRecord {
  city: string;
  country: string;
  regionId: string;
  /** 适用范围，如 "LADWP source: MWD Weymouth Plant" */
  scope: string;
  /** 统计口径：annual_mean / single_sample / reported_typical_range / monthly_mean 等 */
  statisticType: string;
  /** mg/L，以 CaCO3 计；没有时为 null */
  value: number | null;
  min: number | null;
  max: number | null;
  /** 原始分级：soft / moderately_hard / hard / very_hard / hard_or_very_hard / moderately_hard_or_hard / unknown */
  hardnessClass: string;
  period: string;
  confidence: string;
  note: string;
  sources: string[];
  retrievedOn: string;
}

/**
 * 参照城市的水硬度（data/water_hardness_reference.csv）：只用于在刻度条上做对照，不赋给用户城市。
 * 各城市统计口径不同（年均、单点、分区），不能当作同一年度全城平均直接比较。
 */
export interface ReferenceWater {
  city: string;
  cityZh: string;
  country: string;
  supplier: string;
  /** mg/L，以 CaCO3 计；未取得时为 null */
  value: number | null;
  /** 范围按原文保留（如 "<5"），只用于显示 */
  minText: string;
  maxText: string;
  period: string;
  year: string;
  /** 适用范围说明（中文） */
  scope: string;
  statisticType: string;
  sources: string[];
  /** 资料备注（中文） */
  note: string;
  retrievedOn: string;
}

export interface City {
  city: string;
  country: string;
  /** 由该城市的水硬度记录汇总得出，见 summarizeHardness() */
  waterHardness: WaterHardness;
  water: WaterRecord[];
  reviewStatus: ReviewStatus;
}
