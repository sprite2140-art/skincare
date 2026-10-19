// 预算：每个品类按产品库价格（统一换算成 USD）的四分位数分四个价格区间，界线由数据自动计算。
//
// - 区间 1：≤ 25% 分位数；区间 2：25%–50% 分位数；区间 3：50%–75% 分位数；区间 4：75% 分位数以上。
//   每个区间不含下界、含上界（区间 1 没有下界，区间 4 没有上界）。
// - 分位数用线性插值（与 Excel PERCENTILE.INC、numpy 默认方法相同）。
// - 只统计有价格且币种在汇率表中的产品；不足 MIN_PRICED_PRODUCTS 个时该品类不提供价格区间。
// - 用户档案保存的是"第几个区间"而不是金额，数据更新后界线自动跟着变。
// - 选项只显示价格区间，不给区间起名字。

import type { ExchangeRate, Product } from '../data/types';
import type { Text } from './labels';
import { fromUsd, priceInfo, roundForDisplay } from './price';

/** 四个价格区间 / 不限 / 自填上限 */
export type BudgetChoice = 'q1' | 'q2' | 'q3' | 'q4' | 'none' | 'custom';
export const BUDGET_QUARTILES = ['q1', 'q2', 'q3', 'q4'] as const;

export interface BudgetCaps {
  /** 25% / 50% / 75% 分位数（USD） */
  q1: number;
  q2: number;
  q3: number;
  /** 参与计算的产品数 */
  sampleSize: number;
}

/** 价格区间（USD）：min 不含（null 为没有下界），max 含（null 为没有上界） */
export interface BudgetRange {
  min: number | null;
  max: number | null;
}

export type BudgetCapsByCategory = Partial<Record<string, BudgetCaps>>;

export const MIN_PRICED_PRODUCTS = 3;

/** 线性插值分位数；sorted 须升序且非空，p 取 0–1 */
export function percentile(sorted: number[], p: number): number {
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function computeBudgetCaps(products: Product[], rates: ExchangeRate[]): BudgetCapsByCategory {
  const byCategory = new Map<string, number[]>();
  for (const p of products) {
    const info = priceInfo(p, rates);
    if (info.status !== 'ok') continue;
    const list = byCategory.get(p.category) ?? [];
    list.push(info.usd);
    byCategory.set(p.category, list);
  }
  const caps: BudgetCapsByCategory = {};
  for (const [category, prices] of byCategory) {
    if (prices.length < MIN_PRICED_PRODUCTS) continue;
    const sorted = [...prices].sort((a, b) => a - b);
    caps[category] = { q1: percentile(sorted, 0.25), q2: percentile(sorted, 0.5), q3: percentile(sorted, 0.75), sampleSize: sorted.length };
  }
  return caps;
}

/** 用户所选区间对应的价格范围（USD）；null 表示不限。自填时为 0 到 customUsd */
export function rangeFor(choice: BudgetChoice, caps: BudgetCaps | undefined, customUsd: number | null = null): BudgetRange | null {
  if (choice === 'custom') return customUsd !== null && customUsd > 0 ? { min: null, max: customUsd } : null;
  if (choice === 'none' || !caps) return null;
  switch (choice) {
    case 'q1': return { min: null, max: caps.q1 };
    case 'q2': return { min: caps.q1, max: caps.q2 };
    case 'q3': return { min: caps.q2, max: caps.q3 };
    case 'q4': return { min: caps.q3, max: null };
  }
}

/** 价格是否在区间内：不含下界、含上界 */
export function inRange(usd: number, range: BudgetRange | null): boolean {
  if (!range) return true;
  return (range.min === null || usd > range.min) && (range.max === null || usd <= range.max);
}

/** 旧档案保存的预算档（p33 / p67，累计上限）已不对应新的区间，迁移时去掉，需要重新选择 */
export function isBudgetChoice(v: unknown): v is BudgetChoice {
  return v === 'none' || v === 'custom' || (BUDGET_QUARTILES as readonly unknown[]).includes(v);
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', CNY: '¥', JPY: '¥', KRW: '₩' };

/** 金额显示，带货币符号。round 为 true 时按 roundForDisplay 取整（用于换算出的约数）；产品实际价格用 false */
export function formatMoney(amount: number, currency: string, round = true): string {
  const value = round ? roundForDisplay(amount) : amount;
  // 实际价格有小数时固定两位（$24.50）
  const cents = !round && !Number.isInteger(value) && currency !== 'JPY' && currency !== 'KRW';
  const n = value.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
  const symbol = CURRENCY_SYMBOLS[currency];
  return symbol ? `${symbol}${n}` : `${n} ${currency}`;
}

export interface BudgetOption {
  choice: BudgetChoice;
  label: Text;
}

/**
 * 问卷选项，例如"≤ $15 / $15–30 / $30–60 / $60 以上 / 不限"：显示该品类算出的价格区间，换算成用户当地货币。
 * 该品类价格数据不足时只有"不限"。区间是否为空按 USD 原值判断（相邻界线相等时去掉该区间）；
 * 取整后相邻界线显示相同时，改用不取整的金额显示，保证每个选项的文字不同。
 */
export function budgetOptions(caps: BudgetCaps | undefined, currency: string, rates: ExchangeRate[]): BudgetOption[] {
  const none: BudgetOption = { choice: 'none', label: { zh: '不限', en: 'No limit' } };
  if (!caps) return [none];
  const local = (usd: number) => fromUsd(usd, currency, rates);
  const cur = local(caps.q1) === null ? 'USD' : currency;
  const amount = (usd: number) => local(usd) ?? usd;
  const bounds = [caps.q1, caps.q2, caps.q3];
  const rounded = bounds.map((b) => formatMoney(amount(b), cur));
  const collide = rounded.some((x, i) => i > 0 && x === rounded[i - 1] && bounds[i] !== bounds[i - 1]);
  // 不取整：美元等保留两位小数，日元、韩元取整到个位
  const precise = (usd: number) => {
    const v = amount(usd);
    return formatMoney(cur === 'JPY' || cur === 'KRW' ? Math.round(v) : Math.round(v * 100) / 100, cur, false);
  };
  const [b1, b2, b3] = bounds.map((b, i) => (collide ? precise(b) : rounded[i]));
  // 区间内后一个数字不带货币符号（$15–30）
  const bare = (text: string) => text.replace(/^[^\d]+/, '');
  const options: BudgetOption[] = [{ choice: 'q1', label: { zh: `≤ ${b1}`, en: `≤ ${b1}` } }];
  if (caps.q2 > caps.q1) options.push({ choice: 'q2', label: { zh: `${b1}–${bare(b2)}`, en: `${b1}–${bare(b2)}` } });
  if (caps.q3 > caps.q2) options.push({ choice: 'q3', label: { zh: `${b2}–${bare(b3)}`, en: `${b2}–${bare(b3)}` } });
  options.push({ choice: 'q4', label: { zh: `${b3} 以上`, en: `Over ${b3}` } });
  return [...options, none];
}
