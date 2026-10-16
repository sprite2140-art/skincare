// 按市场筛选产品：同一款产品在不同地区有不同配方，默认只显示用户所在市场的版本。
//
// - 第一阶段聚焦美国用户：默认市场为美国（DEFAULT_MARKET）。
// - 档案中选了日本、韩国、中国的城市时，默认市场取该城市的国家；没选城市或国家不在这四个市场时用美国。
// - 默认市场为中国时，同时显示 available_in_cn 为 yes 或 cross_border 的进口版本。
// - 结果页的"显示其他地区版本"开关打开后显示全部。

import { REGIONS, type City, type Product, type Region } from '../data/types';

export const DEFAULT_MARKET: Region = 'US';

export function marketForCity(city: City | null): Region {
  return city && (REGIONS as readonly string[]).includes(city.country) ? (city.country as Region) : DEFAULT_MARKET;
}

/** 产品是否属于该市场（中国市场包含国内能买到的进口版本） */
export function inMarket(product: Product, market: Region): boolean {
  if (product.region === market) return true;
  return market === 'CN' && (product.availableInCn === 'yes' || product.availableInCn === 'cross_border');
}

export function filterByMarket(products: Product[], market: Region | null, showOthers: boolean) {
  if (!market) return { shown: products, hiddenCount: 0 };
  const own = products.filter((p) => inMarket(p, market));
  return { shown: showOthers ? products : own, hiddenCount: products.length - own.length };
}
