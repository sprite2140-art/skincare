// 把 CSV 文本解析成有类型的对象。只做格式转换；取值是否合法由 validate.ts 检查。

import Papa from 'papaparse';
import { cleanInciName } from './ingredientIndex';
import { RETAIL_PLATFORMS } from './types';
import type {
  PregnancyNote, UsRegulatoryStatus, ActiveConcentration, FaceAttributes, SkinTypeClaim, Texture, UseTime, WaterResistance, YesNoUnknown,
  FormulaVersionCheck, InclusionBasisType, PurchaseLink, RetailPlatform, RetailRating, Award, BrandClaimStatus, ProductSubtype, City, WaterRecord, ReferenceWater, ClaimSource, CnAvailability, FragranceFreeClaim, TestedClaim, Conflict, ConflictSeverity, EvidenceLevel, ExchangeRate, Ingredient,
  IngredientCategory, Product, Region, ReviewStatus, RiskTag, Target, Transparency,
  EvidenceUsage, UsageType, WaterHardness, Zone,
} from './types';

export type Row = Record<string, string>;

export function parseCsv(text: string): Row[] {
  const result = Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });
  if (result.errors.length > 0) {
    const e = result.errors[0];
    throw new Error(`CSV 解析失败（第 ${e.row} 行）：${e.message}`);
  }
  return result.data;
}

/** 分号分隔的多值字段 */
export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
}

