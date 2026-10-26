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

/** 美国监管状态（ingredients.csv 的 us_regulatory_status） */
export const US_REGULATORY_STATUSES = ['otc_drug_active', 'rx_only', 'cosmetic', 'not_permitted_otc', 'unknown'] as const;
export type UsRegulatoryStatus = (typeof US_REGULATORY_STATUSES)[number];

/** 孕期（ingredients.csv 的 pregnancy_note） */
export const PREGNANCY_NOTES = ['avoid', 'caution', 'no_known_concern', 'unknown'] as const;
export type PregnancyNote = (typeof PREGNANCY_NOTES)[number];

export const RISK_TAGS = [
  'fragrance', 'essential_oil', 'alcohol', 'strong_acid', 'sensitizer',
  'strong_cleanser', 'pregnancy_caution', 'rx_caution',
  // 面部功效成分（A 醇类、过氧化苯甲酰、果酸、水杨酸类）：由类别清单算出，只对敏感肌计入刺激；不在 ingredients.csv 中填写
  'active_irritant',
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

/** 面部需求代码（targets 的面部部分） */
export const FACE_TARGETS = ['acne', 'oil', 'dryness', 'redness', 'pigmentation', 'aging', 'pores'] as const;
export type FaceTarget = (typeof FACE_TARGETS)[number];

/** 品类编号（products.csv 的 category） */
export const CATEGORIES = [
  'makeup_remover', 'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'exfoliator',
  'spot_treatment', 'eye_cream', 'face_oil', 'mask',
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
 * version_mismatch = 打分用的成分表与品牌页的配方不一致（品牌官网卖的是另一版），brand_claims 留空，不列品牌官网；
 * retail_mismatch = 成分表和品牌宣称都取自品牌官网，二者一致，只是零售商页面的成分表不同：保留品牌宣称（英文原文摘录）
 *   和品牌官网链接，购买链接下方提示"在售批次可能不同，以包装为准"；
 * not_collected = 尚未收集。
 */
export const BRAND_CLAIM_STATUSES = ['brand_page_summary', 'brand_page_quote', 'version_mismatch', 'retail_mismatch', 'not_collected'] as const;
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
  /** 成分的最高证据等级，只用于展示；打分按 evidenceByTarget 逐个需求读取 */
  evidenceLevel: EvidenceLevel | null;
  /**
   * 每个需求单独的证据等级（evidence_by_target，如 dandruff:A;scalp_oil:C）。
   * 填了这一列时，没写等级的需求按"暂无证据"计；整列为空的旧条目按 evidenceLevel 计。
   */
  evidenceByTarget?: Partial<Record<Target, EvidenceLevel | 'unknown'>>;
  /**
   * 证据对应的最低浓度（%，evidence_min_concentration）：产品公开的浓度低于它、或没有公开时，按降一级计算
   * （如壬二酸：A 级证据来自 15% 处方凝胶，化妆品浓度降一级）
   */
  evidenceMinConcentration?: number | null;
  /** 孕期、光敏、美国监管的原文说明（核对资料原文，只供核对，不在页面显示） */
  pregnancyText?: string;
  photosensitizingText?: string;
  usRegulatoryText?: string;
  /** 证据来自哪种使用方式的产品（evidence_usage）；用在另一种使用方式的产品上时降一级，both 不降 */
  evidenceUsage?: EvidenceUsage | null;
  /** 核对备注，只供核对，不显示 */
  notes?: string;
  /** 美国监管状态（面部有效成分）；只在成分弹窗显示 */
  usRegulatoryStatus?: UsRegulatoryStatus | null;
  /** 孕期：avoid 排除（怀孕 / 备孕 / 哺乳），caution 只提示 */
  pregnancyNote?: PregnancyNote | null;
  /** 是否让皮肤更怕晒 */
  photosensitizing?: YesNoUnknown | null;
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
  /** 通俗解释已核对（ingredient_explanations.csv 中 review_status = verified）；成分本身是否核对看 reviewStatus */
  explainReviewed?: boolean;
  /** 通俗解释来自 ingredient_explanations.csv（成分库条目本身没写）；这时"是否核对"只看 explainReviewed */
  explainFromList?: boolean;
  /** CosIng 登记的功能（小写），仅批量导入后才有；只用于展示，不参与打分 */
  cosingFunctions?: string[];
}

/** 面部品类（zone 必须为 face） */
export const FACE_CATEGORIES = [
  'makeup_remover', 'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'exfoliator',
  'spot_treatment', 'eye_cream', 'face_oil', 'mask',
] as const satisfies readonly Category[];

/** 面部品类的 product_id 前缀（品类-地区-序号，如 CL-US-001）；卸妆、化妆水暂未定前缀 */
export const FACE_ID_PREFIXES: Partial<Record<Category, string>> = {
  cleanser: 'CL',
  moisturizer: 'MO',
  sunscreen: 'SU',
  serum: 'SE',
  exfoliator: 'EX',
  spot_treatment: 'ST',
  eye_cream: 'EY',
  face_oil: 'FO',
  mask: 'MA',
};

/** acne_prone = 品牌标注适合痘肌（acne-prone / breakout-prone 等写法统一为这一项） */
export const SKIN_TYPE_CLAIMS = ['oily', 'dry', 'combination', 'normal', 'sensitive', 'acne_prone', 'all'] as const;
export type SkinTypeClaim = (typeof SKIN_TYPE_CLAIMS)[number];

/** emulsion 不单独设项，记为 lotion */
export const TEXTURES = ['gel', 'lotion', 'cream', 'balm', 'oil', 'foam', 'liquid', 'stick', 'serum'] as const;
export type Texture = (typeof TEXTURES)[number];

export const YES_NO_UNKNOWN = ['yes', 'no', 'unknown'] as const;
export type YesNoUnknown = (typeof YES_NO_UNKNOWN)[number];

/** 防水时长（分钟），按美国 FDA 防晒标签的 40 / 80 分钟 */
export const WATER_RESISTANCE = ['40', '80', 'none', 'unknown'] as const;
export type WaterResistance = (typeof WATER_RESISTANCE)[number];

export const USE_TIMES = ['am', 'pm', 'both', 'unknown'] as const;
export type UseTime = (typeof USE_TIMES)[number];

/** active_concentrations 的一项：品牌公开的有效成分浓度 */
export interface ActiveConcentration {
  inci: string;
  /** 按原文，如 2%、0.3% */
  concentration: string;
  url: string;
}

/**
 * 面部产品的属性（products.csv 在 reviewed_on 之后的 10 列）。旧数据没有这些列或为空时取默认值，不报错。
 * 体验和用法按品牌原文，不从成分推断。
 */
export interface FaceAttributes {
  skinTypeClaim: SkinTypeClaim[];
  texture: Texture | null;
  /** 只有 sunscreen 填写；填了但不是数字时为 NaN（由校验报错） */
  spf: number | null;
  broadSpectrum: YesNoUnknown;
  waterResistance: WaterResistance;
  activeConcentrations: ActiveConcentration[];
  useTime: UseTime;
  /** 品牌原文 */
  useFrequency: string;
  /** yes 时出处为 brand_claims_source_url */
  nonComedogenicClaim: YesNoUnknown;
  /** 品牌原文 */
  faceStepNote: string;
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
  /** 入库依据的类型（只决定能否入库，不参与打分）；没有分类时为 null */
  inclusionBasisType: InclusionBasisType | null;
  /** 入库依据待补（inclusion_basis 写 none、评价数也不足 1,000 条），或成分表待补（inci_list 为空）：照常导入，但不出现在推荐结果里 */
  inclusionPending?: boolean;
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
  /** 图片许可证链接和署名（开放授权图片必须展示） */
  imageLicenseUrl: string;
  imageAttribution: string;
  reviewedOn: string;
  /** 面部属性；parseProducts 总会填写（洗护产品为默认值） */
  face?: FaceAttributes;
  /** 零售商评分（data/retail_ratings.csv），只展示，不计分 */
  ratings: RetailRating[];
  /** 各平台购买链接（data/purchase_links.csv），按 RETAIL_PLATFORMS 的固定顺序 */
  purchaseLinks: PurchaseLink[];
  /** 配方版本待核对（data/formula_version_checks.csv）：卡片显示"配方版本待核对" */
  formulaVersionPending?: boolean;
}

/** data/formula_version_checks.csv：在售配方与成分表对应哪一版尚未核对的产品 */
export interface FormulaVersionCheck {
  productId: string;
  /** 目前只有 pending */
  status: string;
  note: string;
  addedOn: string;
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
/** 成分证据来自哪种使用方式的产品：both = 两种都有可靠证据 */
export const EVIDENCE_USAGES = ['leave_on', 'rinse_off', 'both'] as const;
export type EvidenceUsage = (typeof EVIDENCE_USAGES)[number];

/**
 * 各品类的默认使用方式。卸妆、去角质和面膜没有统一默认值，必须按单个产品填写：
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
  spot_treatment: 'leave_on',
  eye_cream: 'leave_on',
  face_oil: 'leave_on',
  mask: null,
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
  /** 中文名，中文界面显示；没有时显示英文名 */
  cityZh: string;
  country: string;
  /** 由该城市的水硬度记录汇总得出，见 summarizeHardness() */
  waterHardness: WaterHardness;
  water: WaterRecord[];
  reviewStatus: ReviewStatus;
}

/**
 * 入库依据类型（products.csv 的 inclusion_basis_type）。只决定产品能否入库，不参与打分：
 * retailer_bestseller = 零售商畅销榜 / 按畅销排序（Ulta、Sephora、Walgreens 等）；
 * department_store_bestseller = 百货 / 买手渠道畅销榜（Nordstrom、Neiman Marcus、Saks、Bergdorf Goodman、Bluemercury）；
 * beauty_award = 美容大奖（Allure Best of Beauty、Cosmopolitan、NewBeauty 等）；
 * review_count = 在美国主要零售商（REVIEW_COUNT_PLATFORMS）任一平台评价数达到 REVIEW_COUNT_MIN 条以上，
 * 由 retail_ratings.csv 自动生成（见 attachRetail），也可以在 products.csv 里直接填写。
 */
export const INCLUSION_BASIS_TYPES = ['retailer_bestseller', 'department_store_bestseller', 'beauty_award', 'review_count'] as const;
export type InclusionBasisType = (typeof INCLUSION_BASIS_TYPES)[number];
/** 评价数入库依据：认哪些零售商、至少多少条评价 */
export const REVIEW_COUNT_PLATFORMS = ['ulta', 'sephora', 'target', 'amazon', 'nordstrom', 'bluemercury', 'walmart', 'kohls'] as const;
export const REVIEW_COUNT_MIN = 1000;

/**
 * 零售平台，也是购买链接的固定显示顺序：品牌官网 → Ulta → Sephora → Target → Amazon →
 * 百货 / 买手渠道（Nordstrom → Neiman Marcus → Saks Fifth Avenue → Bergdorf Goodman → Bluemercury）→ Walmart → Kohl's；
 * 其他网站排在最后
 */
export const RETAIL_PLATFORMS = [
  'brand', 'ulta', 'sephora', 'target', 'amazon',
  'nordstrom', 'neiman_marcus', 'saks', 'bergdorf_goodman', 'bluemercury',
  'walmart', 'kohls',
] as const;
/** 各零售平台的网站域名（品牌官网除外），用于从链接判断平台 */
export const RETAIL_PLATFORM_DOMAINS: Record<Exclude<RetailPlatform, 'brand'>, string> = {
  ulta: 'ulta.com',
  sephora: 'sephora.com',
  target: 'target.com',
  amazon: 'amazon.com',
  nordstrom: 'nordstrom.com',
  neiman_marcus: 'neimanmarcus.com',
  saks: 'saksfifthavenue.com',
  bergdorf_goodman: 'bergdorfgoodman.com',
  bluemercury: 'bluemercury.com',
  walmart: 'walmart.com',
  kohls: 'kohls.com',
};
export type RetailPlatform = (typeof RETAIL_PLATFORMS)[number];

/** 一条零售商评分（data/retail_ratings.csv）。只展示，不计入任何分数 */
export interface RetailRating {
  productId: string;
  platform: RetailPlatform;
  /** 星级，0–5；留空或无法解析时为 NaN（页面不显示这条评分） */
  rating: number;
  /** 星级原文，用于校验区分"留空"（只提示）和"写错"（报错） */
  ratingRaw: string;
  /** 精确评价数；页面只显示缩写（如 5.5K）时为 null */
  ratingCount: number | null;
  /** 页面上显示的评价数原文 */
  ratingCountDisplay: string;
  /** 评价数的口径（Reviews / ratings / page header count 等） */
  countLabel: string;
  checkedOn: string;
  url: string;
  note: string;
}

/** 一条购买链接（data/purchase_links.csv） */
export interface PurchaseLink {
  productId: string;
  platform: RetailPlatform;
  url: string;
  /** in_stock / purchasable / listed / official_store_listed_pdp_blocked 等 */
  status: string;
  checkedOn: string;
  note: string;
}

