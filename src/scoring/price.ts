// 价格：本地价格按固定汇率换算成 USD。

import type { ExchangeRate, Product } from '../data/types';

export type PriceInfo =
  | { status: 'ok'; usd: number }
  | { status: 'no_price' | 'no_rate'; usd: null };

export function rateOf(currency: string, rates: ExchangeRate[]): ExchangeRate | undefined {
  return rates.find((r) => r.currency === currency);
}

export function toUsd(amount: number, currency: string, rates: ExchangeRate[]): number | null {
  const rate = rateOf(currency, rates);
  return rate ? amount / rate.perUsd : null;
}

export function fromUsd(usd: number, currency: string, rates: ExchangeRate[]): number | null {
  const rate = rateOf(currency, rates);
  return rate ? usd * rate.perUsd : null;
}

export function priceInfo(product: Product, rates: ExchangeRate[]): PriceInfo {
  if (product.price === null) return { status: 'no_price', usd: null };
  const usd = toUsd(product.price, product.currency, rates);
  return usd === null ? { status: 'no_rate', usd: null } : { status: 'ok', usd };
}

/** 展示用取整：1000 以上取整到百位，其余取整到个位 */
export function roundForDisplay(amount: number): number {
  return amount >= 1000 ? Math.round(amount / 100) * 100 : Math.round(amount);
}

const COUNTRY_CURRENCY: Record<string, string> = { US: 'USD', JP: 'JPY', KR: 'KRW', CN: 'CNY' };

/** 用户所在国家的货币；未知时用 USD */
export function currencyForCountry(country: string | null | undefined): string {
  return (country && COUNTRY_CURRENCY[country]) || 'USD';
}
