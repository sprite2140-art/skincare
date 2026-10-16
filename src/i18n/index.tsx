// 轻量中英文切换：两个 JSON 字典 + 一个 hook。语言偏好存在本地。

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import zh from './zh.json';
import en from './en.json';

export type Lang = 'zh' | 'en';
export type Key = keyof typeof zh;

const dicts: Record<Lang, Record<Key, string>> = { zh, en };
const LANG_KEY = 'skincare.lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    // 忽略：无法访问本地存储时用浏览器语言
  }
  return typeof navigator !== 'undefined' && navigator.language.startsWith('zh') ? 'zh' : 'en';
}

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  /** 取打分结果等 {zh, en} 文本中当前语言的一份 */
  tx: (text: { zh: string; en: string }) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // 忽略
    }
  }, []);
  const t = useCallback(
    (key: Key, vars?: Record<string, string | number>) =>
      dicts[lang][key].replace(/\{(\w+)\}/g, (_, v: string) => String(vars?.[v] ?? `{${v}}`)),
    [lang],
  );
  const tx = useCallback((text: { zh: string; en: string }) => text[lang], [lang]);
  const value = useMemo(() => ({ lang, setLang, t, tx }), [lang, setLang, t, tx]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n 必须在 I18nProvider 内使用');
  return ctx;
}
