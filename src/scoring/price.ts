// 价格档：本地价格 → 固定汇率换算 USD → 按品类价格线归档。

import type { ExchangeRate, Product } from '../data/types';
import { PRICE_TIERS_USD, type BudgetTier, type PriceTier } from './config';

export type PriceInfo =
  | { status: 'ok'; usd: number; tier: PriceTier }
  | { status: 'no_price' | 'no_rate' | 'no_tiers'; usd: number | null; tier: null };

export function toUsd(amount: number, currency: string, rates: ExchangeRate[]): number | null {
  const rate = rates.find((r) => r.currency === currency);
  return rate ? amount * rate.usdPerUnit : null;
}

export function priceInfo(product: Product, rates: ExchangeRate[]): PriceInfo {
  if (product.price === null) return { status: 'no_price', usd: null, tier: null };
  const usd = toUsd(product.price, product.currency, rates);
  if (usd === null) return { status: 'no_rate', usd: null, tier: null };
  const tiers = PRICE_TIERS_USD[product.category as keyof typeof PRICE_TIERS_USD];
  if (!tiers) return { status: 'no_tiers', usd, tier: null };
  const tier: PriceTier = usd < tiers.economyBelow ? 'economy' : usd <= tiers.midUpTo ? 'mid' : 'premium';
  return { status: 'ok', usd, tier };
}

const TIER_ORDER: PriceTier[] = ['economy', 'mid', 'premium'];

/** 预算档是上限：产品价格档不高于用户所选档即可 */
export function withinBudget(tier: PriceTier, budget: BudgetTier): boolean {
  if (budget === 'unlimited') return true;
  return TIER_ORDER.indexOf(tier) <= TIER_ORDER.indexOf(budget);
}
