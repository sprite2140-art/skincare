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
  it('SE-US-005—008 只有与在售版本不一致的品牌官网链接，标为待补、不可推荐', () => {
    for (const id of ['SE-US-005', 'SE-US-006', 'SE-US-007', 'SE-US-008']) {
      expect(byId(id).purchasePending).toBe(true);
      expect(isRecommendable(byId(id))).toBe(false);
    }
    expect(hasUsablePurchaseLink(byId('SH-US-001'))).toBe(true);
  });

  it('没有链接的只有 SE-US-005—008 和日韩中版本洗发水 10 款', () => {
    const ids = real.products.filter((p) => p.purchasePending).map((p) => p.productId);
    expect(ids).toEqual(['SH-JP-001', 'SH-JP-002', 'SH-JP-003', 'SH-JP-004', 'SH-KR-001', 'SH-KR-002', 'SH-KR-003', 'SH-KR-004', 'SH-CN-001', 'SH-CN-002',
      'SE-US-005', 'SE-US-006', 'SE-US-007', 'SE-US-008']);
  });

  it('不出现在推荐列表里；数据校验逐款提示', () => {
    const profile: ScoringProfile = { concerns: [], concernsRanked: false, sensitive: false, specialStatus: 'none', avoidIngredients: [], avoidTags: [], budget: 'none', fragrancePref: null, washFrequency: null, city: null, inUseProducts: [] };
    const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates) };
    expect(rankProducts(real.products, 'shampoo', profile, data).some((r) => r.product.purchasePending)).toBe(false);
    const issues = validateData(real.ingredients, real.products, real.cities, real.exchangeRates);
    expect(issues.filter((i) => i.level === 'warning' && i.message.includes('没有可用的购买链接'))).toHaveLength(14);
  });
});
