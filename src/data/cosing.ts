// 欧盟 CosIng 成分数据：作为成分的基础分类（登记功能），以及欧盟香料致敏原清单。
//
// - 原始文件：CosIng "Ingredients & Fragrance Inventory" 导出的 CSV，由 `npm run import-cosing -- <文件>` 转成
//   data/cosing_ingredients.csv（只保留 INCI 名、功能、CAS 号、CosIng 编号、更新日期）。
// - 合并规则（expandIngredients）：成分库 ingredients.csv 的条目优先；成分库没有的成分用 CosIng 补充，
//   来源标记为 cosing，review_status 一律为 draft（未核对）。
//   - 功能含 perfuming（香料）的：category = risk，risk_tags = fragrance，视为加香成分；
//   - 其他：category = base（基础分类，按现有规则不需要人工核对即可用于打分，但没有 targets，不影响需求匹配）。
// - 欧盟香料致敏原清单（data/eu_fragrance_allergens.csv）上的成分都标注 euAllergen，并视为加香成分；
//   成分库和 CosIng 里都没有的，按清单补一个 draft 条目。

import { parseCsv, splitList } from './parse';
import { normalizeName } from './ingredientIndex';
import type { Ingredient } from './types';

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
export const PERFUMING = 'perfuming';

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

function functionsText(fns: string[]) {
  return fns.join('、');
}

/** 成分库 + CosIng + 致敏原清单合并后的全部条目，用于建索引 */
export function expandIngredients(library: Ingredient[], cosing: CosingEntry[], allergens: AllergenEntry[]): Ingredient[] {
  const known = new Map<string, Ingredient>();
  const allergenKeys = new Set(allergens.map((a) => normalizeName(a.inciName)));
  const isAllergen = (ing: Ingredient) => [ing.inciName, ...ing.aliases].some((n) => allergenKeys.has(normalizeName(n)));
  const cosingByName = new Map(cosing.map((c) => [normalizeName(c.inciName), c]));

  const out: Ingredient[] = library.map((ing) => {
    const c = cosingByName.get(normalizeName(ing.inciName));
    const allergen = isAllergen(ing);
    // 成分库条目同样适用：CosIng 登记功能含香料，或在致敏原清单上，都识别为加香成分
    const perfuming = !!c?.functions.some((f) => f.includes(PERFUMING));
    const riskTags = (perfuming || allergen) && !ing.riskTags.includes('fragrance') ? [...ing.riskTags, 'fragrance' as const] : ing.riskTags;
    const full: Ingredient = { ...ing, riskTags, origin: 'library', euAllergen: allergen, cosingFunctions: c?.functions };
    for (const n of [ing.inciName, ...ing.aliases]) known.set(normalizeName(n), full);
    return full;
  });

  for (const c of cosing) {
    const key = normalizeName(c.inciName);
    if (known.has(key)) continue;
    const perfuming = c.functions.some((f) => f.includes(PERFUMING));
    const allergen = allergenKeys.has(key);
    const fragrance = perfuming || allergen;
    const ing: Ingredient = {
      inciName: c.inciName,
      nameZh: '',
      aliases: [],
      category: fragrance ? 'risk' : 'base',
      functions: c.functions,
      targets: [],
      effectiveRange: '',
      maxLimit: '',
      evidenceLevel: null,
      riskTags: fragrance ? ['fragrance'] : [],
      conflictsWith: [],
      explainZh: `CosIng 登记功能：${functionsText(c.functions) || '未登记'}${allergen ? '；欧盟需标注的香料致敏原' : ''}。`,
      explainEn: `CosIng functions: ${c.functions.join(', ') || 'none listed'}${allergen ? '; an EU labelled fragrance allergen' : ''}.`,
      sources: [COSING_SOURCE],
      reviewStatus: 'draft',
      reviewedOn: '',
      origin: 'cosing',
      euAllergen: allergen,
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
      explainZh: '欧盟需标注的香料致敏原，敏感人群可能过敏。', explainEn: 'An EU labelled fragrance allergen; may cause allergy in sensitive people.',
      sources: [a.source], reviewStatus: 'draft', reviewedOn: '', origin: 'eu_allergen_list', euAllergen: true,
    };
    known.set(key, ing);
    out.push(ing);
  }
  return out;
}
