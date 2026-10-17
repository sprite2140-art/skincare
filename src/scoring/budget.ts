// 预算：每个品类按产品库价格（统一换算成 USD）分三档，界线由数据自动计算。
//
// - 第一档上限 = 该品类价格的 33% 分位数，第二档上限 = 67% 分位数，第三档不限。
// - 分位数用线性插值（与 Excel PERCENTILE.INC、numpy 默认方法相同）。
// - 只统计有价格且币种在汇率表中的产品；不足 MIN_PRICED_PRODUCTS 个时该品类不提供预算档。
// - 用户档案保存的是"第几档"而不是金额，数据更新后界线自动跟着变。

import type { ExchangeRate, Product } from '../data/types';
import type { Text } from './labels';
import { fromUsd, priceInfo, roundForDisplay } from './price';

/** 第一档 / 第二档 / 不限 / 自填金额 */
export type BudgetChoice = 'p33' | 'p67' | 'none' | 'custom';

export interface BudgetCaps {
  /** 第一档上限（USD） */
  p33: number;
  /** 第二档上限（USD） */
  p67: number;
  /** 参与计算的产品数 */
  sampleSize: number;
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
    caps[category] = { p33: percentile(sorted, 0.33), p67: percentile(sorted, 0.67), sampleSize: sorted.length };
  }
  return caps;
}

/** 用户所选档位对应的上限（USD）；null 表示不限。自填时用 customUsd */
export function capFor(choice: BudgetChoice, caps: BudgetCaps | undefined, customUsd: number | null = null): number | null {
  if (choice === 'custom') return customUsd !== null && customUsd > 0 ? customUsd : null;
  if (choice === 'none' || !caps) return null;
  return choice === 'p33' ? caps.p33 : caps.p67;
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
 * 问卷选项，例如"≤ ¥80 / ≤ ¥200 / 不限"：显示该品类算出的上限，换算成用户当地货币。
 * 该品类价格数据不足时只有"不限"。两档上限相同时合并为一档。
 */
export function budgetOptions(caps: BudgetCaps | undefined, currency: string, rates: ExchangeRate[]): BudgetOption[] {
  const none: BudgetOption = { choice: 'none', label: { zh: '不限', en: 'No limit' } };
  if (!caps) return [none];
  const toLocal = (usd: number) => {
    const local = fromUsd(usd, currency, rates);
    return local === null ? formatMoney(usd, 'USD') : formatMoney(local, currency);
  };
  const options: BudgetOption[] = [];
  const add = (choice: BudgetChoice, usd: number) => {
    const text = `≤ ${toLocal(usd)}`;
    if (!options.some((o) => o.label.zh === text)) options.push({ choice, label: { zh: text, en: text } });
  };
  add('p33', caps.p33);
  add('p67', caps.p67);
  return [...options, none];
}
