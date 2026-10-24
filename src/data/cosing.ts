// 欧盟 CosIng 成分数据：作为成分的基础分类（登记功能），以及欧盟香料致敏原清单。
//
// - 原始文件：CosIng "Ingredients & Fragrance Inventory" 导出的 CSV，由 `npm run import-cosing -- <文件>` 转成
//   data/cosing_ingredients.csv（只保留 INCI 名、功能、CAS 号、CosIng 编号、更新日期）。
// - 合并规则（expandIngredients）：成分库 ingredients.csv 的条目优先；成分库没有的成分用 CosIng 补充，
//   来源标记为 cosing，review_status 一律为 draft（未核对）。
//   - 加香成分（category = risk，risk_tags = fragrance）只限以下情况，见 isFragrance()：
//     (a) 名称为 Parfum / Fragrance / Aroma / Flavor；(b) 在欧盟香料致敏原清单中；
//     (c) CosIng 登记的功能只有 perfuming 和 / 或 fragrance，没有其他功能；(d) 精油（成分库 risk_tags = essential_oil，单独列出）。
//     CosIng 给很多普通成分也登记了香料功能（如 Glycerin、Citric Acid、Caffeine），这些不算加香。
//   - 其他：category = base（基础分类，按现有规则不需要人工核对即可用于打分，但没有 targets，不影响需求匹配）。
// - 成分库已有的条目：在 CosIng 中能找到时，是否加香也按上面的规则判断（覆盖成分库原来的 fragrance 标签）；找不到时保留成分库的标签。
// - 欧盟香料致敏原清单（data/eu_fragrance_allergens.csv）上的成分都标注 euAllergen；
//   成分库和 CosIng 里都没有的，按清单补一个 draft 条目。

import { parseCsv, splitList } from './parse';
import { normalizeName, type InciAlias, type InciAliasType } from './ingredientIndex';
import type { Ingredient, ReviewStatus } from './types';

export interface CosingEntry {
  inciName: string;
  /** 小写，如 perfuming、skin conditioning - emollient */
  functions: string[];
  casNo: string;
  ref: string;
  updateDate: string;
}

export interface AllergenEntry {
  inciName: string;
  list: string;
  source: string;
}

export const COSING_SOURCE = 'https://ec.europa.eu/growth/tools-databases/cosing/';
/** 本项目 CosIng 数据的获取日期（见 docs/DATA_SCHEMA.md） */
export const COSING_RETRIEVED_ON = '2026-10-17';
export const PERFUMING = 'perfuming';
/** 香精的统称（规则 a） */
const FRAGRANCE_NAMES = new Set(['parfum', 'fragrance', 'aroma', 'flavor', 'flavour']);
/** CosIng 登记的香料类功能；只用于数据校验提示维护清单，不直接参与判断 */
const FRAGRANCE_FUNCTIONS = new Set(['perfuming', 'fragrance']);

/** CosIng 登记的功能只有香料类（perfuming / fragrance），没有其他功能。只用于校验时提示补充加香清单 */
export function onlyFragranceFunctions(functions: string[]): boolean {
  return functions.length > 0 && functions.every((f) => FRAGRANCE_FUNCTIONS.has(f));
}

/**
 * 是否算加香成分（规则 a–c；精油 d 由成分库的 essential_oil 标签单独处理）：
 * (a) 香精统称；(b) 欧盟香料致敏原清单；(c) 本项目维护的加香成分清单 data/fragrance_ingredients.csv。
 * 不读 CosIng 登记功能（原则：CosIng 功能只用于展示，判断一律用自己维护的清单）。
 */
export function isFragrance(names: string[], allergen: boolean, fragranceList: ReadonlySet<string>): boolean {
  if (names.some((n) => FRAGRANCE_NAMES.has(normalizeName(n)))) return true;
  if (allergen) return true;
  return names.some((n) => fragranceList.has(normalizeName(n)));
}

/** 本项目维护的成分清单（data/chelators.csv、data/fragrance_ingredients.csv）的一条 */
export interface ListEntry {
  inciName: string;
  /** 缩写或别名，如 GLDA */
  abbreviation: string;
  /** 来源级别：cir（CIR 安全评估）/ peer_reviewed（同行评议文献）/ cosing（CosIng 条目）；没有这一列的清单为空 */
  sourceLevel: string;
  sourceUrl: string;
}

export const SOURCE_LEVELS = ['cir', 'peer_reviewed', 'cosing'] as const;

