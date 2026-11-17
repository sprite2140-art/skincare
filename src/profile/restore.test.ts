import { describe, expect, it } from 'vitest';
import { newProfile, removeProfile, restoreProfile, upsertProfile, type ProfileStore } from './storage';

describe('撤销删除档案', () => {
  it('只放回删掉的档案，保留删除之后对其他档案的修改', () => {
    const a = newProfile('我');
    const b = newProfile('妈妈');
    let store: ProfileStore = { version: 1, activeId: a.id, profiles: [] };
    store = upsertProfile(upsertProfile(store, a), b);
    const deleted = store.profiles.find((p) => p.id === a.id)!;
    store = removeProfile(store, a.id);
    // 删除后改了另一份档案的名字，又新建了一份
    store = upsertProfile(store, { ...store.profiles[0], name: '妈妈（改）' });
    const c = newProfile('朋友');
    store = upsertProfile(store, c);

    const restored = restoreProfile(store, deleted);
    expect(restored.activeId).toBe(a.id);
    expect(restored.profiles.map((p) => p.name).sort()).toEqual(['我', '妈妈（改）', '朋友'].sort());
  });

  it('档案已在列表里时不重复添加', () => {
    const a = newProfile('我');
    const store = upsertProfile({ version: 1, activeId: null, profiles: [] }, a);
    expect(restoreProfile(store, a).profiles).toHaveLength(1);
  });
});
