import { describe, expect, it } from 'vitest';
import { nextBudgetChoice } from './budget';
import { shortfallCounts, shortfallReason } from './shortfall';
import type { ProductScore } from './score';

const caps = { q1: 10, q2: 20, q3: 35, sampleSize: 40 };
const r = (over: Partial<ProductScore>): ProductScore =>
  ({ excluded: false, exclusions: [], score: 50, lowMatch: false, ...over }) as unknown as ProductScore;

describe('推荐为空或太少时的原因', () => {
  it('只因超出预算被排除的单独计；还有其他排除时按其他原因', () => {
    expect(shortfallReason(r({ excluded: true, exclusions: [{ code: 'over_budget' }] as never }))).toBe('overBudget');
    expect(shortfallReason(r({ excluded: true, exclusions: [{ code: 'over_budget' }, { code: 'avoid_ingredient' }] as never }))).toBe('avoid');
    expect(shortfallReason(r({ lowMatch: true }))).toBe('lowMatch');
    expect(shortfallReason(r({ score: null }))).toBe('unscored');
    expect(shortfallReason(r({}))).toBeNull();
  });

  it('按款数从多到少列出', () => {
    const counts = shortfallCounts([
      r({ lowMatch: true }), r({ excluded: true, exclusions: [{ code: 'over_budget' }] as never }),
      r({ excluded: true, exclusions: [{ code: 'over_budget' }] as never }), r({}),
    ]);
    expect(counts).toEqual([{ reason: 'overBudget', n: 2 }, { reason: 'lowMatch', n: 1 }]);
  });
});

describe('高一档预算', () => {
  it('q1 → q2 → q3 → 不限；不限时没有更高一档', () => {
    expect(nextBudgetChoice('q1', caps)).toBe('q2');
    expect(nextBudgetChoice('q3', caps)).toBe('none');
    expect(nextBudgetChoice('none', caps)).toBeNull();
  });
  it('自填上限取比它高的第一个分位数', () => {
    expect(nextBudgetChoice('custom', caps, 15)).toBe('q2');
    expect(nextBudgetChoice('custom', caps, 50)).toBe('none');
    expect(nextBudgetChoice('custom', caps, null)).toBeNull();
  });
});
