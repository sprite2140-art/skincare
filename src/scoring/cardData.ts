// 产品卡片要展示的信息：评价最多的平台、各平台购买行、关键成分、温和度说明。
// 原则：卡片展示"用户需要知道什么"，判断方法统一放在数据说明页。

import { normalizeName, type IngredientIndex } from '../data/ingredientIndex';
import { RETAIL_PLATFORMS, type Ingredient, type Product, type RetailPlatform, type RetailRating, type RiskTag, type Target } from '../data/types';
import { ratingCountForThreshold, visibleRatings } from '../data/retail';
import { IRRITANT_TAGS } from './config';
import { RISK_TAG_LABELS, TARGET_LABELS, type Text } from './labels';

/** 评价数最多的平台评分（只看达到显示门槛的，不跨平台平均） */
export function topRating(p: Product): RetailRating | null {
  return [...visibleRatings(p)].sort((a, b) => (ratingCountForThreshold(b) ?? 0) - (ratingCountForThreshold(a) ?? 0))[0] ?? null;
}

export type StorePlatform = RetailPlatform | 'other';

export interface StoreRow {
  platform: StorePlatform;
  /** platform 为 other 时显示的网站名 */
  host: string;
  url: string;
  /** 该平台的评分；评价数不足显示门槛时为 null，但 lowCount 为 true */
  rating: RetailRating | null;
  lowCount: boolean;
}

/** 由链接判断平台 */
export function platformOf(url: string): { platform: StorePlatform; host: string } {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return { platform: 'other', host: '' };
  }
  const known = (['ulta', 'sephora', 'target', 'amazon'] as const).find((k) => host === `${k}.com` || host.endsWith(`.${k}.com`));
  // 其他网站显示为站名，如 walgreens.com → Walgreens
  const site = host.replace(/\.(com|net|org|co)(\.[a-z]{2})?$/, '').split('.').pop() ?? host;
  return { platform: known ?? 'other', host: site ? site.charAt(0).toUpperCase() + site.slice(1) : host };
}

/** "在哪买"：每个平台一行，按固定顺序（品牌官网 → Ulta → Sephora → Target → Amazon → 其他） */
export function storeRows(p: Product): StoreRow[] {
  const shown = new Set(visibleRatings(p).map((r) => r.platform));
  const ratingOf = (pl: StorePlatform) => (pl === 'other' ? null : p.ratings.find((r) => r.platform === pl) ?? null);
  const rows: StoreRow[] = p.purchaseLinks.map((l) => {
    const r = ratingOf(l.platform);
    return { platform: l.platform, host: '', url: l.url, rating: r && shown.has(r.platform) ? r : null, lowCount: !!r && !shown.has(r.platform) };
  });
  // 产品表的 purchase_url 不在购买链接里时也列出
  if (p.purchaseUrl && !rows.some((x) => x.url === p.purchaseUrl)) {
    const { platform, host } = platformOf(p.purchaseUrl);
    if (!rows.some((x) => x.platform === platform && platform !== 'other')) {
      const r = ratingOf(platform);
      rows.push({ platform, host, url: p.purchaseUrl, rating: r && shown.has(r.platform) ? r : null, lowCount: !!r && !shown.has(r.platform) });
    }
  }
  const order = (x: StoreRow) => (x.platform === 'other' ? RETAIL_PLATFORMS.length : RETAIL_PLATFORMS.indexOf(x.platform));
  return rows.sort((a, b) => order(a) - order(b));
}

/** 主购买按钮：默认指向评价数最多的平台；没有评分时用产品表的 purchase_url；再没有时用第一条链接 */
export function primaryStore(p: Product): StoreRow | null {
  const rows = storeRows(p);
  const top = topRating(p);
  return (top && rows.find((r) => r.platform === top.platform))
    ?? rows.find((r) => r.url === p.purchaseUrl)
    ?? rows[0]
    ?? null;
}

