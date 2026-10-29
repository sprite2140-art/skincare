// 香味信息：用于"无香优先"排序和结果页说明。安全相关，draft 成分也算（宁可多提示）。
//
// - 加香成分：risk_tags 含 fragrance 的成分，判断规则见 src/data/cosing.ts 的 isFragrance()：
//   香精统称、欧盟香料致敏原、本项目维护的加香成分清单（data/fragrance_ingredients.csv）；精油（essential_oil）也算加香，单独列出。
// - 精油单独列出：risk_tags 含 essential_oil。
// - 芳香植物成分单独列出：(EU) 2023/1545 列为香料致敏原的植物精油 / 提取物（data/aromatic_botanicals.csv），
//   如 Lavandula Angustifolia Flower Extract。和精油同样看待：不算无香，"无香优先"时排在只含精油的一层。
// - 品牌标注无香、但含精油或芳香植物成分时，卡片写"品牌标注无香，但含植物精油"，不只写"无香"（所有品类）。
// - 不在成分库或名称未核对的成分无法判断，明确标注数量；因此"未发现"不等于"无致敏原"。

import { normalizeName, type IngredientIndex } from '../data/ingredientIndex';
import type { Product } from '../data/types';

export type FragranceStatus =
  /** 明确标注 fragrance-free，且完整成分表未发现已知加香成分 */
  | 'labeled_free'
  /** 没有标注无香，但成分表未发现已知加香成分 */
  | 'none_found'
  /** 成分表含已知加香成分 */
  | 'contains';

export interface FragranceInfo {
  status: FragranceStatus;
  claim: Product['fragranceFreeClaim'];
  /** 成分表中的全部加香成分（原文写法） */
  fragrance: string[];
  /** 其中在欧盟香料致敏原清单上的 */
  allergens: string[];
  /** 其中在本项目加香成分清单（data/fragrance_ingredients.csv）上的（不含欧盟致敏原） */
  listed: string[];
  /** 成分表中的精油（原文写法） */
  essentialOils: string[];
  /** 成分表中的芳香植物成分（原文写法，不含已算作精油的） */
  botanicals: string[];
  /** 品牌标注无香，但成分表含精油或芳香植物成分 */
  labeledFreeWithPlants: boolean;
  /** 无法判断的成分数（不在成分库或名称未核对） */
  unknownCount: number;
}

export function fragranceInfo(product: Product, index: IngredientIndex): FragranceInfo {
  const fragrance: string[] = [];
  const allergens: string[] = [];
  const listed: string[] = [];
  const essentialOils: string[] = [];
  const botanicals: string[] = [];
  let unknownCount = 0;
  const flagged = new Set(product.inciNameUnverified.map(normalizeName));
  for (const raw of product.inciList) {
    const ing = index.get(raw);
    if (!ing || flagged.has(normalizeName(raw))) {
      unknownCount++;
      continue;
    }
    if (ing.riskTags.includes('fragrance')) {
      fragrance.push(raw);
      if (ing.euAllergen) allergens.push(raw);
      else if (ing.fragranceListed) listed.push(raw);
    }
    if (ing.riskTags.includes('essential_oil')) essentialOils.push(raw);
    else if (ing.aromaticEntry) botanicals.push(raw);
  }
  // 精油、芳香植物成分也算加香（规则 d），在详情中单独列出
  const plants = essentialOils.length > 0 || botanicals.length > 0;
  const status: FragranceStatus = fragrance.length > 0 || plants
    ? 'contains'
    : product.fragranceFreeClaim === 'yes' ? 'labeled_free' : 'none_found';
  return {
    status, claim: product.fragranceFreeClaim, fragrance, allergens, listed, essentialOils, botanicals,
    labeledFreeWithPlants: product.fragranceFreeClaim === 'yes' && plants, unknownCount,
  };
}

/**
 * "无香优先"时的排序层级，数字越小越靠前：无香（标注无香、成分表中未发现加香成分为同一层，卡片上分别标注）
 * → 只含精油或芳香植物成分 → 含香精
 */
export function fragranceTier(info: FragranceInfo): number {
  if (info.fragrance.length > 0) return 2;
  if (info.essentialOils.length > 0 || info.botanicals.length > 0) return 1;
  return 0;
}

/** 含哪类植物成分：有精油（含名称以 Oil 结尾的芳香植物成分）为 oil，只有提取物等为 botanical，都没有为 null */
export function plantKind(info: FragranceInfo): 'oil' | 'botanical' | null {
  if (info.essentialOils.length > 0 || info.botanicals.some((b) => /\boil$/i.test(b.trim()))) return 'oil';
  return info.botanicals.length > 0 ? 'botanical' : null;
}
