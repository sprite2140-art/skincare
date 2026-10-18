// 本轮验收场景：用 data/ 的真实数据（测试模式，与页面一致）跑完整的问卷 → 打分 → 理由 / 搭配流程。

import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import { buildIngredientIndex } from '../data/ingredientIndex';
import { expandIngredients } from '../data/cosing';
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
import { validateData } from '../data/validate';
import { coverageCell, coverageGroups, shampoosWithPairedConditioner } from './coverage';

const real = loadDataFromDisk();
// 只用成分库（加上本项目的螯合剂、加香清单标记），不含 CosIng 补充条目
const index = buildIngredientIndex(expandIngredients(real.ingredients, [], [], [], real.lists));
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
    expect(recommendReasons(scented, profile, true).map((x) => x.zh)).toContain('含香精，气味和留香因人而异，建议自己闻一闻');
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

  it('推荐列表排序：适合等级 → 香味层级（无香优先）→ 综合分；需求匹配为 0 的放到"不太匹配"', () => {
    const rec = ok.filter((r) => !r.lowMatch);
    const order = { high: 0, medium: 1, low: 2 } as const;
    const key = (r: ProductScore) => order[r.fitLevel!] * 10 + fragranceTier(r.fragrance);
    const keys = rec.map(key);
    expect(keys).toEqual([...keys].sort((x, y) => x - y));
    for (let i = 1; i < rec.length; i++) {
      if (key(rec[i]) === key(rec[i - 1])) expect(rec[i].score!).toBeLessThanOrEqual(rec[i - 1].score!);
    }
    // 不太匹配的都排在推荐列表之后
    const firstLow = ok.findIndex((r) => r.lowMatch);
    if (firstLow >= 0) expect(ok.slice(firstLow).every((r) => r.lowMatch)).toBe(true);
    expect(ok.filter((r) => r.lowMatch).every((r) => r.dimensions.need.score === 0)).toBe(true);
  });

  it('标注无香和成分表中未发现加香成分为同一香味层级', () => {
    const tier0 = ok.filter((r) => fragranceTier(r.fragrance) === 0).map((r) => r.fragrance.status);
    expect(new Set(tier0)).toEqual(new Set(['labeled_free', 'none_found']));
  });

  it('理由说明香味情况，未知成分明确标注，不保证无致敏原', () => {
    const r = ok[0];
    const text = recommendReasons(r, profile, false).map((x) => x.zh).join(' / ');
    expect(text).toMatch(/标注无香|成分表中没有发现加香成分|含香精/);
    if (r.fragrance.unknownCount > 0) expect(text).toContain(`${r.fragrance.unknownCount} 个成分暂无数据`);
  });

  it('香精、香料致敏原和精油分开识别', () => {
    const tea = real.products.find((p) => p.productId === 'SH-US-023')!; // Paul Mitchell Tea Tree
    const f = fragranceInfo(tea, index);
    expect(f.status).toBe('contains');
    expect(f.fragrance).toEqual(expect.arrayContaining(['Fragrance', 'Linalool']));
    expect(f.essentialOils).toContain('Melaleuca Alternifolia Leaf Oil');
  });

  it('只含精油的产品：理由写"含精油"，不显示空的香精列表', () => {
    const oil = { ...real.products[1], productId: 'T-OIL', inciList: ['Water', 'Mentha Piperita Oil'], inciNameUnverified: [] };
    const r = scoreProduct(oil, profile, data);
    expect(r.fragrance).toMatchObject({ status: 'contains', fragrance: [] });
    const texts = recommendReasons(r, profile, false).map((x) => x.zh).join(' / ');
    expect(texts).toContain('含精油');
    expect(texts).not.toContain('含香精（）');
    const scent = toScoringProfile(answers({ hair: { goals: ['scent'] } }), 'shampoo', ctx);
    expect(recommendReasons(scoreProduct(oil, scent, data), scent, true).map((x) => x.zh)).toContain('含精油，气味和留香因人而异，建议自己闻一闻');
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

  it('洗发水 + 护发素都在总预算内；发丝状态只分配给护发素', () => {
    const routine = buildRoutine(['shampoo', 'conditioner'], lists, cap);
    expect(routine.slots.map((s) => s.status)).toEqual(['ok', 'ok']);
    expect(routine.totalUsd!).toBeLessThanOrEqual(40);
    // 没有头皮需求：洗发水没有需求可匹配，按温和程度和价格
    expect(routine.slots[0].chosen!.noNeeds).toBe(true);
    expect(routine.slots[1].chosen!.needMatches.map((m) => m.target)).toEqual(expect.arrayContaining(['color_fade', 'damage']));
    expect(routine.slots[1].chosen!.product.category).toBe('conditioner');
  });

  it('某品类没有数据时，另一品类正常推荐，该位置显示整理中', () => {
    const routine = buildRoutine(['shampoo', 'conditioner'], { shampoo: lists.shampoo, conditioner: [] }, cap);
    expect(routine.slots.map((s) => s.status)).toEqual(['ok', 'no_data']);
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
    expect(ok.length).toBe(60);
    expect(ok.every((r) => r.product.region === 'US')).toBe(true);
    expect(ok[0].dimensions.need.score).toBeNull();
    expect(recommendReasons(ok[0], profile, false).length).toBeGreaterThan(0);
  });
});

