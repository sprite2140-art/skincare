// 成分对某个需求的证据等级（A / B / C），定义见 docs/SCORING.md "证据等级"。

import type { EvidenceLevel, Ingredient, Target, UsageType } from '../data/types';

const DOWNGRADE: Record<EvidenceLevel, EvidenceLevel> = { A: 'B', B: 'C', C: 'C' };

export interface TargetEvidence {
  level: EvidenceLevel;
  /** 证据来自另一种使用方式的产品（如免洗液），已降一级 */
  downgraded: boolean;
}

/**
 * 按需求读取证据等级：成分填了 evidence_by_target 时只看对应需求的等级（没写的需求为 null，按"暂无证据"计）；
 * 整列为空的旧条目沿用 evidence_level。证据的使用方式（evidence_usage）与产品不同时降一级，C 级不再降；
 * both（免洗、冲洗都有证据）和留空不降。
 */
export function evidenceFor(ing: Ingredient, target: Target, usage: UsageType | null): TargetEvidence | null {
  const byTarget = ing.evidenceByTarget ?? {};
  const level = Object.keys(byTarget).length > 0 ? byTarget[target] ?? null : ing.evidenceLevel;
  if (!level) return null;
  if (ing.evidenceUsage && ing.evidenceUsage !== 'both' && usage && usage !== ing.evidenceUsage) {
    return { level: DOWNGRADE[level], downgraded: DOWNGRADE[level] !== level };
  }
  return { level, downgraded: false };
}

/** 各需求等级中最高的一个，即 evidence_level 应填的值 */
export function highestLevel(byTarget: Partial<Record<Target, EvidenceLevel>>): EvidenceLevel | null {
  const levels = Object.values(byTarget).filter((l): l is EvidenceLevel => !!l);
  return (['A', 'B', 'C'] as const).find((l) => levels.includes(l)) ?? null;
}
