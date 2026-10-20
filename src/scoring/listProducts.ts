// 结果页各品类列表取哪些产品。护肤还没有问卷和打分，面部产品不进入洗护结果页。

import { isFaceCategory } from '../data/face';
import type { Product } from '../data/types';

/** 本轮实现的品类；发膜、免洗护发乳、护发精油已预留数据结构 */
export const LIST_CATEGORIES = ['shampoo', 'conditioner'] as const;
export type ListCategory = (typeof LIST_CATEGORIES)[number];

export function productsForList(products: Product[], category: ListCategory): Product[] {
  return products.filter((p) => p.category === category && p.zone !== 'face' && !isFaceCategory(p.category));
}