/** 关键成分中有效成分的作用写法 */
const ROLE: Partial<Record<Target, Text>> = {
  dandruff: { zh: '去屑', en: 'Anti-dandruff' },
  scalp_oil: { zh: '控油', en: 'Oil control' },
  scalp_itch: { zh: '舒缓', en: 'Soothing' },
  sensitive_scalp: { zh: '舒缓', en: 'Soothing' },
  dry_scalp: { zh: '滋润', en: 'Moisturizing' },
  hair_loss: { zh: '掉发护理', en: 'Hair-loss care' },
  damage: { zh: '修护', en: 'Repair' },
  dryness: { zh: '保湿', en: 'Moisturizing' },
  frizz: { zh: '抚平毛躁', en: 'Anti-frizz' },
  tangling: { zh: '顺发', en: 'Detangling' },
  color_fade: { zh: '护色', en: 'Color care' },
  flat_hair: { zh: '蓬松', en: 'Volume' },
  shine: { zh: '光泽', en: 'Shine' },
  curl_definition: { zh: '卷发定型', en: 'Curl definition' },
};

export interface KeyIngredient {
  /** 作用，如"去屑""螯合剂""香精" */
  role: Text;
  /** 成分表原文写法 */
  raw: string;
  ingredient: Ingredient;
  kind: 'active' | 'chelator' | 'caution';
}

/** 需要注意的成分标签（刺激、孕期等），按这个顺序 */
const CAUTION_TAGS: RiskTag[] = [...IRRITANT_TAGS, 'strong_cleanser', 'pregnancy_caution', 'rx_caution'];

/**
 * 关键成分：只突出有效成分和需要注意的成分，最多 max 个。
 * 顺序：针对你需求的有效成分 → 其他有效成分 → 螯合剂 → 需要注意的成分。
 */
export function keyIngredients(p: Product, index: IngredientIndex, concerns: Target[], max = 5): KeyIngredient[] {
  const seen = new Set<string>();
  const flagged = new Set(p.inciNameUnverified.map(normalizeName));
  const items: (KeyIngredient & { rank: number })[] = [];
  for (const raw of p.inciList) {
    if (flagged.has(normalizeName(raw))) continue;
    const ing = index.get(raw);
    if (!ing || seen.has(ing.inciName)) continue;
    if (ing.category === 'active' && ing.targets.length > 0) {
      const mine = ing.targets.find((t) => concerns.includes(t));
      const target = mine ?? ing.targets[0];
      seen.add(ing.inciName);
      items.push({ role: ROLE[target] ?? TARGET_LABELS[target], raw, ingredient: ing, kind: 'active', rank: mine ? 0 : 1 });
      continue;
    }
    if (ing.chelator) {
      seen.add(ing.inciName);
      items.push({ role: { zh: '螯合剂', en: 'Chelating agent' }, raw, ingredient: ing, kind: 'chelator', rank: 2 });
      continue;
    }
    const tag = CAUTION_TAGS.find((t) => ing.riskTags.includes(t));
    if (tag) {
      seen.add(ing.inciName);
      // 香料：致敏原写"香料致敏原"，其余写"加香"，避免"香精 · 香精"
      const role = tag === 'fragrance'
        ? ing.euAllergen ? { zh: '香料致敏原', en: 'Fragrance allergen' } : { zh: '加香', en: 'Fragrance' }
        : RISK_TAG_LABELS[tag];
      items.push({ role, raw, ingredient: ing, kind: 'caution', rank: 3 });
    }
  }
  return items.sort((a, b) => a.rank - b.rank).slice(0, max).map(({ rank: _rank, ...k }) => k);
}

/** 含针对头皮屑的有效成分（只有这样的产品才显示去屑用法） */
export function hasAntiDandruffActive(p: Product, index: IngredientIndex): boolean {
  return p.inciList.some((raw) => {
    const ing = index.get(raw);
    return !!ing && ing.category === 'active' && ing.targets.includes('dandruff');
  });
}

/**
 * 温和度一行中列出的刺激成分类型（香精、强清洁力表活等），不含判断方法。
 * 强清洁力表活只在计入温和度时列出（每天洗头且不常用造型产品）。
 */
export function irritantKinds(p: Product, index: IngredientIndex, countStrongCleanser: boolean): Text[] {
  const tags = new Set<RiskTag>();
  for (const raw of p.inciList) {
    const ing = index.get(raw);
    if (!ing) continue;
    for (const t of ing.riskTags) {
      if ((IRRITANT_TAGS as RiskTag[]).includes(t) || (t === 'strong_cleanser' && countStrongCleanser)) tags.add(t);
    }
  }
  return [...tags].map((t) => RISK_TAG_LABELS[t]);
}
