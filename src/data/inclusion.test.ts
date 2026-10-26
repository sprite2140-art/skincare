import { describe, expect, it } from 'vitest';
import { attachRetail, parseRetailRatings, reviewCountBasis } from './parse';
import { loadDataFromDisk } from './node';
import { validateData } from './validate';
import { computeBudgetCaps } from '../scoring/budget';
import { rankProducts, type ScoringProfile } from '../scoring/score';
import type { Product } from './types';

const real = loadDataFromDisk();
const RATING_COLS = 'product_id,platform,rating,rating_count,rating_count_display,checked_on,url\n';
const base = real.products.find((p) => p.productId === 'SH-US-001')!;
const raw = (patch: Partial<Product>): Product => ({ ...base, ratings: [], purchaseLinks: [], inclusionPending: undefined, ...patch });

describe('入库依据：评价数 1,000 条以上', () => {
  it('取美国主要零售商中评价数最多的一条，写明平台、评价数、核对日期和链接', () => {
    const ratings = parseRetailRatings(RATING_COLS
      + 'X,ulta,4.5,3495,"3,495",2026-10-24,https://www.ulta.com/p/a\n'
      + 'X,target,4.4,5001,"5,001",2026-10-23,https://www.target.com/p/a\n'
      + 'X,bluemercury,4.8,9000,9000,2026-10-24,https://bluemercury.com/a\n');
    expect(reviewCountBasis(ratings)).toBe('Target 评价数 5,001（核对于 2026-10-23）https://www.target.com/p/a');
    expect(reviewCountBasis(parseRetailRatings(RATING_COLS + 'X,ulta,4.5,999,999,2026-10-24,https://www.ulta.com/p/a\n'))).toBeNull();
    // 品牌官网和其他百货不算
    expect(reviewCountBasis(parseRetailRatings(RATING_COLS + 'X,brand,4.5,5000,5000,2026-10-24,https://brand.example\n'))).toBeNull();
  });

  it('只给没有其他入库依据类型的产品；已有依据的保持不变', () => {
    const ratings = parseRetailRatings(RATING_COLS + 'X,ulta,4.5,1000,1000,2026-10-24,https://www.ulta.com/p/a\n');
    const [auto, kept] = attachRetail([raw({ productId: 'X', inclusionBasisType: null, inclusionBasis: '' }), raw({ productId: 'X', inclusionBasisType: 'beauty_award', inclusionBasis: 'Allure' })], ratings, []);
    expect(auto.inclusionBasisType).toBe('review_count');
    expect(auto.inclusionBasis).toContain('Ulta 评价数 1,000');
    expect(kept.inclusionBasisType).toBe('beauty_award');
    expect(kept.inclusionBasis).toBe('Allure');
  });

  it('保湿、精华以外的现有产品中 11 款因此新获得依据', () => {
    const ids = real.products.filter((p) => p.inclusionBasisType === 'review_count' && !/^(MO|SE)-/.test(p.productId)).map((p) => p.productId);
    expect(ids).toEqual(['SU-US-001', 'SU-US-002', 'SU-US-003', 'SU-US-009', 'SU-US-011', 'SU-US-012', 'SU-US-016', 'SU-US-024', 'SU-US-036', 'SU-US-039', 'SU-US-040']);
  });

  it('inclusion_basis 为 none 且评价数不足：入库依据待补，校验只提示，不出现在推荐里', () => {
    const [pending] = attachRetail([raw({ productId: 'Y', inclusionBasisType: null, inclusionBasis: 'none', pairedProductIds: [] })], [], []);
    expect(pending.inclusionPending).toBe(true);
    const issues = validateData(real.ingredients, [pending], real.cities, real.exchangeRates);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(issues.some((i) => i.level === 'warning' && i.message.startsWith('入库依据待补'))).toBe(true);
    const profile: ScoringProfile = {
      concerns: [], concernsRanked: false, sensitive: false, specialStatus: 'none', avoidIngredients: [], avoidTags: [],
      budget: 'none', fragrancePref: null, washFrequency: null, city: null, inUseProducts: [],
    };
    const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: true };
    const ranked = rankProducts([pending, raw({ productId: 'Z' })], base.category, profile, data).map((r) => r.product.productId);
    expect(ranked).toEqual(['Z']);
    // 依据写的是其他平台（如 Bluemercury）的评价数：也算待补
    const [blue] = attachRetail([raw({ productId: 'B', inclusionBasisType: null, inclusionBasis: 'US retailer review count; bluemercury; 3051; 2026-10-24; https://bluemercury.com/x' })], [], []);
    expect(blue.inclusionPending).toBe(true);
    // 现有产品没有写 none 的，不受影响
    expect(real.products.filter((p) => p.inclusionPending).map((p) => p.productId)).toEqual(
      ['MO-US-012', 'MO-US-014', 'SE-US-010', 'SE-US-012', 'SE-US-013', 'SE-US-014', 'SE-US-015', 'SE-US-016', 'SE-US-017', 'SE-US-018']);
  });
});

describe('成分表末尾的句号', () => {
  it('"Fragrance." 能匹配香精（想避开香精时会被排除）；"Alcohol Denat." 照常匹配', () => {
    expect(real.ingredientIndex.get('Fragrance.')?.inciName).toBe('Fragrance');
    expect(real.ingredientIndex.get('Phenoxyethanol.')).toBeDefined();
    expect(real.ingredientIndex.get('Alcohol Denat.')?.inciName).toBe('Alcohol Denat.');
    const mo = real.products.find((p) => p.productId === 'MO-US-020')!;
    const profile: ScoringProfile = {
      concerns: [], concernsRanked: false, sensitive: false, specialStatus: 'none', avoidIngredients: [], avoidTags: ['fragrance'],
      budget: 'none', fragrancePref: null, washFrequency: null, city: null, inUseProducts: [],
    };
    const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: true };
    expect(rankProducts([mo], 'moisturizer', profile, data)[0].excluded).toBe(true);
  });
});