/** conflicts_with：`Retinol` 或 `Retinol:severe`，未写严重程度时视为 mild */
export function parseConflicts(value: string | undefined): Conflict[] {
  return splitList(value).map((entry) => {
    const idx = entry.lastIndexOf(':');
    if (idx === -1) return { inci: entry, severity: 'mild' as ConflictSeverity };
    return {
      inci: entry.slice(0, idx).trim(),
      severity: entry.slice(idx + 1).trim() as ConflictSeverity,
    };
  });
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseIngredients(text: string): Ingredient[] {
  return parseCsv(text).map((r) => ({
    inciName: r.inci_name ?? '',
    nameZh: r.name_zh ?? '',
    aliases: splitList(r.aliases),
    category: r.category as IngredientCategory,
    functions: splitList(r.functions),
    targets: splitList(r.targets) as Target[],
    effectiveRange: r.effective_range ?? '',
    maxLimit: r.max_limit ?? '',
    evidenceLevel: (r.evidence_level || null) as EvidenceLevel | null,
    // pregnancy_note = avoid 的成分自动带 pregnancy_caution 标签（孕期排除 + 对所有人的被动提示，与洗护一致）；caution 只在护肤中提示
    riskTags: [...new Set([...splitList(r.risk_tags), ...(r.pregnancy_note === 'avoid' ? ['pregnancy_caution'] : [])])] as RiskTag[],
    conflictsWith: parseConflicts(r.conflicts_with),
    explainZh: r.explain_zh ?? '',
    explainEn: r.explain_en ?? '',
    sources: splitList(r.sources),
    reviewStatus: r.review_status as ReviewStatus,
    reviewedOn: r.reviewed_on ?? '',
    evidenceByTarget: parseEvidenceByTarget(r.evidence_by_target),
    evidenceUsage: (r.evidence_usage || null) as EvidenceUsage | null,
    notes: r.notes ?? '',
    usRegulatoryStatus: (r.us_regulatory_status || null) as UsRegulatoryStatus | null,
    pregnancyNote: (r.pregnancy_note || null) as PregnancyNote | null,
    photosensitizing: (r.photosensitizing || null) as YesNoUnknown | null,
  }));
}

/** evidence_by_target：`dandruff:A;scalp_oil:C`。取值是否合法由 validate.ts 检查 */
export function parseEvidenceByTarget(value: string | undefined): Partial<Record<Target, EvidenceLevel>> {
  const out: Partial<Record<Target, EvidenceLevel>> = {};
  for (const entry of splitList(value)) {
    const idx = entry.lastIndexOf(':');
    if (idx === -1) out[entry as Target] = '' as EvidenceLevel;
    else out[entry.slice(0, idx).trim() as Target] = entry.slice(idx + 1).trim().toUpperCase() as EvidenceLevel;
  }
  return out;
}

/** 统一产品成分表写法，并记下带 [待核对] 标记的成分 */
export function parseInciList(value: string | undefined): { names: string[]; unverified: string[] } {
  const cleaned = splitList(value).map(cleanInciName).filter((c) => c.name.length > 0);
  return {
    names: cleaned.map((c) => c.name),
    unverified: cleaned.filter((c) => c.nameUnverified).map((c) => c.name),
  };
}

/** awards：`来源|年份|名称|链接`，多项用分号分隔 */
export function parseAwards(value: string | undefined): Award[] {
  return splitList(value).map((entry) => {
    const [source = '', year = '', title = '', url = ''] = entry.split('|').map((s) => s.trim());
    return { source, year, title, url };
  });
}

/** tested_claims：`困扰|测试说明|年份|链接`，多项用分号分隔 */
export function parseTestedClaims(value: string | undefined): TestedClaim[] {
  return splitList(value).map((entry) => {
    const [target = '', description = '', year = '', url = ''] = entry.split('|').map((s) => s.trim());
    return { target: target as Target, description, year, url };
  });
}

const NOT_DISCLOSED = 'not separately disclosed';

/** active_concentrations：`INCI|浓度|链接`，多项用分号分隔 */
export function parseActiveConcentrations(value: string | undefined): ActiveConcentration[] {
  return splitList(value).map((entry) => {
    const [inci = '', concentration = '', url = ''] = entry.split('|').map((s) => s.trim());
    return { inci, concentration, url };
  });
}

/** 面部属性的 10 列；旧数据没有这些列或为空时取默认值 */
export function parseFaceAttributes(r: Row): FaceAttributes {
  return {
    skinTypeClaim: splitList(r.skin_type_claim).map((s) => s.toLowerCase()) as SkinTypeClaim[],
    texture: (r.texture?.toLowerCase() || null) as Texture | null,
    spf: r.spf ? Number(r.spf) : null,
    broadSpectrum: (r.broad_spectrum?.toLowerCase() || 'unknown') as YesNoUnknown,
    waterResistance: (r.water_resistance?.toLowerCase() || 'unknown') as WaterResistance,
    activeConcentrations: parseActiveConcentrations(r.active_concentrations),
    useTime: (r.use_time?.toLowerCase() || 'unknown') as UseTime,
    useFrequency: r.use_frequency ?? '',
    nonComedogenicClaim: (r.non_comedogenic_claim?.toLowerCase() || 'unknown') as YesNoUnknown,
    faceStepNote: r.face_step_note ?? '',
  };
}

/** 平台的其他写法 → 统一取值（数据模板里可能不带下划线或用简称） */
const PLATFORM_ALIASES: Record<string, RetailPlatform> = {
  neimanmarcus: 'neiman_marcus',
  bergdorf: 'bergdorf_goodman',
  bergdorfgoodman: 'bergdorf_goodman',
  saksfifthavenue: 'saks',
};
export const normalizePlatform = (value: string | undefined): RetailPlatform => {
  const v = (value ?? '').trim().toLowerCase();
  return PLATFORM_ALIASES[v] ?? (v as RetailPlatform);
};

export function parseProducts(text: string): Product[] {
  return parseCsv(text).map((r) => {
    const inci = parseInciList(r.inci_list);
    return {
    productId: r.product_id ?? '',
    brand: r.brand ?? '',
    nameEn: r.name_en ?? '',
    nameZh: r.name_zh ?? '',
    zone: r.zone as Zone,
    category: r.category ?? '',
    usageType: (r.usage_type || null) as UsageType | null,
    subtype: (r.subtype || null) as ProductSubtype | null,
    region: r.region as Region,
    formulaNote: r.formula_note ?? '',
    channels: splitList(r.channels),
    inclusionBasis: r.inclusion_basis ?? '',
    inclusionBasisType: (r.inclusion_basis_type || null) as InclusionBasisType | null,
    awards: parseAwards(r.awards),
    claimedBenefits: splitList(r.claimed_benefits) as Target[],
    claimSource: (r.claim_source || null) as ClaimSource | null,
    brandClaims: {
      text: r.brand_claims ?? '',
      quote: r.brand_claims_quote ?? '',
      sourceUrl: r.brand_claims_source_url ?? '',
      targets: splitList(r.brand_claim_targets) as Target[],
      status: (r.brand_claims_status || null) as BrandClaimStatus | null,
    },
    testedClaims: parseTestedClaims(r.tested_claims),
    fragranceFreeClaim: (r.fragrance_free_claim || 'unknown') as FragranceFreeClaim,
    fragranceFreeSourceUrl: r.fragrance_free_source_url ?? '',
    inciList: inci.names,
    inciNameUnverified: inci.unverified,
    keyActives: (r.key_actives ?? '').trim().toLowerCase() === NOT_DISCLOSED ? [] : splitList(r.key_actives),
    keyActivesDisclosed: (r.key_actives ?? '').trim().toLowerCase() !== NOT_DISCLOSED,
    inciListOriginal: r.inci_list_original ?? '',
    price: parseNumber(r.price),
    currency: r.currency ?? '',
    sizeMl: parseNumber(r.size_ml),
    availableInCn: (r.available_in_cn || 'unknown') as CnAvailability,
    transparency: r.transparency as Transparency,
    sourceUrls: splitList(r.source_url),
    purchaseUrl: r.purchase_url ?? '',
    pairedProductIds: splitList(r.paired_product_ids),
    imageUrl: r.image_url ?? '',
    imageSource: r.image_source ?? '',
    imageLicense: r.image_license ?? '',
    imageLicenseUrl: r.image_license_url ?? '',
    imageAttribution: r.image_attribution ?? '',
    ratings: [],
    purchaseLinks: [],
    reviewedOn: r.reviewed_on ?? '',
    face: parseFaceAttributes(r),
    };
  });
}

export function parseRetailRatings(text: string): RetailRating[] {
  return parseCsv(text).map((r) => ({
    productId: r.product_id ?? '',
    platform: normalizePlatform(r.platform),
    // 星级留空时为 NaN（页面不显示这条评分），不当作 0 星
    rating: r.rating?.trim() ? Number(r.rating) : NaN,
    ratingRaw: (r.rating ?? '').trim(),
    ratingCount: parseNumber(r.rating_count),
    ratingCountDisplay: r.rating_count_display ?? '',
    countLabel: r.count_label ?? '',
    checkedOn: r.checked_on ?? '',
    url: r.url ?? '',
    note: r.note ?? '',
  }));
}

export function parsePurchaseLinks(text: string): PurchaseLink[] {
  return parseCsv(text).map((r) => ({
    productId: r.product_id ?? '',
    platform: normalizePlatform(r.platform),
    url: r.url ?? '',
    status: r.status ?? '',
    checkedOn: r.checked_on ?? '',
    note: r.note ?? '',
  }));
}

export function parseFormulaVersionChecks(text: string): FormulaVersionCheck[] {
  return parseCsv(text).map((r) => ({
    productId: r.product_id ?? '',
    status: r.status ?? '',
    note: r.note ?? '',
    addedOn: r.added_on ?? '',
  }));
}

/** 把评分、购买链接和配方版本核对状态挂到产品上；购买链接按 RETAIL_PLATFORMS 的固定顺序 */
export function attachRetail(products: Product[], ratings: RetailRating[], links: PurchaseLink[], checks: FormulaVersionCheck[] = []): Product[] {
  const order = (p: RetailPlatform) => RETAIL_PLATFORMS.indexOf(p);
  const pending = new Set(checks.filter((c) => c.status === 'pending').map((c) => c.productId));
  return products.map((p) => ({
    ...p,
    formulaVersionPending: pending.has(p.productId),
    ratings: ratings.filter((r) => r.productId === p.productId).sort((a, b) => order(a.platform) - order(b.platform)),
    purchaseLinks: links.filter((l) => l.productId === p.productId).sort((a, b) => order(a.platform) - order(b.platform)),
  }));
}

export function parseExchangeRates(text: string): ExchangeRate[] {
  return parseCsv(text).map((r) => ({
    currency: r.currency ?? '',
    perUsd: Number(r.per_usd),
    dataDate: r.data_date ?? '',
    source: r.source ?? '',
  }));
}

const num = (v: string | undefined) => (v && Number.isFinite(Number(v)) ? Number(v) : null);

export function parseWaterRecords(text: string): WaterRecord[] {
  return parseCsv(text).map((r) => ({
    city: r.city ?? '',
    country: r.country ?? '',
    regionId: r.region_id ?? '',
    // 旧记录的 geographic_scope 只是分类代码（如 named_utility_or_supply_system_only），这时用 region_name 的供水系统说明
    scope: /^[a-z0-9_]+$/.test(r.geographic_scope ?? '') ? r.region_name ?? '' : r.geographic_scope ?? '',
    statisticType: r.statistic_type ?? '',
    value: num(r.hardness_value_mg_L_CaCO3),
    min: num(r.reported_range_min_mg_L_CaCO3),
    max: num(r.reported_range_max_mg_L_CaCO3),
    hardnessClass: r.hardness_class || 'unknown',
    period: r.sample_period ?? '',
    confidence: r.confidence_for_household_tap ?? '',
    note: r.formula_note ?? '',
    sources: splitList(r.source_url),
    retrievedOn: r.retrieved_on ?? '',
  }));
}

/** 原始分级 → 页面用的等级；跨两级的记为 null（按"不同"处理） */
const CLASS_MAP: Record<string, WaterHardness | null> = {
  soft: 'soft',
  moderately_hard: 'moderate',
  hard: 'hard',
  very_hard: 'very_hard',
  hard_or_very_hard: 'hard',
  moderately_hard_or_hard: null,
};

/**
 * 汇总一个城市的水硬度：所有有分级的记录等级相同时取该等级；都属于硬或很硬时取"硬"（全部很硬时取"很硬"）；
 * 其他不一致的情况（例如不同水厂一软一硬，或单条记录本身跨两级）记为 varies；没有分级记录为 unknown。
 * 不按记录平均，也不以第一条代表全市。
 */
export function summarizeHardness(records: WaterRecord[]): WaterHardness {
  const known = records.filter((r) => r.hardnessClass !== 'unknown');
  if (known.length === 0) return 'unknown';
  const classes = known.map((r) => CLASS_MAP[r.hardnessClass] ?? null);
  if (classes.some((c) => c === null)) return 'varies';
  const set = new Set(classes);
  if (set.size === 1) return classes[0]!;
  if ([...set].every((c) => c === 'hard' || c === 'very_hard')) return 'hard';
  return 'varies';
}

export function parseReferenceWater(text: string): ReferenceWater[] {
  return parseCsv(text).map((r) => ({
    city: r.city ?? '',
    cityZh: r.city_zh ?? '',
    country: r.country ?? '',
    supplier: r.water_supplier ?? '',
    value: num(r.hardness_value_mg_L_CaCO3),
    minText: r.range_min_mg_L_CaCO3 ?? '',
    maxText: r.range_max_mg_L_CaCO3 ?? '',
    period: r.data_period ?? '',
    year: r.data_year ?? '',
    scope: r.supply_scope ?? '',
    statisticType: r.statistic_type ?? '',
    sources: splitList(r.source_url),
    note: r.notes ?? '',
    retrievedOn: r.retrieved_on ?? '',
  }));
}

export function parseCities(text: string, water: WaterRecord[] = []): City[] {
  return parseCsv(text).map((r) => {
    const records = water.filter((w) => w.city === r.city && w.country === r.country);
    return {
      city: r.city ?? '',
      cityZh: r.city_zh ?? '',
      country: r.country ?? '',
      // 旧格式的 cities.csv 直接写了 water_hardness，没有分区记录时沿用
      waterHardness: records.length > 0 ? summarizeHardness(records) : ((r.water_hardness || 'unknown') as WaterHardness),
      water: records,
      reviewStatus: r.review_status as ReviewStatus,
    };
  });
}
