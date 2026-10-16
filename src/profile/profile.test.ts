import { describe, expect, it } from 'vitest';
import { hairTargets, scalpMedicalAlerts, scalpTargets, toScalpScoringProfile } from './questionnaire';
import {
  STORAGE_KEY, activeProfile, emptyStore, loadStore, newProfile, removeProfile, saveStore, upsertProfile,
  type KeyValueStorage,
} from './storage';

const memory = (): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('头皮问卷映射', () => {
  it('多选困扰映射到 targets，发红 → scalp_redness，当天变油 → scalp_oil', () => {
    expect(scalpTargets({ concerns: ['dandruff', 'itch', 'redness'], oilTiming: 'same_day', washFrequency: null }))
      .toEqual(['dandruff', 'scalp_itch', 'scalp_redness', 'scalp_oil']);
    expect(scalpTargets({ concerns: [], oilTiming: 'three_plus_days', washFrequency: null })).toEqual([]);
  });

  it('头皮屑"伴红斑、反复不好"触发就医提示', () => {
    const alerts = scalpMedicalAlerts({ concerns: ['dandruff'], dandruffType: 'red_recurring', oilTiming: null, washFrequency: null });
    expect(alerts.map((a) => a.code)).toEqual(['dandruff_red_recurring']);
    expect(alerts[0].text.zh).toContain('皮肤科医生');
    expect(scalpMedicalAlerts({ concerns: ['dandruff'], dandruffType: 'dry_fine', oilTiming: null, washFrequency: null })).toEqual([]);
    // 没选头皮屑时这道追问不生效
    expect(scalpMedicalAlerts({ concerns: [], dandruffType: 'red_recurring', oilTiming: null, washFrequency: null })).toEqual([]);
  });

  it('短期大量或成片脱发触发就医提示', () => {
    const alerts = scalpMedicalAlerts({ concerns: ['hair_loss'], hairLossLevel: 'sudden_or_patchy', oilTiming: null, washFrequency: null });
    expect(alerts.map((a) => a.code)).toEqual(['hair_loss_sudden']);
  });

  it('头皮易痒视为敏感，不排序', () => {
    const base = newProfile('我', 'me').base;
    const p = toScalpScoringProfile(base, { concerns: ['itch'], oilTiming: null, washFrequency: 'daily' }, 'shampoo', [], []);
    expect(p.sensitive).toBe(true);
    expect(p.concernsRanked).toBe(false);
    expect(p.washFrequency).toBe('daily');
    expect(p.budget).toBe('none');
    const withBudget = toScalpScoringProfile({ ...base, budgets: { shampoo: 'p33' } }, { concerns: [], oilTiming: null, washFrequency: null }, 'shampoo', [], []);
    expect(withBudget.budget).toBe('p33');
  });
});

describe('头发问卷映射', () => {
  it('打结 → tangling，褪色 → color_fade，染烫漂热工具 → damage', () => {
    expect(hairTargets({ concerns: ['tangling', 'color_fade', 'split_ends'], treatments: ['dye'] }))
      .toEqual(['tangling', 'color_fade', 'damage']);
    expect(hairTargets({ concerns: ['flat', 'frizz'], treatments: ['none'] })).toEqual(['flat_hair', 'frizz']);
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
