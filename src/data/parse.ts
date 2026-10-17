// 把 CSV 文本解析成有类型的对象。只做格式转换；取值是否合法由 validate.ts 检查。

import Papa from 'papaparse';
import { cleanInciName } from './ingredientIndex';
import type {
  Award, City, ClaimSource, CnAvailability, FragranceFreeClaim, TestedClaim, Conflict, ConflictSeverity, EvidenceLevel, ExchangeRate, Ingredient,
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
    region: r.region as Region,
    formulaNote: r.formula_note ?? '',
    channels: splitList(r.channels),
    inclusionBasis: r.inclusion_basis ?? '',
    awards: parseAwards(r.awards),
    claimedBenefits: splitList(r.claimed_benefits) as Target[],
    claimSource: (r.claim_source || null) as ClaimSource | null,
    testedClaims: parseTestedClaims(r.tested_claims),
    fragranceFreeClaim: (r.fragrance_free_claim || 'unknown') as FragranceFreeClaim,
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

export function parseCities(text: string): City[] {
  return parseCsv(text).map((r) => ({
    city: r.city ?? '',
    country: r.country ?? '',
    waterHardness: (r.water_hardness || 'unknown') as WaterHardness,
    hardnessMgL: r.hardness_mg_l ?? '',
    dataPeriod: r.data_period ?? '',
    supplyScope: r.supply_scope ?? '',
    confidence: r.confidence ?? '',
    source: r.source ?? '',
    retrievedOn: r.retrieved_on ?? '',
    reviewStatus: r.review_status as ReviewStatus,
  }));
}
