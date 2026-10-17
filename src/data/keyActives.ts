// 品牌主打成分（key_actives）与成分表的对应。
//
// key_actives 按品牌原文保存，可能带浓度（Pyrithione Zinc 1%）、复数（Ceramides）、
// 复配物或技术名称（Procapil 3% (complex)）。匹配规则：
// - 去掉浓度，括号内的内容单独作为一个候选词；
// - 与成分的 INCI 名、别名完全相同，或是 config 中登记的同义写法；
// - 复数写法（Ceramides）匹配以单数开头的成分（Ceramide NP、Ceramide AP……）；
// - 以 INCI 名结尾的写法也算（Keratin → Hydrolyzed Keratin）。
// 对应不上的主打成分只作为品牌宣称展示。

import { KEY_ACTIVE_SYNONYMS } from '../scoring/config';
import { normalizeName } from './ingredientIndex';
import type { Ingredient, Product } from './types';

export interface KeyActiveTerm {
  /** 规范化后的写法 */
  term: string;
  /** 原文是复数（以 s 结尾的英文词组），允许匹配以单数开头的成分 */
  plural: boolean;
}

export function keyActiveTerms(raw: string): KeyActiveTerm[] {
  const parts = [raw, ...[...raw.matchAll(/\(([^()]*)\)/g)].map((m) => m[1])];
  const out: KeyActiveTerm[] = [];
  for (const part of parts) {
    const base = normalizeName(part).replace(/\d+(\.\d+)?\s*%/g, '').replace(/\s+/g, ' ').trim();
    if (!base) continue;
    const variants = [base, ...(KEY_ACTIVE_SYNONYMS[base] ?? [])];
    for (const v of variants) if (!out.some((t) => t.term === v)) out.push({ term: v, plural: false });
    if (/[a-z]s$/.test(base)) out.push({ term: base.slice(0, -1), plural: true });
  }
  return out;
}

function nameMatches(name: string, t: KeyActiveTerm): boolean {
  if (name === t.term) return true;
  if (name.startsWith(t.term + ' ') && (t.plural || KEY_ACTIVE_SYNONYMS_VALUES.has(t.term))) return true;
  return name.endsWith(' ' + t.term);
}
const KEY_ACTIVE_SYNONYMS_VALUES = new Set(Object.values(KEY_ACTIVE_SYNONYMS).flat());

/** 成分表中的某个成分是否是产品宣称的主打成分 */
export function matchesKeyActive(raw: string, ingredient: Ingredient | null, terms: KeyActiveTerm[]): boolean {
  const names = [raw, ...(ingredient ? [ingredient.inciName, ...ingredient.aliases] : [])].map(normalizeName);
  return terms.some((t) => names.some((n) => nameMatches(n, t)));
}

/** 产品所有主打成分的匹配词；没有填写时为 null */
export function productKeyActiveTerms(product: Product): KeyActiveTerm[] | null {
  if (product.keyActives.length === 0 && product.keyActivesDisclosed) return null;
  return product.keyActives.flatMap(keyActiveTerms);
}

/** 对应不上成分表的主打成分（品牌写法），用于数据检查 */
export function unmatchedKeyActives(product: Product, lookup: (name: string) => Ingredient | undefined): string[] {
  return product.keyActives.filter((k) => {
    const terms = keyActiveTerms(k);
    return !product.inciList.some((raw) => matchesKeyActive(raw, lookup(raw) ?? null, terms));
  });
}