export function parseIngredientList(text: string): ListEntry[] {
  return parseCsv(text).map((r) => ({
    inciName: r.inci_name ?? '',
    abbreviation: r.abbreviation ?? '',
    sourceLevel: r.source_level ?? '',
    sourceUrl: r.source_url ?? '',
  }));
}

/** 判断用的清单：螯合剂、加香成分 */
export interface IngredientLists {
  chelators?: ListEntry[];
  fragrances?: ListEntry[];
}

/** data/cosing_ingredients.csv（已转换的格式） */
export function parseCosingTable(text: string): CosingEntry[] {
  return parseCsv(text).map((r) => ({
    inciName: r.inci_name ?? '',
    functions: splitList(r.functions),
    casNo: r.cas_no ?? '',
    ref: r.cosing_ref ?? '',
    updateDate: r.update_date ?? '',
  })).filter((e) => e.inciName);
}

export function parseAllergens(text: string): AllergenEntry[] {
  return parseCsv(text).map((r) => ({ inciName: r.inci_name ?? '', list: r.list ?? '', source: r.source ?? '' })).filter((e) => e.inciName);
}

/** 解析一行 CSV（支持双引号转义），用于读取 CosIng 原始导出文件 */
function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * 读取 CosIng 原始导出文件。导出文件开头有几行说明，表头行包含 "INCI name" 和 "Function"；
 * 分隔符可能是逗号或分号；功能之间用逗号分隔，转成小写。
 */
