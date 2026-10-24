import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import type { FaceAttributes, Product } from '../data/types';
import { EMPTY_FACE, type FaceAnswers } from '../profile/faceQuestionnaire';
import { computeBudgetCaps } from './budget';
import { evidenceFor } from './evidence';
import { buildFaceSteps, STEP_CATEGORY, type FaceStepId } from './faceSteps';
import { faceScoringProfile, scoreFaceProduct } from './faceScore';
import { checkRoutineConflicts } from './faceConflicts';
import { scheduleRoutine } from './faceSchedule';
import type { RoutineStep } from './faceRoutine';
import { needRows } from './cardData';

const real = loadDataFromDisk();
const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates) };
const lib = (n: string) => real.ingredients.find((i) => i.inciName === n)!;
const cl = real.products.find((p) => p.productId === 'CL-US-001')!;
const FACE: FaceAttributes = {
  skinTypeClaim: [], texture: null, spf: 50, broadSpectrum: 'yes', waterResistance: 'unknown',
  activeConcentrations: [], useTime: 'unknown', useFrequency: '', nonComedogenicClaim: 'unknown', faceStepNote: '',
};
const mk = (id: string, category: string, inciList: string[], extra: Partial<Product> = {}, face: Partial<FaceAttributes> = {}): Product => ({
  ...cl, productId: id, nameZh: id, nameEn: id, category, usageType: null, inciList, inciNameUnverified: [], keyActives: [], keyActivesDisclosed: true,
  claimedBenefits: [], brandClaims: { ...cl.brandClaims, targets: [], text: '', status: null }, ...extra, face: { ...FACE, ...face },
});
function score(p: Product, face: Partial<FaceAnswers>, stepId: FaceStepId) {
  const f = { ...EMPTY_FACE, ...face };
  const step = buildFaceSteps(f, { statuses: [] }).find((s) => s.id === stepId)
    ?? { id: stepId, category: STEP_CATEGORY[stepId], tier: 'optional' as const, needs: [...f.concerns], becauseOf: [], weekly: false };
  const profile = faceScoringProfile(f, step, { specialStatus: 'none', avoidIngredients: [], avoidTags: [] });
  return { r: scoreFaceProduct(p, profile, data, { face: f, step, classes: real.faceActiveClasses }), step, profile };
}

describe('面部有效成分导入', () => {
  it('33 个成分已核对；已有成分按需求合并、保留原有目标', () => {
    expect(lib('Niacinamide').targets).toEqual(expect.arrayContaining(['oil', 'redness', 'pigmentation', 'aging', 'pores']));
    expect(lib('Panthenol').evidenceByTarget).toMatchObject({ dryness: 'B', damage: 'C', scalp_itch: 'C', redness: 'B' });
    expect(lib('Salicylic Acid').evidenceByTarget).toMatchObject({ dandruff: 'A', scalp_oil: 'C', acne: 'A' });
    expect(lib('Retinol').reviewStatus).toBe('verified');
    expect(lib('Retinol').pregnancyNote).toBe('avoid');
    expect(lib('Retinol').riskTags).toContain('pregnancy_caution');
  });

  it('神经酰胺统一按 C 级（含洗护数据中的 NP、AP、EOP）', () => {
    for (const n of ['Ceramide NP', 'Ceramide AP', 'Ceramide EOP', 'Ceramide NG', 'Ceramide AG']) expect(lib(n).evidenceByTarget!.dryness).toBe('C');
  });

  it('Zinc Sulfate 只保留记录，没有功效目标', () => {
    expect(lib('Zinc Sulfate').targets).toEqual([]);
  });

  it('证据为"未知"时按缺数据处理，不会高于 C 级', () => {
    expect(lib('Hydrolyzed Hyaluronic Acid').evidenceByTarget!.aging).toBe('unknown');
    expect(evidenceFor(lib('Hydrolyzed Hyaluronic Acid'), 'aging', 'leave_on')).toBeNull();
    const { r } = score(mk('SE-US-801', 'serum', ['Water', 'Hydrolyzed Hyaluronic Acid']), { concerns: ['aging'] }, 'treatment');
    expect(r.dimensions.evidence.score).toBe(40);
  });

  it('壬二酸：化妆品浓度（低于 15% 或没有公开）降一级', () => {
    const az = lib('Azelaic Acid');
    expect(evidenceFor(az, 'acne', 'leave_on', { face: { ...FACE, activeConcentrations: [{ inci: 'Azelaic Acid', concentration: '10%', url: 'https://a.example' }] }, keyActives: [] })?.level).toBe('B');
    expect(evidenceFor(az, 'acne', 'leave_on', { face: FACE, keyActives: [] })?.level).toBe('B');
    expect(evidenceFor(az, 'acne', 'leave_on', { face: { ...FACE, activeConcentrations: [{ inci: 'Azelaic Acid', concentration: '15%', url: 'https://a.example' }] }, keyActives: [] })?.level).toBe('A');
  });
});

