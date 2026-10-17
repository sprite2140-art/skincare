// 本轮验收场景：用 data/ 的真实数据（测试模式，与页面一致）跑完整的问卷 → 打分 → 理由 / 搭配流程。

import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import { buildIngredientIndex } from '../data/ingredientIndex';
import type { Category, Product } from '../data/types';
import {
  EMPTY_HAIR, moneyToUsd, scalpMedicalAlerts, toScoringProfile, type Answers, type BaseAnswers, type HairAnswers, type ScalpAnswers,
} from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { computeBudgetCaps } from './budget';
import { fragranceInfo, fragranceTier } from './fragrance';
import { filterByMarket, marketForCity } from './market';
import { recommendReasons } from './reasons';
import { buildRoutine, routineTotal } from './routine';
import { rankProducts, scoreProduct, type ProductScore } from './score';

const real = loadDataFromDisk();
const index = buildIngredientIndex(real.ingredients);
const data = { index, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: true };
const ctx = { cities: real.cities, exchangeRates: real.exchangeRates };
const noScalp: ScalpAnswers = { concerns: [], oilTiming: null, washFrequency: null };
const answers = (a: { base?: Partial<BaseAnswers>; scalp?: Partial<ScalpAnswers>; hair?: Partial<HairAnswers> }): Answers => ({
  base: { ...newProfile('我', 'me').base, ...a.base },
  scalp: { ...noScalp, ...a.scalp },
  hair: { ...EMPTY_HAIR, ...a.hair },
});

/** 与结果页相同：按市场筛选后对某品类打分排序 */
function recommend(a: Answers, category: Category, products: Product[] = real.products) {
  const city = real.cities.find((c) => `${c.city}, ${c.country}` === a.base.cityKey) ?? null;
  const { shown } = filterByMarket(products.filter((p) => p.category === category), marketForCity(city), false);
  const profile = toScoringProfile(a, category, ctx);
  const ranked = rankProducts(shown, category, profile, data);
  return { profile, ranked, ok: ranked.filter((r) => !r.excluded) };
}

describe('场景 1：没有头皮困扰，只想柔顺、好闻，预算 $15', () => {
  const a = answers({
    base: { scope: 'shampoo', budgets: { shampoo: 'custom' }, customBudgets: { shampoo: { amount: 15, currency: 'USD' } } },
    scalp: { noConcerns: true },
    hair: { goals: ['smooth', 'scent'] },
  });
  const { profile, ranked, ok } = recommend(a, 'shampoo');

  it('只按柔顺相关需求打分，不涉及头皮', () => {
    expect(profile.concerns).toEqual(['frizz', 'tangling']);
    expect(scalpMedicalAlerts(a.scalp)).toEqual([]);
  });

  it('推荐的产品都不超过 $15，超出的说明原因', () => {
    expect(ok.length).toBeGreaterThan(0);
    for (const r of ok) expect(r.price.usd!).toBeLessThanOrEqual(15);
    const over = ranked.find((r) => r.exclusions.some((e) => e.code === 'over_budget'))!;
    expect(over.exclusions[0].text.zh).toContain('超出你选的预算上限（约 15.00 USD）');
  });

  it('每款最多两条理由；含香精的说明气味需自己试，不推断留香', () => {
    for (const r of ok) {
      const reasons = recommendReasons(r, profile, true);
      expect(reasons.length).toBeGreaterThan(0);
      expect(reasons.length).toBeLessThanOrEqual(2);
    }
    const scented = ok.find((r) => r.fragrance.status === 'contains')!;
    expect(recommendReasons(scented, profile, true).map((x) => x.zh)).toContain('含香精；气味和留香因人而异，需要自己试');
  });
});

