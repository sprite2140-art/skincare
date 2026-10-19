// 用户档案只存在浏览器本地（localStorage），不上传。
// 格式带版本号，以后改字段时在 migrate() 里升级旧数据。

import { isBudgetChoice } from '../scoring/budget';
import { EMPTY_HAIR, type BaseAnswers, type HairAnswers, type ScalpAnswers } from './questionnaire';

export const STORAGE_KEY = 'skincare.profiles';
export const STORE_VERSION = 1;

export interface Profile {
  id: string;
  /** "我"、"妈妈"等 */
  name: string;
  base: BaseAnswers;
  scalp: ScalpAnswers | null;
  /** 头发状态、期望效果、香味偏好和护理意愿；旧档案没有这一项 */
  hair: HairAnswers | null;
  /** 在用产品的 product_id */
  inUseProductIds: string[];
  updatedAt: string;
}

export interface ProfileStore {
  version: number;
  activeId: string | null;
  profiles: Profile[];
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function emptyStore(): ProfileStore {
  return { version: STORE_VERSION, activeId: null, profiles: [] };
}

export function newProfile(name: string, id: string = randomId()): Profile {
  return {
    id,
    name,
    base: {
      cityKey: null, scope: null, budgetMode: 'item', budgets: {}, customBudgets: {}, setBudget: null,
      specialStatus: 'none', avoid: [], avoidIngredients: [],
    },
    scalp: null,
    hair: null,
    inUseProductIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function migrate(data: unknown): ProfileStore {
  if (!data || typeof data !== 'object') return emptyStore();
  const d = data as Partial<ProfileStore>;
  if (d.version === STORE_VERSION && Array.isArray(d.profiles)) {
    // 补齐后来新增的字段，旧档案也能直接用
    const profiles = d.profiles.map((p) => {
      const blank = newProfile(p.name, p.id);
      const base = { ...blank.base, ...p.base };
      // 旧的预算档（p33 / p67）和前一版的区间（q4）已不对应现在的四分位上限，去掉后需要重新选择
      base.budgets = Object.fromEntries(Object.entries(base.budgets ?? {}).filter(([, v]) => isBudgetChoice(v)));
      return { ...blank, ...p, base, hair: p.hair ? { ...EMPTY_HAIR, ...p.hair } : null };
    });
    return { version: STORE_VERSION, activeId: d.activeId ?? null, profiles };
  }
  // 未知版本：不猜测，返回空档案，避免读坏数据
  return emptyStore();
}

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // 隐私模式等情况下访问 localStorage 会抛错
  }
}

export function loadStore(storage: KeyValueStorage | null = defaultStorage()): ProfileStore {
  if (!storage) return emptyStore();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : emptyStore();
  } catch {
    return emptyStore();
  }
}

/** 返回是否保存成功；失败时页面仍可使用，只是刷新后不保留 */
export function saveStore(store: ProfileStore, storage: KeyValueStorage | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function upsertProfile(store: ProfileStore, profile: Profile): ProfileStore {
  const updated = { ...profile, updatedAt: new Date().toISOString() };
  const exists = store.profiles.some((p) => p.id === profile.id);
  return {
    ...store,
    activeId: store.activeId ?? profile.id,
    profiles: exists ? store.profiles.map((p) => (p.id === profile.id ? updated : p)) : [...store.profiles, updated],
  };
}

export function removeProfile(store: ProfileStore, id: string): ProfileStore {
  const profiles = store.profiles.filter((p) => p.id !== id);
  return { ...store, profiles, activeId: store.activeId === id ? (profiles[0]?.id ?? null) : store.activeId };
}

export function activeProfile(store: ProfileStore): Profile | null {
  return store.profiles.find((p) => p.id === store.activeId) ?? null;
}
