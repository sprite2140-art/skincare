// 2026-11-03 低价补缺（去角质 EX-US-021—026、洁面 CL-US-041—046、保湿 MO-US-041—046）。
import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from './node';
import { reviewCountBasis } from './parse';
import { EMPTY_FACE, type FaceAnswers } from '../profile/faceQuestionnaire';
import { computeBudgetCaps } from '../scoring/budget';
import { faceScoringProfile, scoreFaceProduct } from '../scoring/faceScore';
import { checkRoutineConflicts } from '../scoring/faceConflicts';
import type { RoutineStep } from '../scoring/faceRoutine';
import { scheduleRoutine } from '../scoring/faceSchedule';
import { STEP_CATEGORY, type FaceStepId } from '../scoring/faceSteps';
import type { SpecialStatus } from '../scoring/score';

const real = loadDataFromDisk();
const byId = (id: string) => real.products.find((p) => p.productId === id)!;
const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: false };
const BATCH = [21, 22, 23, 24, 25, 26].map((n) => `EX-US-0${n}`)
  .concat([41, 42, 43, 44, 45, 46].map((n) => `CL-US-0${n}`), [41, 42, 43, 44, 45, 46].map((n) => `MO-US-0${n}`));

function scored(id: string, face: Partial<FaceAnswers>, statuses: SpecialStatus[] = []) {
  const p = byId(id);
  const f = { ...EMPTY_FACE, skinType: 'normal' as const, sensitivity: 'rarely' as const, ...face };
  const stepId = (p.category === 'exfoliator' ? 'exfoliator' : p.category) as FaceStepId;
  const step = { id: stepId, category: STEP_CATEGORY[stepId], tier: 'basic' as const, needs: [], becauseOf: [], weekly: stepId === 'exfoliator' };
  const profile = faceScoringProfile(f, step, { specialStatus: statuses[0] ?? 'none', specialStatuses: statuses, avoidIngredients: [], avoidTags: [] });
  const r = scoreFaceProduct(p, profile, data, { face: f, step, classes: real.faceActiveClasses });
  return { r, step, profile };
}
const codes = (id: string, face: Partial<FaceAnswers>, statuses: SpecialStatus[] = []) => scored(id, face, statuses).r.exclusions.map((e) => e.code);