describe('场景 5：无图片、品类无数据、无符合条件商品', () => {
  it('图片必须写明来源、许可和署名；其余产品用占位图', () => {
    const withImage = real.products.filter((p) => p.imageUrl);
    expect(withImage.map((p) => p.productId)).toEqual(['CO-US-005', 'CO-US-009']);
    expect(withImage.every((p) => p.imageSource && p.imageLicense === 'CC BY-SA 3.0' && p.imageLicenseUrl && p.imageAttribution)).toBe(true);
    expect(withImage.every((p) => p.imageUrl.startsWith('https://images.openbeautyfacts.org/'))).toBe(true);
  });

  it('品类没有数据时（如发膜）返回空列表', () => {
    expect(recommend(answers({}), 'hair_mask').ranked).toEqual([]);
  });

  it('预算太低时没有可推荐的商品，全部附排除原因', () => {
    const a = answers({ base: { budgets: { shampoo: 'custom' }, customBudgets: { shampoo: { amount: 3, currency: 'USD' } } } });
    const { ranked, ok } = recommend(a, 'shampoo');
    expect(ok).toEqual([]);
    expect(ranked.every((r: ProductScore) => r.exclusions.length > 0)).toBe(true);
  });
});

describe('产品定位的来源标注', () => {
  const prof = toScoringProfile(answers({ hair: { goals: ['shine'] } }), 'shampoo', ctx);
  const base = { ...real.products[1], productId: 'T-POS', inciList: ['Water', 'Glycerin'], inciNameUnverified: [], claimedBenefits: ['shine' as const] };

  it('本轮数据的产品定位都来自资料整理时的分类，显示为"资料分类"，按 0.7 计分', () => {
    expect(real.products.filter((p) => p.claimedBenefits.length > 0).every((p) => p.claimSource === 'data_classification')).toBe(true);
    const r = scoreProduct({ ...base, claimSource: 'data_classification' }, prof, data);
    expect(r.dimensions.need.score).toBe(70);
    expect(r.dimensions.need.reason.zh).toBe('针对光泽：资料分类');
    expect(r.dimensions.evidence.score).toBeNull();
    expect(r.dimensions.evidence.state).toBe('missing');
    expect(r.dimensions.evidence.reason.zh).toContain('暂无成分或测试证据');
    expect(recommendReasons(r, prof, false)[0].zh).toBe('定位为针对光泽的产品');
    expect(recommendReasons(r, prof, false)[0].basis).toBe('classification');
  });

  it('品牌原文（brand_text）才显示为"品牌宣称"，计分相同', () => {
    const r = scoreProduct({ ...base, claimSource: 'brand_text' }, prof, data);
    expect(r.dimensions.need.score).toBe(70);
    expect(recommendReasons(r, prof, false)[0].zh).toBe('品牌说明针对光泽');
    expect(recommendReasons(r, prof, false)[0].basis).toBe('brand_claim');
  });

  it('"日常清洁"对应清爽洁净；去黄、去橙分开记录', () => {
    const byId = (id: string) => real.products.find((p) => p.productId === id)!;
    expect(byId('SH-US-027').claimedBenefits).toEqual(['clarifying']);
    expect(byId('SH-US-020').claimedBenefits).toContain('tone_yellow');
    expect(byId('SH-US-035').claimedBenefits).toContain('tone_orange');
    expect(byId('CO-US-008').claimedBenefits).toEqual(expect.arrayContaining(['tone_yellow', 'tone_orange']));
    const tone = toScoringProfile(answers({ hair: { conditions: ['colored'], goals: ['tone_orange'] } }), 'shampoo', ctx);
    const r = scoreProduct(byId('SH-US-035'), tone, data);
    expect(r.needMatches.find((m) => m.target === 'tone_orange')).toMatchObject({ credit: 0.7, bases: ['claim'] });
    // 旧档案的"去黄 / 去橙"合并选项对应两者
    expect(toScoringProfile(answers({ hair: { conditions: ['colored'], goals: ['tone'] } }), 'shampoo', ctx).concerns)
      .toEqual(expect.arrayContaining(['tone_yellow', 'tone_orange']));
  });

  it('品牌明确宣称的效果（brand_claim_targets）显示为"品牌宣称"，按 0.7 计分', () => {
    const byId = (id: string) => real.products.find((p) => p.productId === id)!;
    const co = byId('CO-US-014');
    expect(co.brandClaims.targets).toEqual(['dryness', 'tangling', 'flat_hair']);
    const prof = toScoringProfile(answers({ hair: { goals: ['volume'] } }), 'conditioner', ctx);
    const r = scoreProduct(co, prof, data);
    const m = r.needMatches.find((x) => x.target === 'flat_hair')!;
    expect(m.bases).toEqual(expect.arrayContaining(['brand_claim', 'claim']));
    expect(m.credit).toBeGreaterThanOrEqual(0.7);
    expect(r.dimensions.need.reason.zh).toContain('品牌宣称');
    // 只有品牌宣称、没有资料分类的困扰也计分
    const onlyBrand = { ...co, claimedBenefits: [], keyActives: ['Nothing Matching'] };
    const r2 = scoreProduct(onlyBrand, prof, data);
    expect(r2.needMatches.find((x) => x.target === 'flat_hair')).toMatchObject({ credit: 0.7, bases: ['brand_claim'] });
    expect(recommendReasons(r2, prof, false)[0].zh).toBe('品牌说明针对扁塌');
  });
});

