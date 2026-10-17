import { describe, expect, it } from 'vitest';
import {
  EMPTY_HAIR, adviseCare, hairTargets, isSensitiveScalp, moneyToUsd, scalpMedicalAlerts, scalpTargets, scopeCategories, toScoringProfile,
  type Answers, type BaseAnswers, type HairAnswers, type ScalpAnswers,
} from './questionnaire';
import {
  STORAGE_KEY, activeProfile, emptyStore, loadStore, newProfile, removeProfile, saveStore, upsertProfile,
  type KeyValueStorage,
} from './storage';

const memory = (): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

const noScalp: ScalpAnswers = { concerns: [], oilTiming: null, washFrequency: null };
const ctx = { cities: [], exchangeRates: [{ currency: 'USD', perUsd: 1, dataDate: '2026-10-09', source: '' }] };
const answers = (a: { base?: Partial<BaseAnswers>; scalp?: Partial<ScalpAnswers>; hair?: Partial<HairAnswers> }): Answers => ({
  base: { ...newProfile('我', 'me').base, ...a.base },
  scalp: { ...noScalp, ...a.scalp },
  hair: { ...EMPTY_HAIR, ...a.hair },
});

describe('头皮问卷映射', () => {
  it('多选困扰映射到 targets，发红 → scalp_redness，头皮干 → dry_scalp，当天变油 → scalp_oil', () => {
    expect(scalpTargets({ concerns: ['dandruff', 'redness', 'dry_tight'], oilTiming: 'same_day', washFrequency: null }))
      .toEqual(['dandruff', 'scalp_redness', 'dry_scalp', 'scalp_oil']);
    expect(scalpTargets({ concerns: [], noConcerns: true, oilTiming: 'three_plus_days', washFrequency: null })).toEqual([]);
  });

  it('瘙痒 4 分及以上（或没填分数）视为敏感头皮，1–3 分只算头皮痒', () => {
    expect(scalpTargets({ ...noScalp, concerns: ['itch'], itchScore: 2 })).toEqual(['scalp_itch']);
    expect(scalpTargets({ ...noScalp, concerns: ['itch'], itchScore: 5 })).toEqual(['scalp_itch', 'sensitive_scalp']);
    expect(isSensitiveScalp({ ...noScalp, concerns: ['itch'], itchScore: null })).toBe(true);
  });

  it('头皮屑"伴红斑、反复不好"触发就医提示', () => {
    const alerts = scalpMedicalAlerts({ ...noScalp, concerns: ['dandruff'], dandruffType: 'red_recurring' });
    expect(alerts.map((a) => a.code)).toEqual(['dandruff_red_recurring']);
    expect(alerts[0].text.zh).toContain('皮肤科医生');
    expect(scalpMedicalAlerts({ ...noScalp, concerns: ['dandruff'], dandruffType: 'dry_fine' })).toEqual([]);
    // 没选头皮屑时这道追问不生效
    expect(scalpMedicalAlerts({ ...noScalp, dandruffType: 'red_recurring' })).toEqual([]);
  });

  it('瘙痒 7 分及以上触发就医提示，6 分不触发', () => {
    expect(scalpMedicalAlerts({ ...noScalp, concerns: ['itch'], itchScore: 7 }).map((a) => a.code)).toEqual(['itch_severe']);
    expect(scalpMedicalAlerts({ ...noScalp, concerns: ['itch'], itchScore: 6 })).toEqual([]);
    expect(scalpMedicalAlerts({ ...noScalp, itchScore: 9 })).toEqual([]);
  });

  it('短期大量或成片脱发触发就医提示', () => {
    const alerts = scalpMedicalAlerts({ ...noScalp, concerns: ['hair_loss'], hairLossLevel: 'sudden_or_patchy' });
    expect(alerts.map((a) => a.code)).toEqual(['hair_loss_sudden']);
  });
});

describe('头发问卷映射', () => {
  it('发丝状态和期望效果映射到 targets；香味好闻不对应困扰；最多取 3 个效果', () => {
    expect(hairTargets({ ...EMPTY_HAIR, conditions: ['tangling', 'colored', 'breakage'] })).toEqual(['tangling', 'color_fade', 'damage']);
    expect(hairTargets({ ...EMPTY_HAIR, goals: ['smooth', 'scent'] })).toEqual(['frizz', 'tangling']);
    expect(hairTargets({ ...EMPTY_HAIR, goals: ['volume', 'shine', 'curl', 'clean'] })).toEqual(['flat_hair', 'shine', 'curl_definition']);
  });
});