describe('低价补缺 18 款（2026-11-03）', () => {
  it('18 款都入库，入库依据为评价数，且评分表里有认可平台 1,000 条以上的记录', () => {
    for (const id of BATCH) {
      const p = byId(id);
      expect(p, id).toBeDefined();
      expect(p.inclusionBasisType, id).toBe('review_count');
      expect(reviewCountBasis(p.ratings), id).not.toBeNull();
      expect(p.inclusionPending, id).toBeFalsy();
      expect(p.purchasePending, id).toBeFalsy();
    }
  });

  it('去角质误填的 subtype（chemical / physical）清空并记入 formula_note；MO-US-046 为 ointment', () => {
    expect(byId('EX-US-021').subtype).toBeNull();
    expect(byId('EX-US-021').formulaNote).toContain('原 subtype）：chemical');
    expect(byId('EX-US-026').formulaNote).toContain('原 subtype）：physical');
    expect(byId('MO-US-046').subtype).toBe('ointment');
  });

  it('成分别名：purified water、AQUA / WATER → Water；Masking Fragrance、Fragrance (Parfum) → Parfum；两处拼写错误按正确 INCI 匹配，[待核对] 保留', () => {
    const name = (raw: string) => real.ingredientIndex.get(raw)?.inciName.toLowerCase();
    expect(name('purified water')).toBe('aqua');
    expect(name('AQUA / WATER')).toBe('aqua');
    expect(name('Masking Fragrance')).toBe('fragrance');
    expect(name('Fragrance (Parfum)')).toBe('fragrance');
    expect(name('ethylhexlglycerin')).toBe('ethylhexylglycerin');
    expect(name('Magnessium Aluminum Silicate')).toBe('magnesium aluminum silicate');
    expect(byId('EX-US-022').inciNameUnverified).toContain('ethylhexlglycerin');
    expect(byId('MO-US-044').inciNameUnverified).toContain('Magnessium Aluminum Silicate');
  });

  it('MO-US-042、044、045 保留 retail_mismatch', () => {
    for (const id of ['MO-US-042', 'MO-US-044', 'MO-US-045']) expect(byId(id).brandClaims.status, id).toBe('retail_mismatch');
  });

  it('EX-US-026 粗颗粒物理磨砂：敏感（偶尔或经常）、长痘、泛红时排除，其他情况照常', () => {
    expect(codes('EX-US-026', {})).not.toContain('coarse_scrub');
    expect(codes('EX-US-026', { concerns: ['oil'] })).not.toContain('coarse_scrub');
    expect(codes('EX-US-026', { sensitivity: 'sometimes' })).toContain('coarse_scrub');
    expect(codes('EX-US-026', { sensitivity: 'often' })).toContain('coarse_scrub');
    expect(codes('EX-US-026', { concerns: ['acne'] })).toContain('coarse_scrub');
    expect(codes('EX-US-026', { concerns: ['redness'] })).toContain('coarse_scrub');
    expect(scored('EX-US-026', { concerns: ['acne'] }).r.exclusions.find((e) => e.code === 'coarse_scrub')!.text.zh).toContain('Juglans Regia');
  });

  it('MO-US-044 含 0.5% 水杨酸的免洗保湿：参与搭配冲突检查（去角质、A 醇类），孕期提示，处方药 / 异维 A 酸排除', () => {
    const { r } = scored('MO-US-044', {});
    expect(r.faceExtras.classes.get('bha')).toEqual(['Salicylic Acid']);
    const mk = (id: FaceStepId, inci: string[]): RoutineStep => {
      const s = { id, category: STEP_CATEGORY[id], tier: 'optional' as const, needs: [], becauseOf: [], weekly: id === 'exfoliator' };
      const profile = faceScoringProfile(EMPTY_FACE, s, { specialStatus: 'none', avoidIngredients: [], avoidTags: [] });
      const x = scoreFaceProduct({ ...byId('CL-US-001'), productId: `${id}-x`, category: STEP_CATEGORY[id], usageType: null, inciList: inci }, profile, data, { face: EMPTY_FACE, step: s, classes: real.faceActiveClasses });
      return { step: s, profile, ranked: [x], eligible: [x], primary: x, alternates: [], hidden: 0, status: 'ok' };
    };
    const mo = scored('MO-US-044', {});
    const moStep: RoutineStep = { step: mo.step, profile: mo.profile, ranked: [mo.r], eligible: [mo.r], primary: mo.r, alternates: [], hidden: 0, status: 'ok' };
    const sun = mk('sunscreen', ['Zinc Oxide']);
    const rules = (steps: RoutineStep[]) => checkRoutineConflicts(scheduleRoutine(steps), data.index).map((c) => c.rule);
    expect(rules([moStep, mk('exfoliator', ['Water', 'Glycolic Acid']), sun])).toContain('multi_exfoliant');
    expect(rules([moStep, mk('treatment', ['Water', 'Retinol']), sun])).toContain('retinoid_exfoliant');
    expect(scored('MO-US-044', {}, ['pregnant']).r.notices.map((n) => n.code)).toContain('pregnancy_caution_use');
    expect(codes('MO-US-044', {}, ['isotretinoin'])).toContain('rx_actives');
    expect(codes('MO-US-044', {}, ['rx'])).toContain('rx_actives');
  });

  it('MO-US-046 药膏：只推荐给干性或选了"干燥、脱皮"的人，油性皮肤不推荐', () => {
    expect(codes('MO-US-046', {})).toContain('ointment_texture');
    expect(codes('MO-US-046', { skinType: 'combination' })).toContain('ointment_texture');
    expect(codes('MO-US-046', { skinType: 'dry' })).not.toContain('ointment_texture');
    expect(codes('MO-US-046', { skinType: 'normal', concerns: ['dryness'] })).not.toContain('ointment_texture');
    expect(codes('MO-US-046', { skinType: 'oily', concerns: ['dryness'] })).toContain('ointment_texture');
  });
});
