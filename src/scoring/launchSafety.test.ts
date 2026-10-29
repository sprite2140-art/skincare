// 上线审计第 2 项：推荐结果的安全规则（docs/LAUNCH_AUDIT.md）。
// 用真实数据遍历一组问卷答案（各特殊状态 × 困扰 × 预算），收集推荐结果（护肤：每步首选 + 备选 + 其余可推荐；
// 洗护：单品列表的主列表），逐条检查不该出现的产品。
import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import { IRRITANT_ACTIVE_CLASSES, productActiveClasses } from '../data/faceActives';
import { usageTypeOf, type FaceTarget, type Product } from '../data/types';
import { EMPTY_FACE, FACE_CONCERNS, type FaceAnswers } from '../profile/faceQuestionnaire';
import { EMPTY_HAIR, toScoringProfile, type Answers, type ScalpAnswers } from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { computeBudgetCaps } from './budget';
import { primaryStore } from './cardData';
import { TEST_MODE_DRAFT_SCORING } from './config';
import { buildScheduledRoutine } from './faceRoutine';
import { filterByMarket } from './market';
import { rankProducts, type SpecialStatus } from './score';

const real = loadDataFromDisk();
const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: TEST_MODE_DRAFT_SCORING };
const us = filterByMarket(real.products, 'US', false).shown;
const STATUSES: SpecialStatus[] = ['none', 'pregnant', 'trying', 'breastfeeding', 'rx', 'isotretinoin'];
const statusList = (s: SpecialStatus) => (s === 'none' ? [] : [s]);
const CONCERN_SETS: FaceTarget[][] = [[], ...FACE_CONCERNS.map((c) => [c]), ['acne', 'pigmentation', 'aging'], ['dryness', 'redness'], ['oil', 'pores']];

interface Pick { status: SpecialStatus; step: string; product: Product; primary: boolean }
const facePicks: Pick[] = [];
for (const status of STATUSES) for (const concerns of CONCERN_SETS) for (const sensitivity of ['rarely', 'often'] as const) for (const budget of ['none', 'q1'] as const) {
  const face: FaceAnswers = { ...EMPTY_FACE, skinType: 'normal', sensitivity, concerns, noConcerns: concerns.length === 0, budget };
  const { routine } = buildScheduledRoutine({
    products: us.filter((p) => p.zone === 'face'), face, statuses: statusList(status), avoidIngredients: [], avoidTags: [], data,
    classes: real.faceActiveClasses, conflictNotes: real.faceConflictNotes,
  });
  for (const s of routine.steps) {
    for (const r of s.eligible) facePicks.push({ status, step: s.step.id, product: r.product, primary: r === s.primary });
  }
}

const hairPicks: Pick[] = [];
const base = newProfile('safety', 'safety').base;
const scalp = (concerns: ScalpAnswers['concerns']): ScalpAnswers => ({ oilTiming: null, concerns, washFrequency: 'every_other_day' });
for (const status of STATUSES) for (const concerns of [[], ['dandruff'], ['sensitive'], ['hair_loss'], ['oily']] as ScalpAnswers['concerns'][]) {
  const answers: Answers = { base: { ...base, scope: 'set', specialStatus: status, specialStatuses: statusList(status) }, scalp: scalp(concerns), hair: EMPTY_HAIR };
  for (const cat of ['shampoo', 'conditioner'] as const) {
    const ranked = rankProducts(us, cat, toScoringProfile(answers, cat, { cities: real.cities, exchangeRates: real.exchangeRates }), data);
    for (const r of ranked.filter((x) => !x.excluded && !x.lowMatch && x.score !== null)) hairPicks.push({ status, step: cat, product: r.product, primary: false });
  }
}
const all = [...facePicks, ...hairPicks];
const ids = (list: Pick[]) => [...new Set(list.map((p) => p.product.productId))].sort();

describe('上线安全规则：推荐结果中不应出现', () => {
  it('有推荐结果可检查（护肤、洗护都有）', () => {
    expect(facePicks.length).toBeGreaterThan(1000);
    expect(hairPicks.length).toBeGreaterThan(500);
  });

  it('1. SPF 低于 30 或不是广谱的防晒', () => {
    const bad = facePicks.filter((p) => p.step === 'sunscreen' && !((p.product.face?.spf ?? 0) >= 30 && p.product.face?.broadSpectrum === 'yes'));
    expect(ids(bad)).toEqual([]);
  });

  it('2. 儿童 / 婴儿产品', () => {
    expect(ids(all.filter((p) => p.product.subtype === 'kids'))).toEqual([]);
  });

  it('3. 入库依据待补的产品（含成分表为空的）', () => {
    expect(ids(all.filter((p) => p.product.inclusionPending))).toEqual([]);
  });

  it('4a. 怀孕 / 备孕 / 哺乳：含 pregnancy_note = avoid 的成分，或含 A 醇类（护肤）', () => {
    const preg = all.filter((p) => ['pregnant', 'trying', 'breastfeeding'].includes(p.status));
    const avoid = preg.filter((p) => p.product.inciList.some((raw) => real.ingredientIndex.get(raw)?.pregnancyNote === 'avoid'));
    const retinoid = preg.filter((p) => p.product.zone === 'face' && productActiveClasses(p.product, real.ingredientIndex, real.faceActiveClasses).has('retinoid'));
    expect(ids(avoid)).toEqual([]);
    expect(ids(retinoid)).toEqual([]);
  });

  it('4b. 口服异维 A 酸：免洗产品含 A 醇类、过氧化苯甲酰、果酸、水杨酸；处方外用药：除过氧化苯甲酰外同样排除', () => {
    const hits = (p: Pick, allowBpo: boolean) => {
      if (p.product.zone !== 'face' || usageTypeOf(p.product) === 'rinse_off') return false;
      const classes = productActiveClasses(p.product, real.ingredientIndex, real.faceActiveClasses);
      return IRRITANT_ACTIVE_CLASSES.some((c) => classes.has(c) && !(allowBpo && c === 'benzoyl_peroxide'));
    };
    expect(ids(facePicks.filter((p) => p.status === 'isotretinoin' && hits(p, false)))).toEqual([]);
    expect(ids(facePicks.filter((p) => p.status === 'rx' && hits(p, true)))).toEqual([]);
    // 口服异维 A 酸时没有点涂步骤
    expect(facePicks.filter((p) => p.status === 'isotretinoin' && p.step === 'spot')).toEqual([]);
  });

  it('5a. 缺货链接不作为主购买按钮', () => {
    const bad = all.filter((p) => primaryStore(p.product)?.availability === 'out_of_stock');
    expect(ids(bad)).toEqual([]);
  });

  it('5b. 所有购买链接都缺货的产品不作为某一步的首选', () => {
    const outOnly = (p: Product) => p.purchaseLinks.length > 0 && p.purchaseLinks.every((l) => l.status === 'out_of_stock');
    expect(ids(facePicks.filter((p) => p.primary && outOnly(p.product)))).toEqual([]);
  });
});
