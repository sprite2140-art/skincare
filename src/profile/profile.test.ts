import { describe, expect, it } from 'vitest';
import {
  EMPTY_HAIR, adviseCare, hairTargets, isSensitiveScalp, moneyToUsd, scalpInfoNotes, scalpMedicalAlerts, scalpTargets, scopeCategories,
  migrateScalp, toScoringProfile, toneGoalAvailable,
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

  it('掉发很多、突然大量掉发、成片秃斑触发就医提示（选了掉发才生效）', () => {
    const hl = { ...noScalp, concerns: ['hair_loss' as const] };
    expect(scalpMedicalAlerts({ ...hl, hairLossAmount: 6 }).map((x) => x.code)).toEqual(['hair_loss_heavy']);
    expect(scalpMedicalAlerts({ ...hl, hairLossAmount: 'sudden' }).map((x) => x.code)).toEqual(['hair_loss_heavy']);
    expect(scalpMedicalAlerts({ ...hl, hairLossAmount: 5 })).toEqual([]);
    expect(scalpMedicalAlerts({ ...hl, thinning: ['patches'] }).map((x) => x.code)).toEqual(['hair_loss_patches']);
    expect(scalpMedicalAlerts({ ...noScalp, hairLossAmount: 6, thinning: ['patches'] })).toEqual([]);
    // 旧档案的追问答案在还没回答新题时仍然有效；回答了新的掉发量后以新答案为准
    expect(scalpMedicalAlerts({ ...hl, hairLossLevel: 'sudden_or_patchy' }).map((x) => x.code)).toEqual(['hair_loss_heavy']);
    expect(scalpMedicalAlerts({ ...hl, hairLossLevel: 'sudden_or_patchy', hairLossAmount: 2 })).toEqual([]);
  });

  it('头皮发红：经常发红 + 用后经常不适、经常发红 + 油腻偏黄大片、经常发红 + 头皮屑第 4 级、伴渗液或蔓延', () => {
    expect(scalpMedicalAlerts({ ...noScalp, redness: 'spreading' }).map((x) => x.code)).toEqual(['redness_spreading']);
    expect(scalpMedicalAlerts({ ...noScalp, redness: 'often', discomfort: ['burning'], discomfortFrequency: 'often' }).map((x) => x.code))
      .toEqual(['discomfort_red']);
    expect(scalpMedicalAlerts({ ...noScalp, redness: 'often', discomfort: ['burning'], discomfortFrequency: 'sometimes' })).toEqual([]);
    expect(scalpMedicalAlerts({ ...noScalp, redness: 'occasional', discomfort: ['burning'], discomfortFrequency: 'often' })).toEqual([]);
    const d = { ...noScalp, concerns: ['dandruff' as const], redness: 'often' as const };
    expect(scalpMedicalAlerts({ ...d, dandruffType: 'oily_large' }).map((x) => x.code)).toEqual(['dandruff_oily_red']);
    expect(scalpMedicalAlerts({ ...d, dandruffType: 'dry_fine', dandruffAmount: 4 }).map((x) => x.code)).toEqual(['dandruff_heavy_red']);
    expect(scalpMedicalAlerts({ ...d, redness: 'occasional', dandruffType: 'oily_large', dandruffAmount: 4 })).toEqual([]);
    expect(scalpMedicalAlerts({ ...noScalp, concerns: ['dandruff'], dandruffType: 'thick_scaly' }).map((x) => x.code)).toEqual(['dandruff_thick']);
  });

  it('所有就医提示统一措辞"建议找皮肤科医生看看"，不出现具体病名', () => {
    const all = scalpMedicalAlerts({
      ...noScalp, concerns: ['dandruff', 'itch', 'hair_loss'], dandruffType: 'oily_large', dandruffAmount: 4, itchScore: 9,
      redness: 'often', discomfort: ['stinging'], discomfortFrequency: 'often', hairLossAmount: 'sudden', thinning: ['patches'],
    });
    expect(all).toHaveLength(6);
    for (const x of [...all, ...scalpMedicalAlerts({ ...noScalp, concerns: ['dandruff'], dandruffType: 'red_recurring' })]) {
      expect(x.text.zh.endsWith('建议找皮肤科医生看看。')).toBe(true);
      expect(x.text.zh).not.toMatch(/皮炎|银屑病|斑秃|脱发症|真菌/);
      expect(x.text.en).not.toMatch(/dermatitis|psoriasis|alopecia/i);
    }
  });

  it('头顶、发际线或整体变稀给出说明（不是就医提示）', () => {
    expect(scalpInfoNotes({ ...noScalp, concerns: ['hair_loss'], thinning: ['crown'] }).map((x) => x.code)).toEqual(['thinning_pattern']);
    expect(scalpInfoNotes({ ...noScalp, concerns: ['hair_loss'], thinning: ['patches'] })).toEqual([]);
  });

  it('出油时间：当天、第二天 → 头皮油；5 天以上 → 头皮干；旧选项仍可读取', () => {
    expect(scalpTargets({ ...noScalp, oilTiming: 'next_day' })).toEqual(['scalp_oil']);
    expect(scalpTargets({ ...noScalp, oilTiming: 'three_four_days' })).toEqual([]);
    expect(scalpTargets({ ...noScalp, oilTiming: 'five_plus_days' })).toEqual(['dry_scalp']);
    expect(scalpTargets({ ...noScalp, oilTiming: 'one_two_days' })).toEqual([]);
  });

  it('敏感头皮：用后有不适、经常发红；严重程度不加权', () => {
    expect(isSensitiveScalp({ ...noScalp, discomfort: ['tightness'], discomfortFrequency: 'sometimes' })).toBe(true);
    expect(isSensitiveScalp({ ...noScalp, redness: 'often' })).toBe(true);
    expect(isSensitiveScalp({ ...noScalp, redness: 'occasional' })).toBe(false);
    expect(scalpTargets({ ...noScalp, redness: 'occasional' })).toEqual(['scalp_redness']);
    const p = toScoringProfile(answers({ scalp: { concerns: ['dandruff'], dandruffAmount: 4, redness: 'often' } }), 'shampoo', ctx);
    expect(p.targetWeights).toEqual({ dandruff: 2, scalp_redness: 2, sensitive_scalp: 2 });
  });

  it('旧档案的"发红"困扰：迁移到新的发红题；回答新题后以新答案为准', () => {
    const old = { ...noScalp, concerns: ['dandruff' as const, 'redness' as const] };
    expect(migrateScalp(old)).toMatchObject({ concerns: ['dandruff'], redness: 'occasional' });
    expect(scalpTargets({ ...old, redness: 'none' })).toEqual(['dandruff']);
    expect(scalpTargets(old)).toEqual(['dandruff', 'scalp_redness']);
  });

  it('油腻偏黄大片 → 同时针对头皮油', () => {
    expect(scalpTargets({ ...noScalp, concerns: ['dandruff'], dandruffType: 'oily_large' })).toEqual(['dandruff', 'scalp_oil']);
  });

  it('常用造型产品（每周 3 次以上）传入打分', () => {
    expect(toScoringProfile(answers({ scalp: { washFrequency: 'daily', styling: 'weekly_3_plus' } }), 'shampoo', ctx).frequentStyling).toBe(true);
    expect(toScoringProfile(answers({ scalp: { washFrequency: 'daily', styling: 'weekly_1_2' } }), 'shampoo', ctx).frequentStyling).toBe(false);
  });
});

describe('头发问卷映射', () => {
  it('发丝状态和期望效果映射到 targets；香味好闻不对应困扰；最多取 3 个效果', () => {
    expect(hairTargets({ ...EMPTY_HAIR, conditions: ['tangling', 'colored', 'breakage'] })).toEqual(['tangling', 'color_fade', 'damage']);
    expect(hairTargets({ ...EMPTY_HAIR, goals: ['smooth', 'scent'] })).toEqual(['frizz', 'tangling']);
    expect(hairTargets({ ...EMPTY_HAIR, goals: ['volume', 'shine', 'curl', 'clean'] })).toEqual(['flat_hair', 'shine', 'curl_definition']);
  });

  it('"去黄 / 去橙"只在选了染或烫漂时出现并生效', () => {
    expect(toneGoalAvailable({ conditions: ['dry'] })).toBe(false);
    expect(toneGoalAvailable({ conditions: ['permed_bleached'] })).toBe(true);
    expect(hairTargets({ ...EMPTY_HAIR, conditions: ['colored'], goals: ['tone_yellow'] })).toEqual(['color_fade', 'damage', 'tone_yellow']);
    expect(hairTargets({ ...EMPTY_HAIR, goals: ['tone_orange'] })).toEqual([]);
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