describe('氧化锌、二氧化钛的 aging:A 只在防晒且为活性成分时计分', () => {
  it('防晒里公开为活性成分：计入细纹需求', () => {
    const sun = mk('SU-US-801', 'sunscreen', ['Zinc Oxide', 'Water'], {}, { activeConcentrations: [{ inci: 'Zinc Oxide', concentration: '20%', url: 'https://a.example' }] });
    const { r } = score(sun, { concerns: ['aging'] }, 'sunscreen');
    // 防晒这一步不分配 aging 需求，所以直接用精华步骤的需求检查成分匹配
    const t = score({ ...sun }, { concerns: ['aging'] }, 'treatment');
    expect(t.r.needMatches[0].ingredients.map((i) => i.inciName)).toContain('Zinc Oxide');
    expect(r.faceExtras.sunscreen).toBe('ok');
    // "允许最高25%"是上限，不是有效下限：20% 不提示浓度偏低
    expect(r.notices.some((n) => n.code === 'below_range')).toBe(false);
    expect(t.r.notices.some((n) => n.code === 'below_range')).toBe(false);
  });

  it('作为色料出现在其他产品、或防晒里没有公开为活性成分：不计', () => {
    const tinted = mk('MO-US-801', 'moisturizer', ['Water', 'Titanium Dioxide']);
    expect(score(tinted, { concerns: ['aging'] }, 'treatment').r.needMatches[0].ingredients).toEqual([]);
    const sunInactive = mk('SU-US-802', 'sunscreen', ['Avobenzone', 'Zinc Oxide'], {}, { activeConcentrations: [{ inci: 'Avobenzone', concentration: '3%', url: 'https://a.example' }] });
    expect(score(sunInactive, { concerns: ['aging'] }, 'treatment').r.needMatches[0].ingredients).toEqual([]);
  });
});

describe('搭配提醒（data/face_conflicts.csv）', () => {
  const step = (id: FaceStepId, p: Product): RoutineStep => {
    const { r, step: s, profile } = score(p, {}, id);
    return { step: s, profile, ranked: [r], eligible: [r], primary: r, alternates: [], hidden: 0, status: 'ok' };
  };

  it('Sulfur 对应 C05、C07，显示为提醒并附出处', () => {
    expect(lib('Sulfur').conflictsWith.map((c) => c.inci).sort()).toEqual(['Adapalene', 'Benzoyl Peroxide']);
    const steps = [step('spot', mk('ST-US-801', 'spot_treatment', ['Water', 'Sulfur'])), step('treatment', mk('SE-US-802', 'serum', ['Water', 'Adapalene']))];
    const c = checkRoutineConflicts(scheduleRoutine(steps), data.index, real.faceConflictNotes);
    const rem = c.find((x) => x.rule === 'ingredient')!;
    expect(rem.severity).toBe('mild');
    expect(rem.advice.zh.startsWith('提醒：')).toBe(true);
    expect(rem.source!.label).toContain('C05');
  });

  it('与类别规则重复的同一对产品只报一次', () => {
    // 阿达帕林 + 水杨酸精华：类别规则（A 醇类 + 去角质）和 C04 都适用
    const steps = [step('treatment', mk('SE-US-803', 'serum', ['Water', 'Adapalene', 'Salicylic Acid'])), step('spot', mk('ST-US-802', 'spot_treatment', ['Water', 'Salicylic Acid']))];
    const c = checkRoutineConflicts(scheduleRoutine(steps), data.index, real.faceConflictNotes);
    const pairs = c.filter((x) => x.products.length === 2).map((x) => x.products.map((p) => p.product.productId).sort().join(','));
    expect(pairs.filter((k) => k === 'SE-US-803,ST-US-802').length).toBeGreaterThanOrEqual(1);
    expect(c.filter((x) => x.rule === 'ingredient')).toEqual([]);
  });
});

describe('PanOxyl 10%（CL-US-013）', () => {
  it('痘痘需求显示"满足"（过氧化苯甲酰 A 级，主打成分）', () => {
    const p = real.products.find((x) => x.productId === 'CL-US-013')!;
    const { r } = score(p, { concerns: ['acne'] }, 'cleanser');
    const row = needRows(r).find((x) => x.label.zh.includes('痘'))!;
    expect(row.result).toBe('met');
    expect(r.dimensions.evidence.reason.zh).toContain('A 级');
  });
});