describe('转换为打分输入', () => {
  it('洗发水侧重头皮：头皮困扰权重 2，发丝 1；护发素只看发丝', () => {
    const a = answers({ scalp: { concerns: ['dandruff'] }, hair: { goals: ['smooth'] } });
    const sh = toScoringProfile(a, 'shampoo', ctx);
    expect(sh.concerns).toEqual(['dandruff', 'frizz', 'tangling']);
    expect(sh.targetWeights).toEqual({ dandruff: 2, frizz: 1, tangling: 1 });
    const co = toScoringProfile(a, 'conditioner', ctx);
    expect(co.concerns).toEqual(['frizz', 'tangling']);
    expect(co.sensitive).toBe(false);
  });

  it('两者都遵守想避开的成分；香味偏好传入', () => {
    const a = answers({ base: { avoid: ['fragrance'], avoidIngredients: ['Coumarin'] }, hair: { fragrancePref: 'free_first' } });
    for (const c of ['shampoo', 'conditioner'] as const) {
      const p = toScoringProfile(a, c, ctx);
      expect(p.avoidTags).toEqual(['fragrance']);
      expect(p.avoidIngredients).toEqual(['Coumarin']);
      expect(p.fragrancePref).toBe('free_first');
    }
  });

  it('预算：档位、自填单品金额换算成 USD；按整套时单品不按档位筛选', () => {
    const tier = toScoringProfile(answers({ base: { budgets: { shampoo: 'p33' } } }), 'shampoo', ctx);
    expect(tier.budget).toBe('p33');
    const custom = toScoringProfile(answers({ base: { budgets: { shampoo: 'custom' }, customBudgets: { shampoo: { amount: 15, currency: 'USD' } } } }), 'shampoo', ctx);
    expect(custom).toMatchObject({ budget: 'custom', customBudgetUsd: 15 });
    const set = toScoringProfile(answers({ base: { budgetMode: 'set', budgets: { shampoo: 'p33' }, setBudget: { amount: 40, currency: 'USD' } } }), 'shampoo', ctx);
    expect(set.budget).toBe('none');
    expect(moneyToUsd({ amount: 0, currency: 'USD' }, ctx.exchangeRates)).toBeNull();
  });
});

describe('"帮我判断"', () => {
  it('已有满意的护发素 → 只换洗发水', () => {
    expect(adviseCare({ ...EMPTY_HAIR, conditions: ['dry'], hasConditioner: 'satisfied' }).categories).toEqual(['shampoo']);
  });

  it('细软、想蓬松、没有干涩打结 → 只用洗发水，并说明护发素只涂发尾', () => {
    const a = adviseCare({ ...EMPTY_HAIR, thickness: 'fine', goals: ['volume'] });
    expect(a.categories).toEqual(['shampoo']);
    expect(a.reasons[0].zh).toContain('只涂发尾');
  });

  it('染烫受损 → 洗发水 + 护发素；接受额外步骤时建议发膜', () => {
    const simple = adviseCare({ ...EMPTY_HAIR, conditions: ['colored', 'permed_bleached'], carePref: 'simple' });
    expect(simple).toMatchObject({ categories: ['shampoo', 'conditioner'], suggestMask: false });
    expect(adviseCare({ ...EMPTY_HAIR, conditions: ['colored'], carePref: 'extra' }).suggestMask).toBe(true);
    expect(scopeCategories('help', { ...EMPTY_HAIR, texture: 'curly' })).toEqual(['shampoo', 'conditioner']);
    expect(scopeCategories(null, EMPTY_HAIR)).toEqual(['shampoo']);
  });
});

describe('本地档案存储', () => {
  it('保存后可读回，支持多份档案', () => {
    const s = memory();
    let store = upsertProfile(emptyStore(), newProfile('我', 'me'));
    store = upsertProfile(store, newProfile('妈妈', 'mom'));
    expect(saveStore(store, s)).toBe(true);
    const loaded = loadStore(s);
    expect(loaded.profiles.map((p) => p.name)).toEqual(['我', '妈妈']);
    expect(activeProfile(loaded)?.id).toBe('me');
    expect(activeProfile(removeProfile(loaded, 'me'))?.id).toBe('mom');
  });

  it('旧档案（没有头发答案和新预算字段）读取时补齐默认值', () => {
    const s = memory();
    const old = { id: 'me', name: '我', base: { cityKey: null, budgets: { shampoo: 'p33' }, specialStatus: 'none', avoid: [], avoidIngredients: [] }, scalp: null, inUseProductIds: [], updatedAt: '' };
    s.data.set(STORAGE_KEY, JSON.stringify({ version: 1, activeId: 'me', profiles: [old] }));
    const p = activeProfile(loadStore(s))!;
    expect(p.base).toMatchObject({ budgets: { shampoo: 'p33' }, budgetMode: 'item', customBudgets: {}, setBudget: null, scope: null });
    expect(p.hair).toBeNull();
  });

  it('数据损坏、版本未知或存储不可用时返回空档案，不抛错', () => {
    const s = memory();
    s.data.set(STORAGE_KEY, '{not json');
    expect(loadStore(s)).toEqual(emptyStore());
    s.data.set(STORAGE_KEY, JSON.stringify({ version: 999, profiles: [] }));
    expect(loadStore(s)).toEqual(emptyStore());
    expect(loadStore(null)).toEqual(emptyStore());
    const throwing: KeyValueStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
    expect(loadStore(throwing)).toEqual(emptyStore());
    expect(saveStore(emptyStore(), throwing)).toBe(false);
  });
});