describe('场景 2：头皮屑、瘙痒 7 分，无香优先', () => {
  const a = answers({
    scalp: { concerns: ['dandruff', 'itch'], itchScore: 7, dandruffType: 'dry_fine' },
    hair: { fragrancePref: 'free_first' },
  });
  const { profile, ok } = recommend(a, 'shampoo');

  it('建议就医，按敏感头皮处理（刺激扣分加倍）', () => {
    expect(scalpMedicalAlerts(a.scalp).map((x) => x.code)).toEqual(['itch_severe']);
    expect(profile.sensitive).toBe(true);
    expect(profile.concerns).toEqual(['dandruff', 'scalp_itch', 'sensitive_scalp']);
  });

  it('可推荐的产品按香味层级排序：没发现加香成分的在前，含香精的在后', () => {
    const tiers = ok.map((r) => fragranceTier(r.fragrance));
    expect(tiers).toEqual([...tiers].sort((x, y) => x - y));
    expect(tiers.at(-1)).toBe(3);
  });

  it('理由说明香味情况，未知成分明确标注，不保证无致敏原', () => {
    const r = ok[0];
    const text = recommendReasons(r, profile, false).map((x) => x.zh).join(' / ');
    expect(text).toMatch(/成分表未发现已知加香成分|含香精/);
    if (r.fragrance.unknownCount > 0) expect(text).toContain('暂无数据，无法完全确认');
  });

  it('香精、香料致敏原和精油分开识别', () => {
    const tea = real.products.find((p) => p.productId === 'SH-US-023')!; // Paul Mitchell Tea Tree
    const f = fragranceInfo(tea, index);
    expect(f.status).toBe('contains');
    expect(f.fragrance).toEqual(expect.arrayContaining(['Fragrance', 'Linalool']));
    expect(f.essentialOils).toContain('Melaleuca Alternifolia Leaf Oil');
  });

  it('标注 fragrance-free 且未发现加香成分的排在最前（层级 0）', () => {
    const free = { ...real.products[1], productId: 'T-FREE', fragranceFreeClaim: 'yes' as const, inciList: ['Water', 'Glycerin'], inciNameUnverified: [] };
    expect(fragranceTier(fragranceInfo(free, index))).toBe(0);
    // 标了无香但成分表里有香精：仍算含香精
    expect(fragranceInfo({ ...free, inciList: ['Water', 'Fragrance'] }, index).status).toBe('contains');
  });
});

describe('场景 3：染烫受损，选洗护搭配，自填总预算', () => {
  const a = answers({
    base: { scope: 'set', budgetMode: 'set', setBudget: { amount: 40, currency: 'USD' } },
    hair: { conditions: ['colored', 'permed_bleached'] },
  });
  const cap = moneyToUsd(a.base.setBudget, real.exchangeRates);
  const lists = { shampoo: recommend(a, 'shampoo').ranked, conditioner: recommend(a, 'conditioner').ranked };

  it('护发素暂无数据时，洗发水正常推荐，护发素位显示整理中', () => {
    const routine = buildRoutine(['shampoo', 'conditioner'], lists, cap);
    expect(routine.slots.map((s) => s.status)).toEqual(['ok', 'no_data']);
    expect(routine.totalUsd!).toBeLessThanOrEqual(40);
    expect(routine.slots[0].chosen!.needMatches.map((m) => m.target)).toEqual(['color_fade', 'damage']);
  });

  it('有护发素时，在总预算内选总分最高的组合，不限定同品牌', () => {
    const fakeConditioners = [
      { ...real.products[5], productId: 'CO-T-1', brand: 'Other', category: 'conditioner', price: 35, inciList: ['Water', 'Panthenol'] },
      { ...real.products[5], productId: 'CO-T-2', brand: 'Another', category: 'conditioner', price: 9, inciList: ['Water', 'Panthenol'] },
    ];
    const condList = recommend(a, 'conditioner', fakeConditioners).ranked;
    const routine = buildRoutine(['shampoo', 'conditioner'], { shampoo: lists.shampoo, conditioner: condList }, cap);
    expect(routine.slots.every((s) => s.status === 'ok')).toBe(true);
    expect(routine.totalUsd!).toBeLessThanOrEqual(40);
    // 替换或移除单品后重新计算总价
    const [sh, co] = routine.slots;
    expect(routineTotal([sh.chosen, null])).toBeCloseTo(sh.chosen!.price.usd!);
    expect(routineTotal([sh.chosen, co.options.find((o) => o.product.productId === 'CO-T-1')!])).toBeCloseTo(sh.chosen!.price.usd! + 35);
  });

  it('总预算内找不到组合时明确返回 no_match，不放宽条件', () => {
    const routine = buildRoutine(['shampoo'], lists, 1);
    expect(routine.noMatch).toBe(true);
    expect(routine.slots[0]).toMatchObject({ status: 'no_match', chosen: null });
  });
});

