// 预算：每个品类按产品库价格（统一换算成 USD）的四分位数给出三个价格上限，界线由数据自动计算。
//
// - 三个上限依次为 25% / 50% / 75% 分位数；选项为"$X 以内 / $Y 以内 / $Z 以内 / 不限"，每档包含更便宜的产品，
//   等于上限的产品保留。
// - 分位数用线性插值（与 Excel PERCENTILE.INC、numpy 默认方法相同）。
// - 只统计有价格且币种在汇率表中的产品；不足 MIN_PRICED_PRODUCTS 个时该品类不提供价格上限选项。
// - 用户档案保存的是"第几个上限"而不是金额，数据更新后界线自动跟着变。
// - 选项只显示金额，不给档位起名字。

import type { ExchangeRate, Product } from '../data/types';
import type { Text } from './labels';
import { fromUsd, priceInfo, roundForDisplay } from './price';

/** 三个价格上限（25% / 50% / 75% 分位数）/ 不限 / 自填上限 */
export type BudgetChoice = 'q1' | 'q2' | 'q3' | 'none' | 'custom';
export const BUDGET_QUARTILES = ['q1', 'q2', 'q3'] as const;

export interface BudgetCaps {
  /** 25% / 50% / 75% 分位数（USD） */
  q1: number;
  q2: number;
  q3: number;
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
    caps[category] = { q1: percentile(sorted, 0.25), q2: percentile(sorted, 0.5), q3: percentile(sorted, 0.75), sampleSize: sorted.length };
  }
  return caps;
}

/** 用户所选档位对应的价格上限（USD，含等于）；null 表示不限。自填时用 customUsd */
export function capFor(choice: BudgetChoice, caps: BudgetCaps | undefined, customUsd: number | null = null): number | null {
  if (choice === 'custom') return customUsd !== null && customUsd > 0 ? customUsd : null;
  if (choice === 'none' || !caps) return null;
  return caps[choice];
}

/** 旧档案保存的预算档（p33 / p67）和前一版的区间（q4）已不对应现在的上限，迁移时去掉，需要重新选择 */
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
 * 问卷选项，例如"$15 以内 / $30 以内 / $60 以内 / 不限"：显示该品类算出的上限，换算成用户当地货币。
 * 该品类价格数据不足时只有"不限"。相邻上限原值相同时只保留一个；取整后显示相同但原值不同时，
 * 改用不取整的金额显示，保证每个选项的文字不同。
 */
export function budgetOptions(caps: BudgetCaps | undefined, currency: string, rates: ExchangeRate[]): BudgetOption[] {
  const none: BudgetOption = { choice: 'none', label: { zh: '不限', en: 'No limit' } };
  if (!caps) return [none];
  const cur = fromUsd(caps.q1, currency, rates) === null ? 'USD' : currency;
  const amount = (usd: number) => fromUsd(usd, cur, rates) ?? usd;
  const bounds = BUDGET_QUARTILES.map((q) => caps[q]);
  const rounded = bounds.map((b) => formatMoney(amount(b), cur));
  const collide = rounded.some((x, i) => i > 0 && x === rounded[i - 1] && bounds[i] !== bounds[i - 1]);
  // 不取整：美元等保留两位小数，日元、韩元取整到个位
  const precise = (usd: number) => {
    const v = amount(usd);
    return formatMoney(cur === 'JPY' || cur === 'KRW' ? Math.round(v) : Math.round(v * 100) / 100, cur, false);
  };
  const options: BudgetOption[] = [];
  BUDGET_QUARTILES.forEach((q, i) => {
    if (i > 0 && bounds[i] === bounds[i - 1]) return;
    const text = collide ? precise(bounds[i]) : rounded[i];
    options.push({ choice: q, label: { zh: `${text} 以内`, en: `Up to ${text}` } });
  });
  return [...options, none];
}