describe('效果依据', () => {
  const withClaims = (claims: Partial<Product>) => ({ ...real.products[1], productId: 'T-CLAIM', inciList: ['Water', 'Glycerin'], inciNameUnverified: [], ...claims });
  const prof = toScoringProfile(answers({ hair: { goals: ['shine'] } }), 'shampoo', ctx);

  it('品牌宣称 0.7、成品测试 1；只有品牌宣称时证据强度不计分（数据缺失），成品测试记 100', () => {
    const claim = scoreProduct(withClaims({ claimedBenefits: ['shine'] }), prof, data);
    expect(claim.dimensions.need.score).toBe(70);
    expect(claim.dimensions.evidence.score).toBeNull();
    expect(claim.dimensions.evidence.state).toBe('missing');
    const tested = scoreProduct(withClaims({ testedClaims: [{ target: 'shine', description: 't', year: '2025', url: 'https://x.example' }] }), prof, data);
    expect(tested.dimensions.need.score).toBe(100);
    expect(tested.dimensions.evidence.score).toBe(100);
    expect(recommendReasons(tested, prof, false)[0].zh).toBe('有产品测试支持改善光泽');
  });

  it('螯合剂（清单）只对应"产品残留"（常用造型产品的用户），非主打按 30%，不按数量加分；不对应"清爽洁净"', () => {
    const clean = toScoringProfile(answers({ hair: { goals: ['clean'] } }), 'shampoo', ctx);
    expect(scoreProduct(withClaims({ keyActives: ['Glycerin'], inciList: ['Water', 'Disodium EDTA'] }), clean, data).dimensions.need.score).toBe(0);
    const styling = toScoringProfile(answers({ scalp: { styling: 'weekly_3_plus' } }), 'shampoo', ctx);
    expect(styling.concerns).toEqual(['buildup']);
    const one = scoreProduct(withClaims({ keyActives: ['Glycerin'], inciList: ['Water', 'Disodium EDTA'] }), styling, data);
    const two = scoreProduct(withClaims({ keyActives: ['Glycerin'], inciList: ['Water', 'Disodium EDTA', 'Sodium Phytate'] }), styling, data);
    expect(one.dimensions.need.score).toBe(30);
    expect(two.dimensions.need.score).toBe(30);
    // 柠檬酸在 CosIng 登记了螯合功能，但不在清单上，不算
    expect(scoreProduct(withClaims({ keyActives: ['Glycerin'], inciList: ['Water', 'Citric Acid'] }), styling, data).dimensions.need.score).toBe(0);
    // 护发素不加"产品残留"
    expect(toScoringProfile(answers({ scalp: { styling: 'daily' } }), 'conditioner', ctx).concerns).toEqual([]);
  });
});

