// 2026-11-03：没有可用购买链接的产品不进入推荐列表，数据校验列出。
import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from './node';
import { hasUsablePurchaseLink } from './retail';
import { isRecommendable } from './types';
import { validateData } from './validate';
import { computeBudgetCaps } from '../scoring/budget';
import { rankProducts, type ScoringProfile } from '../scoring/score';

const real = loadDataFromDisk();
const byId = (id: string) => real.products.find((p) => p.productId === id)!;

describe('没有可用购买链接的产品', () => {
  it('SE-US-005、006 只有与在售版本不一致的品牌官网链接，标为待补、不可推荐；SE-US-008 补了 Ulta、SE-US-007 补了 Target 75mL 成分一致的链接（2026-11-23）', () => {
    expect(isRecommendable(byId('SE-US-008'))).toBe(true);
    expect(isRecommendable(byId('SE-US-007'))).toBe(true);
    for (const id of ['SE-US-005', 'SE-US-006']) {
      expect(byId(id).purchasePending).toBe(true);
      expect(isRecommendable(byId(id))).toBe(false);
    }
    expect(hasUsablePurchaseLink(byId('SH-US-001'))).toBe(true);
  });

  it('没有链接的只有 SE-US-005、006 和韩国、中国版本洗发水 3 款（2026-11-23）', () => {
    const ids = real.products.filter((p) => p.purchasePending).map((p) => p.productId);
    expect(ids).toEqual(['SH-KR-002', 'SH-CN-001', 'SH-CN-002', 'SE-US-005', 'SE-US-006']);
  });

  it('不出现在推荐列表里；数据校验逐款提示', () => {
    const profile: ScoringProfile = { concerns: [], concernsRanked: false, sensitive: false, specialStatus: 'none', avoidIngredients: [], avoidTags: [], budget: 'none', fragrancePref: null, washFrequency: null, city: null, inUseProducts: [] };
    const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates) };
    expect(rankProducts(real.products, 'shampoo', profile, data).some((r) => r.product.purchasePending)).toBe(false);
    const issues = validateData(real.ingredients, real.products, real.cities, real.exchangeRates);
    expect(issues.filter((i) => i.level === 'warning' && i.message.includes('没有可用的购买链接'))).toHaveLength(5); // 2026-11-23 SE-US-007 补了 Target 链接
  });
});
