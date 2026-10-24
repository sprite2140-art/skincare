// 成分对某个需求的证据等级（A / B / C），定义见 docs/SCORING.md "证据等级"。

import type { EvidenceLevel, Ingredient, Product, Target, UsageType } from '../data/types';
import { normalizeName } from '../data/ingredientIndex';

const DOWNGRADE: Record<EvidenceLevel, EvidenceLevel> = { A: 'B', B: 'C', C: 'C' };

export interface TargetEvidence {
  level: EvidenceLevel;
  /** 证据来自另一种使用方式的产品（如免洗液），已降一级 */
  downgraded: boolean;
  /** 产品浓度低于证据对应的浓度（或没有公开），已降一级 */
  concentrationDowngraded?: boolean;
}

/** 产品公开的某成分浓度（%）：active_concentrations 或主打成分写法里的百分比；没有公开时为 null */
export function disclosedPercent(product: Pick<Product, 'face' | 'keyActives'> | undefined, ing: Ingredient): number | null {
  if (!product) return null;
  const names = new Set([ing.inciName, ...ing.aliases].map(normalizeName));
  const pct = (s: string) => {
    const m = /(\d+(?:\.\d+)?)\s*%/.exec(s);
    return m ? Number(m[1]) : null;
  };
  for (const a of product.face?.activeConcentrations ?? []) if (names.has(normalizeName(a.inci))) return pct(a.concentration);
  for (const k of product.keyActives) {
    const name = normalizeName(k.replace(/\d+(\.\d+)?\s*%/g, '').trim());
    if (names.has(name)) return pct(k);
  }
  return null;
}

/**
 * 按需求读取证据等级：成分填了 evidence_by_target 时只看对应需求的等级（没写的需求为 null，按"暂无证据"计）；
 * 整列为空的旧条目沿用 evidence_level。证据的使用方式（evidence_usage）与产品不同时降一级，C 级不再降；
 * both（免洗、冲洗都有证据）和留空不降。
 */
export function evidenceFor(ing: Ingredient, target: Target, usage: UsageType | null, product?: Pick<Product, 'face' | 'keyActives'>): TargetEvidence | null {
  const byTarget = ing.evidenceByTarget ?? {};
  const raw = Object.keys(byTarget).length > 0 ? byTarget[target] ?? null : ing.evidenceLevel;
  // unknown：查证过但没有可评级的证据，与"暂无证据"相同
  if (!raw || raw === 'unknown') return null;
  let level: EvidenceLevel = raw;
  let downgraded = false;
  if (ing.evidenceUsage && ing.evidenceUsage !== 'both' && usage && usage !== ing.evidenceUsage) {
    downgraded = DOWNGRADE[level] !== level;
    level = DOWNGRADE[level];
  }
  // 证据对应特定浓度（如 15% 处方凝胶）：产品浓度更低或没有公开时降一级
  let concentrationDowngraded = false;
  if (ing.evidenceMinConcentration != null) {
    const pct = disclosedPercent(product, ing);
    if (pct === null || pct < ing.evidenceMinConcentration) {
      concentrationDowngraded = DOWNGRADE[level] !== level;
      level = DOWNGRADE[level];
    }
  }
  return ing.evidenceMinConcentration != null ? { level, downgraded, concentrationDowngraded } : { level, downgraded };
}

/** 各需求等级中最高的一个，即 evidence_level 应填的值 */
export function highestLevel(byTarget: Partial<Record<Target, EvidenceLevel | 'unknown'>>): EvidenceLevel | null {
  const levels = Object.values(byTarget).filter((l): l is EvidenceLevel => !!l && l !== 'unknown');
  return (['A', 'B', 'C'] as const).find((l) => levels.includes(l)) ?? null;
}
