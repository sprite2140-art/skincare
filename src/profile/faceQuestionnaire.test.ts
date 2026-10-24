import { describe, expect, it } from 'vitest';
import { EMPTY_FACE, faceMedicalAlerts, migrateFace, prefersWaterResistant, type FaceAnswers } from './faceQuestionnaire';
import { baseStatuses } from './questionnaire';
import { loadStore, newProfile, STORAGE_KEY, STORE_VERSION } from './storage';
import { buildFaceSteps } from '../scoring/faceSteps';
import { statusesOf } from '../scoring/score';

const face = (a: Partial<FaceAnswers>): FaceAnswers => ({ ...EMPTY_FACE, ...a });
const ids = (a: Partial<FaceAnswers>, statuses: Parameters<typeof buildFaceSteps>[1]['statuses'] = [], basicOnly = false) =>
  buildFaceSteps(face(a), { statuses, basicOnly }).map((s) => s.id);

describe('护肤问卷', () => {
  it('困扰最多 3 项，去重；没选痘痘时不保留痘痘情况', () => {
    const a = migrateFace({ concerns: ['acne', 'oil', 'acne', 'pores', 'aging'], acneSeverity: 'severe' });
    expect(a.concerns).toEqual(['acne', 'oil', 'pores']);
    expect(migrateFace({ concerns: ['oil'], acneSeverity: 'severe' }).acneSeverity).toBeNull();
  });

  it('就医提示只在痘痘选了"大面积，或有疼痛的大包"时出现，不出现病名', () => {
    expect(faceMedicalAlerts(face({ concerns: ['acne'], acneSeverity: 'recurring' }))).toEqual([]);
    const [alert] = faceMedicalAlerts(face({ concerns: ['acne'], acneSeverity: 'severe' }));
    expect(alert.zh).toContain('建议找皮肤科医生看看');
  });

  it('户外 2 小时以上或会出汗时优先防水', () => {
    expect(prefersWaterResistant(face({ outdoor: 'over_2h' }))).toBe(true);
    expect(prefersWaterResistant(face({ sweat: 'sometimes' }))).toBe(true);
    expect(prefersWaterResistant(face({ outdoor: '30m_2h', sweat: 'rarely' }))).toBe(false);
  });
});

describe('步骤由困扰决定', () => {
  it('没有选困扰：基础 3 步', () => {
    expect(ids({})).toEqual(['cleanser', 'moisturizer', 'sunscreen']);
    expect(ids({ noConcerns: true, concerns: ['acne'] })).toEqual(['cleanser', 'moisturizer', 'sunscreen']);
  });

  it('只选出油、干燥：不加步骤，只影响基础步骤的挑选', () => {
    const steps = buildFaceSteps(face({ concerns: ['dryness'] }), { statuses: [] });
    expect(steps.map((s) => s.id)).toEqual(['cleanser', 'moisturizer', 'sunscreen']);
    expect(steps.find((s) => s.id === 'moisturizer')!.needs).toEqual(['dryness']);
  });

  it('痘痘 → 点涂；暗沉、细纹、泛红、毛孔 → 一个功效精华；毛孔、暗沉、出油 → 每周去角质；按完整顺序排列', () => {
    const steps = buildFaceSteps(face({ concerns: ['pigmentation', 'acne', 'aging'] }), { statuses: [] });
    expect(steps.map((s) => s.id)).toEqual(['cleanser', 'exfoliator', 'treatment', 'spot', 'moisturizer', 'sunscreen']);
    const treatment = steps.find((s) => s.id === 'treatment')!;
    expect(treatment.tier).toBe('optional');
    expect(treatment.needs).toEqual(['pigmentation', 'aging']);
    expect(steps.find((s) => s.id === 'exfoliator')!.weekly).toBe(true);
    expect(steps.find((s) => s.id === 'sunscreen')!.needs).toEqual(['pigmentation', 'acne']);
  });

  it('经常敏感、或在用处方药 / 异维 A 酸：不出现去角质；口服异维 A 酸时也不出现点涂', () => {
    expect(ids({ concerns: ['pores'], sensitivity: 'often' })).not.toContain('exfoliator');
    expect(ids({ concerns: ['pores'], sensitivity: 'sometimes' })).toContain('exfoliator');
    expect(ids({ concerns: ['acne', 'pores'] }, ['isotretinoin'])).toEqual(['cleanser', 'treatment', 'moisturizer', 'sunscreen']);
    expect(ids({ concerns: ['acne', 'aging'] }, ['rx'])).toEqual(['cleanser', 'treatment', 'spot', 'moisturizer', 'sunscreen']);
  });

  it('"只看基础 3 步"开关', () => {
    expect(ids({ concerns: ['acne', 'aging'] }, [], true)).toEqual(['cleanser', 'moisturizer', 'sunscreen']);
  });
});

describe('特殊状态多选', () => {
  it('旧档案的单选特殊状态迁移为列表', () => {
    const p = newProfile('我', 'p1');
    const old = { ...p, base: { ...p.base, specialStatus: 'rx' as const, specialStatuses: undefined } };
    const mem = new Map([[STORAGE_KEY, JSON.stringify({ version: STORE_VERSION, activeId: 'p1', profiles: [old] })]]);
    const store = loadStore({ getItem: (k) => mem.get(k) ?? null, setItem: () => {} });
    expect(baseStatuses(store.profiles[0].base)).toEqual(['rx']);
    expect(store.profiles[0].face).toBeNull();
  });

  it('多选时各项都生效；"无"不算', () => {
    expect(statusesOf({ specialStatus: 'none', specialStatuses: ['pregnant', 'isotretinoin'] })).toEqual(['pregnant', 'isotretinoin']);
    expect(statusesOf({ specialStatus: 'none' })).toEqual([]);
    expect(statusesOf({ specialStatus: 'rx' })).toEqual(['rx']);
  });
});
