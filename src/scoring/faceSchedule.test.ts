import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import type { FaceAttributes, Product } from '../data/types';
import { EMPTY_FACE } from '../profile/faceQuestionnaire';
import { computeBudgetCaps } from './budget';
import { faceScoringProfile, scoreFaceProduct } from './faceScore';
import type { RoutineStep } from './faceRoutine';
import { scheduleRoutine, productTimes } from './faceSchedule';
import { STEP_CATEGORY, type FaceStepId } from './faceSteps';

const real = loadDataFromDisk();
const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: true };
const cl = real.products.find((p) => p.productId === 'CL-US-001')!;
const FACE: FaceAttributes = {
  skinTypeClaim: [], texture: null, spf: 50, broadSpectrum: 'yes', waterResistance: 'unknown',
  activeConcentrations: [], useTime: 'unknown', useFrequency: '', nonComedogenicClaim: 'unknown', faceStepNote: '',
};

function step(id: FaceStepId, inciList: string[], face: Partial<FaceAttributes> = {}): RoutineStep {
  const s = { id, category: STEP_CATEGORY[id], tier: 'optional' as const, needs: [], becauseOf: [], weekly: id === 'exfoliator' };
  const p: Product = { ...cl, productId: `${id}-1`, category: STEP_CATEGORY[id], usageType: null, inciList, inciNameUnverified: [], face: { ...FACE, ...face } };
  const profile = faceScoringProfile(EMPTY_FACE, s, { specialStatus: 'none', avoidIngredients: [], avoidTags: [] });
  const r = scoreFaceProduct(p, profile, data, { face: EMPTY_FACE, step: s, classes: real.faceActiveClasses });
  return { step: s, profile, ranked: [r], eligible: [r], primary: r, alternates: [], hidden: 0, status: 'ok' };
}
const ids = (list: { step: RoutineStep }[]) => list.map((x) => x.step.step.id);

describe('早晚流程', () => {
  it('洁面、保湿早晚都有；防晒只在早上；去角质只在晚上', () => {
    const s = scheduleRoutine([step('cleanser', ['Water']), step('exfoliator', ['Water', 'Glycolic Acid']), step('moisturizer', ['Water']), step('sunscreen', ['Zinc Oxide'])]);
    expect(ids(s.am)).toEqual(['cleanser', 'moisturizer', 'sunscreen']);
    expect(ids(s.pm)).toEqual(['cleanser', 'exfoliator', 'moisturizer']);
    expect(s.pm.find((x) => x.step.step.id === 'exfoliator')!.weekly).toBe(true);
    expect(s.am[0].bothTimes).toBe(true);
  });

  it('精华：品牌说明优先；未知时 A 醇类晚上、维生素 C 早上、其他晚上', () => {
    expect(productTimes('treatment', step('treatment', ['Water', 'Retinol']).primary)).toEqual(['pm']);
    expect(productTimes('treatment', step('treatment', ['Water', 'Ascorbic Acid']).primary)).toEqual(['am']);
    expect(productTimes('treatment', step('treatment', ['Water', 'Niacinamide']).primary)).toEqual(['pm']);
    expect(productTimes('treatment', step('treatment', ['Water', 'Retinol'], { useTime: 'both' }).primary)).toEqual(['am', 'pm']);
    expect(productTimes('treatment', step('treatment', ['Water', 'Ascorbic Acid'], { useTime: 'pm' }).primary)).toEqual(['pm']);
  });

  it('晚上有 A 醇类时，过氧化苯甲酰点涂移到早上并写明原因；品牌限定晚上用的不移', () => {
    const s = scheduleRoutine([step('treatment', ['Water', 'Retinol']), step('spot', ['Water', 'Benzoyl Peroxide'])]);
    expect(ids(s.am)).toEqual(['spot']);
    expect(s.am[0].movedReason).toBe('bpo_retinoid');
    const fixed = scheduleRoutine([step('treatment', ['Water', 'Retinol']), step('spot', ['Water', 'Benzoyl Peroxide'], { useTime: 'pm' })]);
    expect(ids(fixed.pm)).toEqual(['treatment', 'spot']);
  });
});