describe('护发素数据', () => {
  const co = real.products.filter((p) => p.category === 'conditioner');
  const byId = (id: string) => real.products.find((p) => p.productId === id)!;

  it('37 款，冲洗型；需求标签为资料分类；品牌宣称是产品页概括或原文摘录，带出处', () => {
    expect(co).toHaveLength(37);
    expect(co.filter((p) => p.claimedBenefits.length > 0).every((p) => p.claimSource === 'data_classification')).toBe(true);
    // 第 1 批扩充（CO-US-031 起）的品牌宣称是英文原文摘录
    expect(byId('CO-US-031').brandClaims).toMatchObject({ status: 'brand_page_quote', targets: ['tangling'] });
    expect(byId('CO-US-031').brandClaims.text).toBe(byId('CO-US-031').brandClaims.quote);
    const c1 = byId('CO-US-001');
    expect(c1.brandClaims).toMatchObject({ status: 'brand_page_summary', quote: 'leaves strands feeling healthy and soft' });
    expect(c1.brandClaims.sourceUrl).toMatch(/^https:\/\/www\.cerave\.com\//);
    expect(c1.claimedBenefits).toEqual(['dryness', 'tangling']);
    // 在售版本与品牌页不一致：不采用品牌宣称
    expect(byId('CO-US-005').brandClaims).toMatchObject({ text: '', status: 'version_mismatch' });
    // 洗发水没有收集品牌宣称
    expect(byId('SH-US-001').brandClaims.status).toBe('not_collected');
  });

  it('无香声明有四款，并有出处；"无香优先"时它们排在前面', () => {
    expect(co.filter((p) => p.fragranceFreeClaim === 'yes').map((p) => p.productId)).toEqual(['CO-US-001', 'CO-US-029', 'CO-US-031', 'CO-US-032']);
    const prof = toScoringProfile(answers({ hair: { fragrancePref: 'free_first' } }), 'conditioner', ctx);
    const ranked = rankProducts(co, 'conditioner', prof, data).filter((r) => !r.excluded);
    // 没有选需求：按温和程度和价格排序，不按香味层级；标注无香的产品都在无香层级
    expect(ranked.every((r) => r.noNeeds && r.fitLevel === null)).toBe(true);
    expect(ranked.filter((r) => r.fragrance.status === 'labeled_free').every((r) => fragranceTier(r.fragrance) === 0)).toBe(true);
    const gentle = ranked.map((r) => r.dimensions.irritation.score!);
    expect(gentle).toEqual([...gentle].sort((x, y) => y - x));
  });

  it('同系列关系双向记录，不同品类', () => {
    expect(byId('CO-US-001').pairedProductIds).toEqual(['SH-US-001', 'SH-US-002']);
    expect(byId('SH-US-001').pairedProductIds).toContain('CO-US-001');
    expect(byId('CO-US-025').pairedProductIds).toEqual([]);
  });

  it('护发素只按发丝状态和期望效果打分，不看头皮困扰', () => {
    const a = answers({ scalp: { concerns: ['dandruff'] }, hair: { conditions: ['tangling'], goals: ['smooth'] } });
    const r = recommend(a, 'conditioner');
    expect(r.profile.concerns).toEqual(['tangling', 'frizz']);
    expect(r.ok.length).toBeGreaterThan(0);
    expect(r.ok[0].needMatches.every((m) => m.target !== 'dandruff')).toBe(true);
  });

  it('数据校验：无香声明必须有出处；品牌宣称必须有出处和状态；同系列 ID 必须存在', () => {
    const base: Product = { ...byId('CO-US-001'), pairedProductIds: [] };
    const errs = (patch: Partial<Product>) =>
      validateData(real.ingredients, [{ ...base, ...patch }], real.cities, real.exchangeRates).filter((i) => i.level === 'error').map((i) => i.message);
    expect(errs({})).toEqual([]);
    expect(errs({ fragranceFreeSourceUrl: '' })).toEqual([expect.stringContaining('fragrance_free_source_url')]);
    expect(errs({ brandClaims: { ...base.brandClaims, sourceUrl: '' } })).toEqual([expect.stringContaining('brand_claims_source_url')]);
    expect(errs({ pairedProductIds: ['SH-XX-999'] })).toEqual([expect.stringContaining('SH-XX-999')]);
  });
});

describe('环境适配：水硬度因分区而异', () => {
  it('不计分并说明原因', () => {
    const la = real.cities.find((c) => c.city === 'Los Angeles')!;
    const prof = { ...toScoringProfile(answers({}), 'shampoo', ctx), city: la };
    const r = scoreProduct(real.products[0], prof, data);
    expect(r.dimensions.environment.score).toBeNull();
    expect(r.dimensions.environment.state).toBe('not_scored');
    expect(r.dimensions.environment.reason.zh).toContain('不同供水分区或时期的水硬度不同');
  });
});

describe('美国洗护扩充第 1 批（2026-10-17）', () => {
  const byId = (id: string) => real.products.find((p) => p.productId === id)!;

  it('co-wash 归入洗发水（清洁步骤），带 co_wash 标记', () => {
    const p = byId('SH-US-060');
    expect(p).toMatchObject({ category: 'shampoo', subtype: 'co_wash' });
    expect(real.products.filter((x) => x.subtype !== null).map((x) => x.productId)).toEqual(['SH-US-060']);
  });

  it('claimed_benefits 是项目映射（资料分类）；紫色洗发水的 tone_correction 记为去黄', () => {
    const batch = real.products.filter((p) => p.reviewedOn === '' && /^(SH-US-0(4[89]|5\d|60)|CO-US-03[1-7])$/.test(p.productId));
    expect(batch).toHaveLength(20);
    expect(batch.filter((p) => p.claimedBenefits.length > 0).every((p) => p.claimSource === 'data_classification')).toBe(true);
    expect(byId('SH-US-057').claimedBenefits).toEqual(['tone_yellow']);
    expect(batch.every((p) => p.brandClaims.status === 'brand_page_quote')).toBe(true);
  });

  it('补上旧记录的反向配对，同时保留原配对', () => {
    expect(byId('SH-US-042').pairedProductIds).toContain('CO-US-037');
    expect(byId('CO-US-029').pairedProductIds).toEqual(expect.arrayContaining(['SH-US-053', 'SH-US-059']));
    expect(byId('CO-US-037').pairedProductIds).toEqual(['SH-US-042', 'SH-US-048']);
  });

  it('色素写法统一为 CI 编号（原文列保留标签写法）', () => {
    expect(byId('SH-US-048').inciList).toEqual(expect.arrayContaining(['CI 42090', 'CI 19140']));
    expect(byId('SH-US-057').inciList).toContain('CI 60730');
    expect(byId('SH-US-055').inciList).toEqual(expect.arrayContaining(['Mica', 'CI 77891']));
    expect(byId('SH-US-057').inciListOriginal).toMatch(/CI 60730/);
  });
});

describe('数据覆盖统计（npm run coverage）', () => {
  it('格子只计美国市场、未被排除、需求匹配大于 0 的产品；第二档包含第一档', () => {
    const low = coverageCell(real.products, 'shampoo', 'dandruff', 'p33', data);
    const mid = coverageCell(real.products, 'shampoo', 'dandruff', 'p67', data);
    expect(low.productIds.every((id) => mid.productIds.includes(id))).toBe(true);
    expect(mid.productIds.every((id) => id.startsWith('SH-US'))).toBe(true);
    expect(mid.fragranceFree).toBeLessThanOrEqual(mid.count);
    // 护发素不统计头皮困扰
    expect(coverageGroups('conditioner').map((g) => g.key)).toEqual(['hair', 'goals']);
    // 洗发水不统计打结，护发素不统计清爽洁净，头皮发红不单独统计
    const all = (c: string) => coverageGroups(c).flatMap((g) => g.targets);
    expect(all('shampoo')).not.toContain('tangling');
    expect(all('shampoo')).not.toContain('scalp_redness');
    expect(all('conditioner')).not.toContain('clarifying');
    expect(all('conditioner')).toContain('tangling');
  });

  it('有同系列护发素的洗发水', () => {
    const r = shampoosWithPairedConditioner(real.products);
    expect(r.ids).toEqual(expect.arrayContaining(['SH-US-042', 'SH-US-053', 'SH-US-059']));
    expect(r.paired).toBe(r.ids.length);
  });
});

describe('卡片理由用普通人能看懂的一句话', () => {
  it('主打成分写成"含{作用}成分{名称}"，不在卡片上写依据类型', () => {
    const prof = toScoringProfile(answers({ scalp: { concerns: ['dandruff'] } }), 'shampoo', ctx);
    const p = { ...real.products[0], productId: 'T-ZPT', keyActives: ['Pyrithione Zinc'], inciList: ['Water', 'Pyrithione Zinc'], inciNameUnverified: [], claimedBenefits: [] };
    const first = recommendReasons(scoreProduct(p, prof, data), prof, false)[0].zh;
    expect(first).toBe('含去屑成分吡硫鎓锌');
    expect(first).not.toContain('依据');
  });
});

describe('没有选需求时的兜底理由', () => {
  it('温和度不高、也没有其他理由时，不说"没有针对你所选需求的依据"', () => {
    const prof = toScoringProfile(answers({ scalp: { washFrequency: 'daily' } }), 'shampoo', ctx);
    expect(prof.concerns).toEqual([]);
    const harsh = { ...real.products[0], productId: 'T-HARSH', usageType: 'leave_on' as const, inciList: ['Water', 'Sodium Lauryl Sulfate', 'Fragrance', 'Isopropyl Alcohol'], inciNameUnverified: [] };
    const r = scoreProduct(harsh, prof, data);
    expect(r.dimensions.irritation.level).not.toBe('high');
    expect(recommendReasons(r, prof, false)[0].zh).toBe('你没有选择具体需求，按温和程度和价格排序');
  });
});

describe('证据缺失的说明', () => {
  it('只靠没有证据等级的成分匹配时，说明里不说成"只有品牌宣称或资料分类"', () => {
    const clean = toScoringProfile(answers({ scalp: { styling: 'daily' } }), 'shampoo', ctx);
    const p = { ...real.products[1], productId: 'T-UNRATED', keyActives: ['Glycerin'], inciList: ['Water', 'Disodium EDTA'], inciNameUnverified: [], claimedBenefits: [], testedClaims: [] };
    const r = scoreProduct(p, clean, data);
    expect(r.dimensions.need.score).toBeGreaterThan(0);
    expect(r.dimensions.evidence.state).toBe('missing');
    expect(r.dimensions.evidence.reason.zh).toContain('尚无证据等级的成分');
  });
});

describe('温和理由：有成分暂无数据时不下"不含"的结论', () => {
  it('不含加香成分、刺激风险满分，但有成分暂无数据 → "常见刺激成分少"', () => {
    const { profile, ok } = recommend(answers({ base: { scope: 'conditioner' } }), 'conditioner');
    const withUnknown = ok.find((r) => r.fragrance.status !== 'contains' && r.fragrance.unknownCount > 0 && r.dimensions.irritation.score === 100);
    expect(withUnknown).toBeDefined();
    expect(recommendReasons(withUnknown!, profile, false).map((x) => x.zh)).not.toContain('不含香精和常见刺激成分');
    const clean = ok.find((r) => r.fragrance.status !== 'contains' && r.fragrance.unknownCount === 0 && r.dimensions.irritation.score === 100);
    if (clean) expect(recommendReasons(clean, profile, false).map((x) => x.zh)).toContain('不含香精和常见刺激成分');
  });
});
