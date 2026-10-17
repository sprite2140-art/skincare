// 档案状态：读写 localStorage，支持多份档案（"我" / "帮别人测"）切换。

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  activeProfile, loadStore, newProfile, removeProfile, saveStore, upsertProfile, type Profile, type ProfileStore,
} from './storage';

interface ProfileApi {
  store: ProfileStore;
  /** 当前档案；还没有任何档案时为 null */
  profile: Profile | null;
  /** 最近一次写入本地存储是否失败 */
  saveFailed: boolean;
  save: (profile: Profile) => void;
  switchTo: (id: string) => void;
  add: (name: string) => Profile;
  remove: (id: string) => void;
}

const ProfileContext = createContext<ProfileApi | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ProfileStore>(() => loadStore());
  const [saveFailed, setSaveFailed] = useState(false);

  const commit = useCallback((next: ProfileStore) => {
    setStore(next);
    setSaveFailed(!saveStore(next));
  }, []);

  const save = useCallback((p: Profile) => commit(upsertProfile(store, p)), [commit, store]);
  const switchTo = useCallback((id: string) => commit({ ...store, activeId: id }), [commit, store]);
  const add = useCallback(
    (name: string) => {
      const p = newProfile(name);
      commit({ ...upsertProfile(store, p), activeId: p.id });
      return p;
    },
    [commit, store],
  );
  const remove = useCallback((id: string) => commit(removeProfile(store, id)), [commit, store]);

  const value = useMemo(
    () => ({ store, profile: activeProfile(store), saveFailed, save, switchTo, add, remove }),
    [store, saveFailed, save, switchTo, add, remove],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles(): ProfileApi {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfiles 必须在 ProfileProvider 内使用');
  return ctx;
}
