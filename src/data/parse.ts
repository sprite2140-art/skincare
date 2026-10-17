// 把 CSV 文本解析成有类型的对象。只做格式转换；取值是否合法由 validate.ts 检查。

import Papa from 'papaparse';
import { cleanInciName } from './ingredientIndex';
import type {
  Award, BrandClaimStatus, ProductSubtype, City, WaterRecord, ReferenceWater, ClaimSource, CnAvailability, FragranceFreeClaim, TestedClaim, Conflict, ConflictSeverity, EvidenceLevel, ExchangeRate, Ingredient,
  IngredientCategory, Product, Region, ReviewStatus, RiskTag, Target, Transparency,
  UsageType, WaterHardness, Zone,
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
    riskTags: splitList(r.risk_tags) as RiskTag[],
    conflictsWith: parseConflicts(r.conflicts_with),
    explainZh: r.explain_zh ?? '',
    explainEn: r.explain_en ?? '',
    sources: splitList(r.sources),
    reviewStatus: r.review_status as ReviewStatus,
    reviewedOn: r.reviewed_on ?? '',
  }));
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
    reviewedOn: r.reviewed_on ?? '',
    };
  });
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
      country: r.country ?? '',
      // 旧格式的 cities.csv 直接写了 water_hardness，没有分区记录时沿用
      waterHardness: records.length > 0 ? summarizeHardness(records) : ((r.water_hardness || 'unknown') as WaterHardness),
      water: records,
      reviewStatus: r.review_status as ReviewStatus,
    };
  });
}
