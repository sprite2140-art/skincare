// 推荐列表为空或太少时，说明真实原因（2026-11-03 上线审计：不能一律归因于预算）。
// 按每款产品没有进入推荐的原因计数：只因超出预算被排除的单独计（这些可以用"看看稍高预算的选择"看到），
// 其他排除按第一条排除原因归类；没有被排除、但需求匹配为 0 的计为"没有针对所选需求的依据"。

import type { ProductScore } from './score';
import type { Text } from './labels';

export type ShortfallReason = 'overBudget' | 'avoid' | 'special' | 'conflict' | 'standard' | 'incomplete' | 'lowMatch' | 'unscored' | 'other';

const CODE_REASON: Record<string, ShortfallReason> = {
  over_budget: 'overBudget',
  avoid_ingredient: 'avoid',
  avoid_tag: 'avoid',
  special_status: 'special',
  rx_actives: 'special',
  severe_conflict: 'conflict',
  sunscreen_standard: 'standard',
};

/** 一款产品没有进入推荐的原因；能推荐时为 null */
export function shortfallReason(r: ProductScore & { faceExtras?: { sunscreen: string | null } }): ShortfallReason | null {
  if (r.excluded) {
    const codes = r.exclusions.map((e) => e.code);
    if (codes.every((c) => c === 'over_budget')) return 'overBudget';
    const first = codes.find((c) => c !== 'over_budget')!;
    return CODE_REASON[first] ?? 'other';
  }
  if (r.score === null) return 'unscored';
  if (r.faceExtras?.sunscreen === 'incomplete') return 'incomplete';
  if (r.lowMatch) return 'lowMatch';
  return null;
}

/** 各原因的款数，按款数从多到少；没有的不列 */
export function shortfallCounts(ranked: ProductScore[]): { reason: ShortfallReason; n: number }[] {
  const counts = new Map<ShortfallReason, number>();
  for (const r of ranked) {
    const reason = shortfallReason(r);
    if (reason) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n);
}

/** 推荐少于这个数时提示"这个预算内选择较少" */
export const FEW_OPTIONS = 3;

export const SHORTFALL_TEXT: Record<ShortfallReason, Text> = {
  overBudget: { zh: '{n} 款超出你的预算', en: '{n} over your budget' },
  avoid: { zh: '{n} 款含你要避开的成分', en: '{n} contain ingredients you want to avoid' },
  special: { zh: '{n} 款因你的特殊状态（如怀孕、在用处方药）不推荐', en: '{n} not recommended for your situation (e.g. pregnancy, prescription treatment)' },
  conflict: { zh: '{n} 款与你在用的产品有严重冲突', en: '{n} clash with a product you already use' },
  standard: { zh: '{n} 款防晒不符合 SPF 30 以上、广谱的建议', en: '{n} sunscreens below SPF 30 or not broad spectrum' },
  incomplete: { zh: '{n} 款防晒信息不全', en: '{n} sunscreens with incomplete information' },
  lowMatch: { zh: '{n} 款没有针对你所选需求的依据', en: '{n} have nothing supporting the needs you chose' },
  unscored: { zh: '{n} 款成分数据不足，无法评分', en: '{n} lack ingredient data to score' },
  other: { zh: '{n} 款因其他原因不推荐', en: '{n} excluded for other reasons' },
};
