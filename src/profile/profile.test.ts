import { describe, expect, it } from 'vitest';
import {
  EMPTY_HAIR, adviseCare, goalAvailable, hairNeeds, hairTargets, isSensitiveScalp, moneyToUsd, scalpInfoNotes, scalpMedicalAlerts, scalpNeeds, scalpTargets, scopeCategories,
  migrateHair, migrateScalp, toScoringProfile, toneGoalAvailable,
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
  it('只有明确选择的头皮困扰成为需求：头皮屑、痒、头皮干、掉发；其他题目不推导需求', () => {
    expect(scalpTargets({ concerns: ['dandruff', 'itch', 'dry_tight', 'hair_loss'], oilTiming: 'same_day', washFrequency: null }))
      .toEqual(['dandruff', 'scalp_itch', 'dry_scalp', 'hair_loss']);
    expect(scalpTargets({ concerns: [], noConcerns: true, oilTiming: 'three_plus_days', washFrequency: null })).toEqual([]);
    // 出油时间、头皮屑类型、发红、瘙痒分数、用后不适都不推导需求
    expect(scalpTargets({ ...noScalp, oilTiming: 'next_day' })).toEqual([]);
    expect(scalpTargets({ ...noScalp, oilTiming: 'five_plus_days' })).toEqual([]);
    expect(scalpTargets({ ...noScalp, concerns: ['dandruff'], dandruffType: 'oily_large' })).toEqual(['dandruff']);
    expect(scalpTargets({ ...noScalp, redness: 'often' })).toEqual([]);
    expect(scalpTargets({ ...noScalp, concerns: ['itch'], itchScore: 9 })).toEqual(['scalp_itch']);
    expect(scalpTargets({ ...noScalp, discomfort: ['burning'], discomfortFrequency: 'often' })).toEqual([]);
    expect(scalpNeeds({ ...noScalp, concerns: ['dry_tight'] })).toEqual([{ id: 'dry_tight', label: { zh: '头皮干、紧绷', en: 'Dry, tight scalp' }, targets: ['dry_scalp'] }]);
  });

  it('新增"容易出油""头皮敏感、容易刺激"：选中即为控油、敏感头皮需求；选了头皮敏感时刺激扣分也加倍', () => {
    expect(scalpTargets({ ...noScalp, concerns: ['oily', 'sensitive'] })).toEqual(['scalp_oil', 'sensitive_scalp']);
    expect(scalpNeeds({ ...noScalp, concerns: ['oily'] })[0]).toMatchObject({ id: 'oily', label: { zh: '容易出油' } });
    expect(isSensitiveScalp({ ...noScalp, concerns: ['sensitive'] })).toBe(true);
    const p = toScoringProfile(answers({ scalp: { concerns: ['oily', 'sensitive'], oilTiming: 'same_day' } }), 'shampoo', ctx);
    expect(p.needs!.map((n) => [n.id, n.weight])).toEqual([['oily', 2], ['sensitive', 2]]);
    expect(p.sensitive).toBe(true);
  });

  it('瘙痒 4 分及以上（或没填分数）视为敏感头皮（只影响温和度，不是需求）', () => {
    expect(isSensitiveScalp({ ...noScalp, concerns: ['itch'], itchScore: 2 })).toBe(false);
    expect(isSensitiveScalp({ ...noScalp, concerns: ['itch'], itchScore: 5 })).toBe(true);
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

  it('敏感头皮：用后有不适、经常发红；只影响温和度，不加需求', () => {
    expect(isSensitiveScalp({ ...noScalp, discomfort: ['tightness'], discomfortFrequency: 'sometimes' })).toBe(true);
    expect(isSensitiveScalp({ ...noScalp, redness: 'often' })).toBe(true);
    expect(isSensitiveScalp({ ...noScalp, redness: 'occasional' })).toBe(false);
    const p = toScoringProfile(answers({ scalp: { concerns: ['dandruff'], dandruffAmount: 4, redness: 'often' } }), 'shampoo', ctx);
    expect(p.concerns).toEqual(['dandruff']);
    expect(p.needs!.map((n) => [n.id, n.weight])).toEqual([['dandruff', 2]]);
    expect(p.sensitive).toBe(true);
    // 就医提示保留：发红并扩散
    expect(scalpMedicalAlerts({ ...noScalp, redness: 'spreading' }).length).toBeGreaterThan(0);
    // 旧档案的"发红"困扰迁移到发红题，不作为需求
    const old = { ...noScalp, concerns: ['dandruff' as const, 'redness' as const] };
    expect(migrateScalp(old)).toMatchObject({ concerns: ['dandruff'], redness: 'occasional' });
    expect(scalpTargets(old)).toEqual(['dandruff']);
  });

  it('常用造型产品（每周 3 次以上）传入打分（只影响强清洁力表活的扣分），不加"产品残留"需求', () => {
    const p = toScoringProfile(answers({ scalp: { washFrequency: 'daily', styling: 'weekly_3_plus' } }), 'shampoo', ctx);
    expect(p.frequentStyling).toBe(true);
    expect(p.concerns).toEqual([]);
    expect(toScoringProfile(answers({ scalp: { washFrequency: 'daily', styling: 'weekly_1_2' } }), 'shampoo', ctx).frequentStyling).toBe(false);
  });
});

describe('头发问卷映射', () => {
  it('只有期望效果成为需求，每个选项一个；发丝状态不推导需求；香味好闻不对应需求；最多取 3 个效果', () => {
    expect(hairTargets({ ...EMPTY_HAIR, conditions: ['tangling', 'colored', 'breakage'] })).toEqual([]);
    expect(hairTargets({ ...EMPTY_HAIR, goals: ['smooth', 'scent'] })).toEqual(['frizz', 'tangling']);
    expect(hairNeeds({ ...EMPTY_HAIR, goals: ['smooth', 'scent'] })).toEqual([{ id: 'smooth', label: { zh: '柔顺', en: 'Smooth' }, targets: ['frizz', 'tangling'] }]);
    expect(hairTargets({ ...EMPTY_HAIR, goals: ['volume', 'shine', 'curl', 'clean'] })).toEqual(['flat_hair', 'shine', 'curl_definition']);
  });

  it('"修护受损""护色"与去黄 / 去橙一样只在染或烫漂时可选；"去除造型产品残留"只在造型产品每周 3 次以上时可选', () => {
    const colored = { ...EMPTY_HAIR, conditions: ['colored' as const], goals: ['repair' as const, 'color_care' as const] };
    expect(hairNeeds(colored).map((n) => [n.id, n.targets])).toEqual([['repair', ['damage']], ['color_care', ['color_fade']]]);
    expect(hairNeeds({ ...colored, conditions: ['dry'] })).toEqual([]);
    expect(goalAvailable('repair', { conditions: ['permed_bleached'] }, null)).toBe(true);
    const buildup = { ...EMPTY_HAIR, goals: ['buildup' as const] };
    expect(hairNeeds(buildup, { styling: 'weekly_3_plus' })).toEqual([{ id: 'buildup', label: { zh: '去除造型产品残留', en: 'Remove styling product buildup' }, targets: ['buildup'] }]);
    expect(hairNeeds(buildup, { styling: 'weekly_1_2' })).toEqual([]);
    expect(hairNeeds(buildup, null)).toEqual([]);
    // 只分配给洗发水；只买护发素时不问造型频率，也不可选
    const a = answers({ base: { scope: 'shampoo' }, scalp: { styling: 'daily' }, hair: { goals: ['buildup'] } });
    expect(toScoringProfile(a, 'shampoo', ctx).needs!.map((n) => [n.id, n.weight])).toEqual([['buildup', 1]]);
    expect(toScoringProfile(a, 'conditioner', ctx).needs).toEqual([]);
    expect(toScoringProfile({ ...a, base: { ...a.base, scope: 'conditioner' } }, 'conditioner', ctx).needs).toEqual([]);
  });

  it('旧档案的合并"去黄 / 去橙"迁移为两项，仍不超过 3 项', () => {
    expect(migrateHair({ ...EMPTY_HAIR, goals: ['smooth', 'tone'] }).goals).toEqual(['smooth', 'tone_yellow', 'tone_orange']);
    expect(migrateHair({ ...EMPTY_HAIR, goals: ['smooth', 'shine', 'tone'] }).goals).toEqual(['smooth', 'shine', 'tone_yellow']);
    const h = { ...EMPTY_HAIR, goals: ['smooth' as const] };
    expect(migrateHair(h)).toBe(h);
  });

  it('"去黄 / 去橙"只在选了染或烫漂时出现并生效', () => {
    expect(toneGoalAvailable({ conditions: ['dry'] })).toBe(false);
    expect(toneGoalAvailable({ conditions: ['permed_bleached'] })).toBe(true);
    expect(hairTargets({ ...EMPTY_HAIR, conditions: ['colored'], goals: ['tone_yellow'] })).toEqual(['tone_yellow']);
    expect(hairTargets({ ...EMPTY_HAIR, goals: ['tone_orange'] })).toEqual([]);
  });
});

describe('转换为打分输入', () => {
  it('选洗护搭配：发丝效果只分配给护发素，洗发水只匹配头皮需求和清爽、蓬松、去黄去橙；发丝状态和造型频率不加需求', () => {
    const a = answers({
      base: { scope: 'set' },
      scalp: { concerns: ['dandruff'], styling: 'daily' },
      hair: { conditions: ['dry', 'colored', 'tangling'], goals: ['clean', 'volume', 'tone_yellow'] },
    });
    const sh = toScoringProfile(a, 'shampoo', ctx);
    expect(sh.concerns).toEqual(['dandruff', 'clarifying', 'flat_hair', 'tone_yellow']);
    expect(sh.needs!.map((n) => [n.id, n.weight])).toEqual([['dandruff', 2], ['clean', 1], ['volume', 1], ['tone_yellow', 1]]);
    const co = toScoringProfile(a, 'conditioner', ctx);
    expect(co.needs!.map((n) => n.id)).toEqual(['clean', 'volume', 'tone_yellow']);
    expect(co.concerns).not.toContain('dryness');
    expect(co.concerns).not.toContain('damage');
    // 结果页按显示的视图传入：选了洗护搭配、但打开洗发水标签时按单买（非洗发水自己的效果权重 0.5）
    const b = answers({ base: { scope: 'set' }, hair: { goals: ['smooth', 'volume'] } });
    expect(toScoringProfile(b, 'shampoo', ctx).needs!.map((n) => n.id)).toEqual(['volume']);
    const single = toScoringProfile(b, 'shampoo', { ...ctx, routine: false });
    expect(single.needs!.map((n) => [n.id, n.weight])).toEqual([['smooth', 0.5], ['volume', 1]]);
  });

  it('只买洗发水：头皮困扰权重 2，发丝效果 0.5，洗发水自己的效果（如蓬松）1；护发素只看发丝', () => {
    const a = answers({ base: { scope: 'shampoo' }, scalp: { concerns: ['dandruff'] }, hair: { goals: ['smooth', 'volume'] } });
    const sh = toScoringProfile(a, 'shampoo', ctx);
    expect(sh.concerns).toEqual(['dandruff', 'frizz', 'tangling', 'flat_hair']);
    expect(sh.needs!.map((n) => [n.id, n.weight])).toEqual([['dandruff', 2], ['smooth', 0.5], ['volume', 1]]);
    const co = toScoringProfile(a, 'conditioner', ctx);
    expect(co.concerns).toEqual(['frizz', 'tangling', 'flat_hair']);
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
    const tier = toScoringProfile(answers({ base: { budgets: { shampoo: 'q2' } } }), 'shampoo', ctx);
    expect(tier.budget).toBe('q2');
    const custom = toScoringProfile(answers({ base: { budgets: { shampoo: 'custom' }, customBudgets: { shampoo: { amount: 15, currency: 'USD' } } } }), 'shampoo', ctx);
    expect(custom).toMatchObject({ budget: 'custom', customBudgetUsd: 15 });
    const set = toScoringProfile(answers({ base: { budgetMode: 'set', budgets: { shampoo: 'q1' }, setBudget: { amount: 40, currency: 'USD' } } }), 'shampoo', ctx);
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
    // 旧的预算档（p33 / p67）和前一版的区间（q4）已不对应现在的上限，读取时去掉，需要重新选择
    const old = { id: 'me', name: '我', base: { cityKey: null, budgets: { shampoo: 'p33', conditioner: 'custom', scalp_care: 'q4' }, specialStatus: 'none', avoid: [], avoidIngredients: [] }, scalp: null, inUseProductIds: [], updatedAt: '' };
    s.data.set(STORAGE_KEY, JSON.stringify({ version: 1, activeId: 'me', profiles: [old] }));
    const p = activeProfile(loadStore(s))!;
    expect(p.base).toMatchObject({ budgets: { conditioner: 'custom' }, budgetMode: 'item', customBudgets: {}, setBudget: null, scope: null });
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
