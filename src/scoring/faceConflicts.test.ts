import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import type { FaceAttributes, Ingredient, Product } from '../data/types';
import { buildIngredientIndex } from '../data/ingredientIndex';
import { EMPTY_FACE } from '../profile/faceQuestionnaire';
import { computeBudgetCaps } from './budget';
import { faceScoringProfile, scoreFaceProduct } from './faceScore';
import { buildScheduledRoutine, type RoutineStep } from './faceRoutine';
import { scheduleRoutine } from './faceSchedule';
import { checkRoutineConflicts } from './faceConflicts';
import { STEP_CATEGORY, type FaceStepId } from './faceSteps';

const real = loadDataFromDisk();
const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: true };
const cl = real.products.find((p) => p.productId === 'CL-US-001')!;
const FACE: FaceAttributes = {
  skinTypeClaim: [], texture: null, spf: 50, broadSpectrum: 'yes', waterResistance: 'unknown',
  activeConcentrations: [], useTime: 'unknown', useFrequency: '', nonComedogenicClaim: 'unknown', faceStepNote: '',
};
const mk = (id: string, category: string, inciList: string[], face: Partial<FaceAttributes> = {}): Product =>
  ({ ...cl, productId: id, nameZh: id, nameEn: id, category, usageType: null, inciList, inciNameUnverified: [], face: { ...FACE, ...face } });

function step(id: FaceStepId, inciList: string[], face: Partial<FaceAttributes> = {}, d = data): RoutineStep {
  const s = { id, category: STEP_CATEGORY[id], tier: 'optional' as const, needs: [], becauseOf: [], weekly: id === 'exfoliator' };
  const profile = faceScoringProfile(EMPTY_FACE, s, { specialStatus: 'none', avoidIngredients: [], avoidTags: [] });
  const r = scoreFaceProduct(mk(`${id}-1`, STEP_CATEGORY[id], inciList, face), profile, d, { face: EMPTY_FACE, step: s, classes: real.faceActiveClasses });
  return { step: s, profile, ranked: [r], eligible: [r], primary: r, alternates: [], hidden: 0, status: 'ok' };
}
const rules = (steps: RoutineStep[], d = data) => checkRoutineConflicts(scheduleRoutine(steps), d.index).map((c) => `${c.rule}:${c.time ?? '-'}`);
const sunscreen = () => step('sunscreen', ['Zinc Oxide']);

describe('整套流程的搭配检查', () => {
  it('没有冲突的流程', () => {
    expect(rules([step('cleanser', ['Water']), step('moisturizer', ['Water']), sunscreen()])).toEqual([]);
  });

  it('过氧化苯甲酰与 A 醇类：能错开时自动错开，不报冲突；品牌限定都在晚上时报冲突', () => {
    expect(rules([step('treatment', ['Water', 'Retinol']), step('spot', ['Water', 'Benzoyl Peroxide']), sunscreen()])).toEqual([]);
    expect(rules([step('treatment', ['Water', 'Retinol']), step('spot', ['Water', 'Benzoyl Peroxide'], { useTime: 'pm' }), sunscreen()]))
      .toEqual(['bpo_retinoid:pm']);
  });

  it('A 醇类 + 每周去角质：提示去角质那晚不用 A 醇类', () => {
    const c = checkRoutineConflicts(scheduleRoutine([step('exfoliator', ['Water', 'Glycolic Acid']), step('treatment', ['Water', 'Retinol']), sunscreen()]), data.index);
    expect(c.map((x) => x.rule)).toContain('retinoid_exfoliant');
    expect(c.find((x) => x.rule === 'retinoid_exfoliant')!.advice.zh).toBe('去角质的那晚不用 A 醇类');
    expect(c.find((x) => x.rule === 'retinoid_exfoliant')!.source!.url).toContain('aad.org');
  });

  it('同一时段两个去角质类产品（含水杨酸洁面）', () => {
    expect(rules([step('cleanser', ['Water', 'Salicylic Acid']), step('exfoliator', ['Water', 'Glycolic Acid']), sunscreen()])).toContain('multi_exfoliant:pm');
  });

  it('维生素 C + 过氧化苯甲酰同在早上：行业惯例，没有出处链接', () => {
    const c = checkRoutineConflicts(scheduleRoutine([step('treatment', ['Water', 'Ascorbic Acid']), step('spot', ['Water', 'Benzoyl Peroxide'], { useTime: 'am' }), sunscreen()]), data.index);
    const v = c.find((x) => x.rule === 'vitc_bpo')!;
    expect(v.time).toBe('am');
    expect(v.source).toBeNull();
  });

  it('有果酸或 A 醇类但流程里没有防晒产品时提醒', () => {
    expect(rules([step('treatment', ['Water', 'Retinol'])])).toEqual(['photosensitive_no_sunscreen:-']);
  });

  it('成分库的 conflicts_with 也检查', () => {
    const lib: Ingredient[] = real.ingredients.map((i) => (i.inciName === 'Niacinamide' ? { ...i, conflictsWith: [{ inci: 'Panthenol', severity: 'mild' }] } : i));
    const d = { ...data, index: buildIngredientIndex(lib) };
    expect(rules([step('treatment', ['Water', 'Niacinamide'], {}, d), step('moisturizer', ['Water', 'Panthenol'], {}, d), sunscreen()], d)).toContain('ingredient:pm');
  });
});

describe('首选避开冲突', () => {
  const run = (products: Product[], picks = {}) => buildScheduledRoutine({
    products, face: { ...EMPTY_FACE, concerns: ['pores'] }, statuses: [], avoidIngredients: [], avoidTags: [],
    data, classes: real.faceActiveClasses, picks,
  });
  // 洁面没有分到需求（毛孔只分给精华和去角质），按温和程度和价格排序：含水杨酸的那款更便宜，排第一
  const products = [
    { ...mk('CL-US-801', 'cleanser', ['Water', 'Salicylic Acid', 'Glycerin']), price: 5 },
    { ...mk('CL-US-802', 'cleanser', ['Water', 'Glycerin']), price: 9 },
    { ...mk('EX-US-801', 'exfoliator', ['Water', 'Glycolic Acid']), usageType: 'leave_on' as const, claimedBenefits: ['pores' as const] },
  ];

  it('同等级里有不冲突的产品时换成它', () => {
    const r = run(products);
    expect(r.routine.steps.find((s) => s.step.id === 'cleanser')!.primary!.product.productId).toBe('CL-US-802');
    expect(r.conflicts.filter((c) => c.rule === 'multi_exfoliant')).toEqual([]);
  });

  it('用户自己选的不换，冲突写在顶部', () => {
    const r = run(products, { cleanser: 'CL-US-801' });
    expect(r.routine.steps.find((s) => s.step.id === 'cleanser')!.primary!.product.productId).toBe('CL-US-801');
    expect(r.conflicts.map((c) => c.rule)).toContain('multi_exfoliant');
  });
});
