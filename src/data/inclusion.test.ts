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
    // Bluemercury 2026-10-26 起也认
    expect(reviewCountBasis(ratings)).toBe('Bluemercury 评价数 9,000（核对于 2026-10-24）https://bluemercury.com/a');
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

  it('保湿、精华以外：防晒 30 款按评价数获得依据（防晒补查、Amazon 补查、第 3 批修正版后）', () => {
    const ids = real.products.filter((p) => p.inclusionBasisType === 'review_count' && !/^(MO|SE|EX|ST)-/.test(p.productId)).map((p) => p.productId);
    expect(ids).toEqual(['SU-US-001', 'SU-US-002', 'SU-US-003', 'SU-US-004', 'SU-US-006', 'SU-US-008', 'SU-US-009', 'SU-US-010', 'SU-US-011', 'SU-US-012', 'SU-US-013', 'SU-US-016', 'SU-US-022', 'SU-US-024', 'SU-US-027', 'SU-US-032', 'SU-US-035', 'SU-US-036', 'SU-US-037', 'SU-US-039', 'SU-US-040',
      'SU-US-041', 'SU-US-042', 'SU-US-043', 'SU-US-044', 'SU-US-045', 'SU-US-046', 'SU-US-048', 'SU-US-049', 'SU-US-050']);
  });

  it('去角质、点涂第 1 批：评价数依据（Sephora 1.6K 按"数字 K"规则）', () => {
    const ids = real.products.filter((p) => p.inclusionBasisType === 'review_count' && /^(EX|ST)-/.test(p.productId)).map((p) => p.productId);
    expect(ids).toEqual(['EX-US-002', 'EX-US-003', 'EX-US-006', 'EX-US-008', 'EX-US-017', 'EX-US-019',
      'ST-US-001', 'ST-US-002', 'ST-US-003', 'ST-US-004', 'ST-US-005', 'ST-US-011', 'ST-US-012', 'ST-US-015']);
    expect(real.products.filter((p) => /^(EX|ST)-/.test(p.productId) && p.inclusionPending)).toEqual([]);
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
    // 依据写的是评价数、但评分表里没有达到 1,000 条的认可平台：也算待补
    const [blue] = attachRetail([raw({ productId: 'B', inclusionBasisType: null, inclusionBasis: 'US retailer review count; bluemercury; 3051; 2026-10-24; https://bluemercury.com/x' })], [], []);
    expect(blue.inclusionPending).toBe(true);
    // 现有产品没有写 none 的，不受影响
    expect(real.products.filter((p) => p.inclusionPending).map((p) => p.productId)).toEqual(
      ['SU-US-005', 'SU-US-007', 'SU-US-014', 'SU-US-017', 'SU-US-019', 'SU-US-020', 'SU-US-021', 'SU-US-023', 'SU-US-025',
        'SU-US-026', 'SU-US-028', 'SU-US-029', 'SU-US-030', 'SU-US-031', 'SU-US-033', 'SU-US-034', 'SU-US-038',
        'MO-US-012', 'SE-US-010', 'SE-US-012', 'SE-US-013', 'SE-US-014', 'SE-US-015', 'SE-US-016']);
    for (const id of ['MO-US-014', 'SE-US-017', 'SE-US-018']) {
      expect(real.products.find((p) => p.productId === id)!.inclusionBasis).toMatch(/^Bluemercury 评价数/);
    }
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

describe('评价数只显示"数字K"', () => {
  it('rating_count 为空、显示为 2K 时按 ≥1,000 判定入库，依据注明约数；不足 1K 或其他写法不算', () => {
    const k = parseRetailRatings(RATING_COLS + 'X,sephora,,,2K,2026-10-25,https://www.sephora.com/p\n');
    expect(k[0].ratingCount).toBeNull();
    expect(reviewCountBasis(k)).toBe('Sephora 评价数 约 2K（页面显示，未取得精确数）（核对于 2026-10-25）https://www.sephora.com/p');
    expect(reviewCountBasis(parseRetailRatings(RATING_COLS + 'X,sephora,,,0.8K,2026-10-25,https://www.sephora.com/p\n'))).toBeNull();
    expect(reviewCountBasis(parseRetailRatings(RATING_COLS + 'X,sephora,,,many,2026-10-25,https://www.sephora.com/p\n'))).toBeNull();
  });
});

describe('防晒第 3 批规则', () => {
  it('Walmart、Kohl\'s 的评价数也算入库依据；没有成分表的产品按待补处理、只提示', () => {
    expect(reviewCountBasis(parseRetailRatings(RATING_COLS + 'X,walmart,4.2,1200,1200,2026-10-26,https://www.walmart.com/ip/1\n'))).toMatch(/^Walmart 评价数 1,200/);
    expect(real.products.find((p) => p.productId === 'SU-US-050')!.inclusionBasis).toMatch(/^Kohl's 评价数 1,006/);
    expect(real.products.find((p) => p.productId === 'SU-US-047')!.purchaseLinks[0].platform).toBe('walmart');
    // 没有成分表（第 3 批初版的 SU-US-042 就是这样，修正版已补上）
    const [noInci] = attachRetail([raw({ productId: 'N', inciList: [], pairedProductIds: [] })], [], []);
    expect(noInci.inclusionPending).toBe(true);
    const issues = validateData(real.ingredients, [noInci], real.cities, real.exchangeRates);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(issues.some((i) => i.level === 'warning' && i.message.startsWith('inci_list 为空'))).toBe(true);
  });
});
