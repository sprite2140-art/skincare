import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from './node';
import { RETAIL_PLATFORMS } from './types';
import { MIN_RATING_COUNT, ratingCountForThreshold, ratingCountText, visibleRatings } from './retail';

const real = loadDataFromDisk();
const byId = (id: string) => real.products.find((p) => p.productId === id)!;

describe('零售商评分与购买链接（只展示，不计分）', () => {
  it('导入第 1 批 41 条评分、按平台固定顺序挂到产品上', () => {
    expect(real.products.reduce((n, p) => n + p.ratings.length, 0)).toBe(41);
    const order = byId('SH-US-003').ratings.map((r) => RETAIL_PLATFORMS.indexOf(r.platform));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('评价数少于 50 的评分不显示；只有缩写（5.5K）时按缩写判断门槛，显示原文', () => {
    expect(MIN_RATING_COUNT).toBe(50);
    // SH-US-001：Ulta 19 条不显示，Target 1,346 条显示
    expect(visibleRatings(byId('SH-US-001')).map((r) => r.platform)).toEqual(['target']);
    const sephora = byId('SH-US-003').ratings.find((r) => r.platform === 'sephora')!;
    expect(sephora.ratingCount).toBeNull();
    expect(ratingCountForThreshold(sephora)).toBe(5500);
    expect(ratingCountText(sephora)).toBe('5.5K');
    const amazon = byId('SH-US-002').ratings.find((r) => r.platform === 'amazon')!;
    expect(ratingCountText(amazon)).toBe('6,395');
  });

  it('购买链接按固定顺序（品牌官网 → Ulta → Sephora → Target → Amazon）挂到产品上', () => {
    expect(byId('SH-US-001').purchaseLinks.map((l) => l.platform)).toEqual(['brand', 'ulta', 'target', 'amazon']);
  });

  it('评分不影响打分：产品去掉评分后分数不变', async () => {
    const { scoreProduct } = await import('../scoring/score');
    const { computeBudgetCaps } = await import('../scoring/budget');
    const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: true };
    const prof = {
      concerns: ['dandruff' as const], concernsRanked: false, sensitive: false, specialStatus: 'none' as const, avoidIngredients: [], avoidTags: [],
      budget: 'none' as const, washFrequency: null, city: null, inUseProducts: [],
    };
    const p = byId('SH-US-003');
    expect(scoreProduct(p, prof, data).score).toBe(scoreProduct({ ...p, ratings: [], purchaseLinks: [] }, prof, data).score);
  });
});