export function parseCosingExport(text: string): CosingEntry[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /inci name/i.test(l) && /function/i.test(l));
  if (headerIdx === -1) throw new Error('没有找到 CosIng 表头（需要包含 "INCI name" 和 "Function" 列）');
  const headerLine = lines[headerIdx];
  const sep = (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const header = splitCsvLine(headerLine, sep).map((h) => h.toLowerCase());
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const iName = col(/^inci name/);
  const iFunc = col(/^function/);
  const iCas = col(/^cas/);
  const iRef = col(/ref/);
  const iDate = col(/update/);
  const out: CosingEntry[] = [];
  // 引号内可能有换行：把行拼回去直到引号成对
  let buffer = '';
  for (const line of lines.slice(headerIdx + 1)) {
    buffer = buffer ? `${buffer}\n${line}` : line;
    if ((buffer.match(/"/g)?.length ?? 0) % 2 === 1) continue;
    const cells = splitCsvLine(buffer, sep);
    buffer = '';
    const name = cells[iName]?.trim();
    if (!name) continue;
    out.push({
      inciName: name,
      functions: (cells[iFunc] ?? '').split(',').map((f) => f.trim().toLowerCase()).filter(Boolean),
      casNo: iCas >= 0 ? cells[iCas] ?? '' : '',
      ref: iRef >= 0 ? cells[iRef] ?? '' : '',
      updateDate: iDate >= 0 ? cells[iDate] ?? '' : '',
    });
  }
  return out;
}

/** 常见成分的通俗解释（data/ingredient_explanations.csv）：起草稿；核对后 review_status 为 verified */
export interface ExplanationEntry {
  inciName: string;
  explainZh: string;
  explainEn: string;
  reviewStatus: ReviewStatus;
  /** 起草日期 YYYY-MM-DD */
  draftedOn: string;
  /** 核对日期，verified 时必填 */
  reviewedOn: string;
}

export function parseExplanations(text: string): ExplanationEntry[] {
  return parseCsv(text).map((r) => ({
    inciName: r.inci_name ?? '',
    explainZh: r.explain_zh ?? '',
    explainEn: r.explain_en ?? '',
    reviewStatus: (r.review_status || 'draft') as ReviewStatus,
    draftedOn: r.drafted_on ?? '',
    reviewedOn: r.reviewed_on ?? '',
  }));
}

export function parseInciAliases(text: string): InciAlias[] {
  return parseCsv(text).map((r) => ({
    alias: r.alias ?? '',
    inci: r.inci ?? '',
    aliasType: (r.alias_type ?? '') as InciAliasType,
    sourceUrl: r.source_url ?? '',
  }));
}

/**
 * 成分库 + CosIng + 致敏原清单合并后的全部条目，用于建索引。
 * 只在 CosIng 中的成分：通俗解释取自 explanations（有的话），CosIng 登记功能另存在 cosingFunctions，页面单独翻译显示。
 */
export function expandIngredients(
  library: Ingredient[], cosing: CosingEntry[], allergens: AllergenEntry[], explanations: ExplanationEntry[] = [], lists: IngredientLists = {},
): Ingredient[] {
  const keys = (l: ListEntry[] = []) => new Set(l.flatMap((e) => [e.inciName, e.abbreviation]).filter(Boolean).map(normalizeName));
  const chelatorKeys = keys(lists.chelators);
  const fragranceKeys = keys(lists.fragrances);
  const isChelator = (names: string[]) => names.some((n) => chelatorKeys.has(normalizeName(n)));
  const isListedFragrance = (names: string[]) => names.some((n) => fragranceKeys.has(normalizeName(n)));
  const explained = new Map(explanations.map((e) => [normalizeName(e.inciName), e]));
  const known = new Map<string, Ingredient>();
  const allergenKeys = new Set(allergens.map((a) => normalizeName(a.inciName)));
  const isAllergen = (ing: Ingredient) => [ing.inciName, ...ing.aliases].some((n) => allergenKeys.has(normalizeName(n)));
  const cosingByName = new Map(cosing.map((c) => [normalizeName(c.inciName), c]));

  const out: Ingredient[] = library.map((ing) => {
    const c = cosingByName.get(normalizeName(ing.inciName));
    const allergen = isAllergen(ing);
    // 在 CosIng 中能找到的成分库条目也按规则 a–c 重新判断加香；找不到的保留成分库的标签
    const names = [ing.inciName, ...ing.aliases];
    const others = ing.riskTags.filter((t) => t !== 'fragrance');
    const fragrance = c ? isFragrance(names, allergen, fragranceKeys) : ing.riskTags.includes('fragrance') || allergen;
    const riskTags = fragrance ? [...others, 'fragrance' as const] : others;
    // 成分库条目没有写通俗解释时，用常见成分通俗解释表里的（是否核对按那张表）
    const listed = !ing.explainZh ? names.map((n) => explained.get(normalizeName(n))).find(Boolean) : undefined;
    const full: Ingredient = {
      ...ing, riskTags, origin: 'library', euAllergen: allergen, chelator: isChelator(names), fragranceListed: isListedFragrance(names),
      cosingFunctions: c?.functions,
      ...(listed ? { explainZh: listed.explainZh, explainEn: listed.explainEn, explainFromList: true, explainReviewed: listed.reviewStatus === 'verified' } : {}),
    };
    for (const n of [ing.inciName, ...ing.aliases]) known.set(normalizeName(n), full);
    return full;
  });

  for (const c of cosing) {
    const key = normalizeName(c.inciName);
    if (known.has(key)) continue;
    const allergen = allergenKeys.has(key);
    const fragrance = isFragrance([c.inciName], allergen, fragranceKeys);
    const ing: Ingredient = {
      inciName: c.inciName,
      nameZh: '',
      aliases: [],
      category: fragrance ? 'risk' : 'base',
      // CosIng 登记功能只放在 cosingFunctions 里展示，不作为本项目的 functions 参与打分
      functions: [],
      targets: [],
      effectiveRange: '',
      maxLimit: '',
      evidenceLevel: null,
      riskTags: fragrance ? ['fragrance'] : [],
      conflictsWith: [],
      explainZh: explained.get(key)?.explainZh ?? '',
      explainEn: explained.get(key)?.explainEn ?? '',
      explainReviewed: explained.get(key)?.reviewStatus === 'verified',
      sources: [COSING_SOURCE],
      reviewStatus: 'draft',
      reviewedOn: '',
      origin: 'cosing',
      euAllergen: allergen,
      chelator: isChelator([c.inciName]),
      fragranceListed: isListedFragrance([c.inciName]),
      cosingFunctions: c.functions,
    };
    known.set(key, ing);
    out.push(ing);
  }

  for (const a of allergens) {
    const key = normalizeName(a.inciName);
    if (known.has(key)) continue;
    const ing: Ingredient = {
      inciName: a.inciName, nameZh: '', aliases: [], category: 'risk', functions: ['perfuming'], targets: [], effectiveRange: '',
      maxLimit: '', evidenceLevel: null, riskTags: ['fragrance'], conflictsWith: [],
      explainZh: '', explainEn: '', // 页面按 euAllergen 单独说明
      sources: [a.source], reviewStatus: 'draft', reviewedOn: '', origin: 'eu_allergen_list', euAllergen: true,
    };
    known.set(key, ing);
    out.push(ing);
  }
  return out;
}
