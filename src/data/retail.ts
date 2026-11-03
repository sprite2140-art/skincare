// 零售商评分和购买链接的展示规则（只展示，不计入任何分数）。

import type { Product, PurchaseLink, RetailRating } from './types';

/** 评价数少于此值的评分不显示 */
export const MIN_RATING_COUNT = 50;

/** 用于判断是否达到显示门槛的评价数：有精确数字用精确数字；只有缩写（如 5.5K）时按缩写估算，只用于门槛判断 */
export function ratingCountForThreshold(r: RetailRating): number | null {
  if (r.ratingCount !== null) return r.ratingCount;
  const m = r.ratingCountDisplay.replace(/[(),\s]/g, '').match(/^(\d+(?:\.\d+)?)([KkMm])?$/);
  if (!m) return null;
  const mult = m[2] ? (m[2].toLowerCase() === 'k' ? 1000 : 1_000_000) : 1;
  return Number(m[1]) * mult;
}

/** 页面上显示的评分：评价数达到门槛的，按平台固定顺序 */
export function visibleRatings(p: Product): RetailRating[] {
  return p.ratings.filter((r) => Number.isFinite(r.rating) && (ratingCountForThreshold(r) ?? 0) >= MIN_RATING_COUNT);
}

/** 评价数的显示文字：保留页面原文（如 5.5K），去掉括号 */
export function ratingCountText(r: RetailRating): string {
  return r.ratingCountDisplay.replace(/[()]/g, '') || (r.ratingCount !== null ? r.ratingCount.toLocaleString('en-US') : '');
}

/**
 * 卡片"在哪买"可以列出的购买链接：品牌页与在售版本不一致（version_mismatch）时，品牌官网卖的不是打分用的配方，不列出
 */
export function usablePurchaseLinks(p: Pick<Product, 'purchaseLinks' | 'brandClaims'>): PurchaseLink[] {
  return p.brandClaims.status === 'version_mismatch' ? p.purchaseLinks.filter((l) => l.platform !== 'brand') : p.purchaseLinks;
}

/** 至少有一个可以列出的购买链接（购买链接表，或产品表的 purchase_url 且没有因版本不一致被去掉）；没有时不进入推荐 */
export function hasUsablePurchaseLink(p: Pick<Product, 'purchaseLinks' | 'brandClaims' | 'purchaseUrl'>): boolean {
  const links = usablePurchaseLinks(p);
  if (links.length > 0) return true;
  const dropped = new Set(p.purchaseLinks.map((l) => l.url));
  return !!p.purchaseUrl && !dropped.has(p.purchaseUrl);
}
