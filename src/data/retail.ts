// 零售商评分和购买链接的展示规则（只展示，不计入任何分数）。

import type { Product, RetailRating } from './types';

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
  return p.ratings.filter((r) => (ratingCountForThreshold(r) ?? 0) >= MIN_RATING_COUNT);
}

/** 评价数的显示文字：保留页面原文（如 5.5K），去掉括号 */
export function ratingCountText(r: RetailRating): string {
  return r.ratingCountDisplay.replace(/[()]/g, '') || (r.ratingCount !== null ? r.ratingCount.toLocaleString('en-US') : '');
}