describe('场景 4：跳过城市和所有可跳过的题', () => {
  const a = answers({});
  const { profile, ok } = recommend(a, 'shampoo');

  it('默认美国市场，城市为空，不计需求匹配，仍能出结果', () => {
    expect(profile.city).toBeNull();
    expect(marketForCity(null)).toBe('US');
    expect(ok.length).toBe(47);
    expect(ok.every((r) => r.product.region === 'US')).toBe(true);
    expect(ok[0].dimensions.need.score).toBeNull();
    expect(recommendReasons(ok[0], profile, false).length).toBeGreaterThan(0);
  });
});

describe('场景 5：无图片、无护发素数据、无符合条件商品', () => {
  it('没有写明使用许可的图片：产品都没有可展示的图片（页面用占位图）', () => {
    expect(real.products.every((p) => !(p.imageUrl && p.imageSource && p.imageLicense))).toBe(true);
  });

  it('护发素没有数据', () => {
    expect(real.products.filter((p) => p.category === 'conditioner')).toEqual([]);
    expect(recommend(answers({}), 'conditioner').ranked).toEqual([]);
  });

  it('预算太低时没有可推荐的商品，全部附排除原因', () => {
    const a = answers({ base: { budgets: { shampoo: 'custom' }, customBudgets: { shampoo: { amount: 3, currency: 'USD' } } } });
    const { ranked, ok } = recommend(a, 'shampoo');
    expect(ok).toEqual([]);
    expect(ranked.every((r: ProductScore) => r.exclusions.length > 0)).toBe(true);
  });
});

describe('效果依据', () => {
  const withClaims = (claims: Partial<Product>) => ({ ...real.products[1], productId: 'T-CLAIM', inciList: ['Water', 'Glycerin'], inciNameUnverified: [], ...claims });
  const prof = toScoringProfile(answers({ hair: { goals: ['shine'] } }), 'shampoo', ctx);

  it('品牌宣称 0.7、成品测试 1，证据强度分别为 30 和 100', () => {
    const claim = scoreProduct(withClaims({ claimedBenefits: ['shine'] }), prof, data);
    expect(claim.dimensions.need.score).toBe(70);
    expect(claim.dimensions.evidence.score).toBe(30);
    const tested = scoreProduct(withClaims({ testedClaims: [{ target: 'shine', description: 't', year: '2025', url: 'https://x.example' }] }), prof, data);
    expect(tested.dimensions.need.score).toBe(100);
    expect(tested.dimensions.evidence.score).toBe(100);
    expect(recommendReasons(tested, prof, false)[0].zh).toContain('依据：成品测试');
  });

  it('成分功能辅助匹配：螯合剂对应"清爽洁净"，非主打按 30%，不按数量加分', () => {
    const clean = toScoringProfile(answers({ hair: { goals: ['clean'] } }), 'shampoo', ctx);
    const one = scoreProduct(withClaims({ keyActives: ['Glycerin'], inciList: ['Water', 'Disodium EDTA'] }), clean, data);
    const two = scoreProduct(withClaims({ keyActives: ['Glycerin'], inciList: ['Water', 'Disodium EDTA', 'Sodium Phytate'] }), clean, data);
    expect(one.dimensions.need.score).toBe(30);
    expect(two.dimensions.need.score).toBe(30);
  });
});
