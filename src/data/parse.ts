// 把 CSV 文本解析成有类型的对象。只做格式转换；取值是否合法由 validate.ts 检查。

import Papa from 'papaparse';
import type {
  City, CnAvailability, Conflict, ConflictSeverity, EvidenceLevel, ExchangeRate, Ingredient,
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

function parsePrice(value: string | undefined): number | null {
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

export function parseProducts(text: string): Product[] {
  return parseCsv(text).map((r) => ({
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
    inciList: splitList(r.inci_list),
    price: parsePrice(r.price),
    currency: r.currency ?? '',
    availableInCn: (r.available_in_cn || 'unknown') as CnAvailability,
    transparency: r.transparency as Transparency,
    sourceUrl: r.source_url ?? '',
    reviewedOn: r.reviewed_on ?? '',
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

export function parseCities(text: string): City[] {
  return parseCsv(text).map((r) => ({
    city: r.city ?? '',
    country: r.country ?? '',
    waterHardness: (r.water_hardness || 'unknown') as WaterHardness,
    source: r.source ?? '',
    reviewStatus: r.review_status as ReviewStatus,
  }));
}
