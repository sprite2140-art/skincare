// 产品卡片要展示的信息：评价最多的平台、各平台购买行、需求对照、需要注意的成分、关键成分、评分明细。
// 原则：卡片展示"用户需要知道什么"，判断方法统一放在数据说明页。

import { normalizeName, type IngredientIndex } from '../data/ingredientIndex';
import { RETAIL_PLATFORMS, RETAIL_PLATFORM_DOMAINS, type Ingredient, type Product, type RetailPlatform, type RetailRating, type Target } from '../data/types';
import { ratingCountForThreshold, visibleRatings } from '../data/retail';
import { WEIGHTS, type DimensionKey } from './config';
import { RISK_TAG_LABELS, TARGET_LABELS, ingredientName, joinNames, type Text } from './labels';
import type { ReasonBasis } from './reasons';
import type { Dimension, ProductScore, ScoringProfile } from './score';

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
  const known = (Object.entries(RETAIL_PLATFORM_DOMAINS) as [StorePlatform, string][])
    .find(([, d]) => host === d || host.endsWith(`.${d}`))?.[0];
  // 其他网站显示为站名，如 walgreens.com → Walgreens
  const site = host.replace(/\.(com|net|org|co)(\.[a-z]{2})?$/, '').split('.').pop() ?? host;
  return { platform: known ?? 'other', host: site ? site.charAt(0).toUpperCase() + site.slice(1) : host };
}

/** "在哪买"：每个平台一行，按 RETAIL_PLATFORMS 的固定顺序，其他网站最后 */
export function storeRows(p: Product): StoreRow[] {
  const shown = new Set(visibleRatings(p).map((r) => r.platform));
  const ratingOf = (pl: StorePlatform) => (pl === 'other' ? null : p.ratings.find((r) => r.platform === pl) ?? null);
  // 品牌页与在售版本不一致（version_mismatch）时，品牌官网卖的不是打分用的配方，不列出
  const mismatch = p.brandClaims.status === 'version_mismatch';
  const links = mismatch ? p.purchaseLinks.filter((l) => l.platform !== 'brand') : p.purchaseLinks;
  const rows: StoreRow[] = links.map((l) => {
    const r = ratingOf(l.platform);
    return { platform: l.platform, host: '', url: l.url, rating: r && shown.has(r.platform) ? r : null, lowCount: !!r && !shown.has(r.platform) };
  });
  // 产品表的 purchase_url 不在购买链接里时也列出
  const dropped = new Set(p.purchaseLinks.filter((l) => !links.includes(l)).map((l) => l.url));
  if (p.purchaseUrl && !dropped.has(p.purchaseUrl) && !rows.some((x) => x.url === p.purchaseUrl)) {
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
  /** 作用，如"去屑""螯合剂" */
  role: Text;
  /** 成分表原文写法 */
  raw: string;
  ingredient: Ingredient;
  kind: 'active' | 'chelator';
}

/**
 * 关键成分：只列有效成分和螯合剂，最多 max 个；风险成分只在"需要注意"里列。
 * 顺序：针对你需求的有效成分 → 其他有效成分 → 螯合剂。
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
    } else if (ing.chelator) {
      seen.add(ing.inciName);
      items.push({ role: { zh: '螯合剂', en: 'Chelating agent' }, raw, ingredient: ing, kind: 'chelator', rank: 2 });
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

// ---------- 需求对照 ----------

/** 满足（依据满分）/ 部分满足（只有产品定位、品牌宣称或非主打成分）/ 无依据 */
export type NeedResult = 'met' | 'partial' | 'none';

export interface NeedRow {
  id: string;
  label: Text;
  result: NeedResult;
  /** 依据类型，用于小标签；无依据时为 null */
  basis: ReasonBasis | null;
  /** 依据的说法：成分名、"产品定位"等；无依据时为 null */
  evidence: Text | null;
}

/** 每个用户选择的需求一行，取计分时用到的那条依据（成品测试 → 主打成分 → 品牌宣称 → 产品定位 → 非主打成分） */
export function needRows(r: ProductScore): NeedRow[] {
  return r.needMatches.map((m) => {
    const result: NeedResult = m.credit >= 1 ? 'met' : m.credit > 0 ? 'partial' : 'none';
    const names = (list: Ingredient[]) => joinNames(list.slice(0, 3).map((i) => ingredientName(i, i.inciName)));
    let basis: ReasonBasis | null = null;
    let evidence: Text | null = null;
    if (m.bases.includes('tested')) {
      basis = 'tested';
      evidence = { zh: '有产品测试', en: 'Product test' };
    } else if (m.keyIngredients.length > 0) {
      basis = 'ingredients';
      evidence = names(m.keyIngredients);
    } else if (m.bases.includes('brand_claim') || (m.bases.includes('claim') && r.product.claimSource === 'brand_text')) {
      basis = 'brand_claim';
      evidence = { zh: '产品页宣称', en: 'Stated on the product page' };
    } else if (m.bases.includes('claim')) {
      basis = 'classification';
      evidence = { zh: '产品定位', en: 'Product positioning' };
    } else if (m.ingredients.length > 0) {
      basis = 'ingredients';
      const n = names(m.ingredients);
      evidence = { zh: `${n.zh}（非主打）`, en: `${n.en} (not a key ingredient)` };
    }
    return { id: m.id, label: m.label, result, basis, evidence };
  });
}

export function needSummary(rows: NeedRow[]) {
  return {
    total: rows.length,
    met: rows.filter((x) => x.result === 'met').length,
    partial: rows.filter((x) => x.result === 'partial').length,
    none: rows.filter((x) => x.result === 'none').length,
  };
}

// ---------- 需要注意 ----------

export interface CautionItem {
  label: Text;
  ingredients: Ingredient[];
  /** 对温和度的影响，与温和度的扣分一致 */
  note: Text;
}

const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** 风险成分：按温和度的扣分明细列出，每类一次，并说明扣了多少分、为什么减半或加倍、为什么不扣分 */
export function cautionItems(r: ProductScore, profile: Pick<ScoringProfile, 'washFrequency' | 'frequentStyling'>): CautionItem[] {
  const { hits, rinseOff, sensitive } = r.irritation;
  return hits.map((h) => {
    const label = h.tag === 'fragrance' ? { zh: '香精 / 香料', en: 'Fragrance' } : capitalize(RISK_TAG_LABELS[h.tag]);
    if (h.unverified) {
      return { label, ingredients: h.ingredients, note: { zh: '成分数据未核对，暂未计入温和度', en: 'Ingredient data not yet verified; not counted in gentleness yet' } };
    }
    if (!h.counted) {
      const note = profile.frequentStyling
        ? { zh: '你常用造型产品，需要较强的清洁力，不扣分', en: 'You use styling products often and need stronger cleansing; no deduction' }
        : profile.washFrequency === 'daily'
          ? { zh: '不扣分', en: 'No deduction' }
          : { zh: '你不是每天洗头，不扣分', en: 'You do not wash daily; no deduction' };
      return { label, ingredients: h.ingredients, note };
    }
    const why: Text[] = [];
    if (rinseOff) why.push({ zh: `冲洗型产品，${label.zh}扣分减半`, en: 'halved because it is rinsed off' });
    if (sensitive) why.push({ zh: '你的头皮较敏感，扣分加倍', en: 'doubled because your scalp is sensitive' });
    const pts = fmtPts(h.deduction);
    return {
      label,
      ingredients: h.ingredients,
      note: why.length > 0
        ? { zh: `温和度扣 ${pts} 分（${why.map((x) => x.zh).join('；')}）`, en: `Gentleness −${pts} (${why.map((x) => x.en).join('; ')})` }
        : { zh: `温和度扣 ${pts} 分`, en: `Gentleness −${pts}` },
    };
  });
}

function capitalize(t: Text): Text {
  return { zh: t.zh, en: t.en.charAt(0).toUpperCase() + t.en.slice(1) };
}

// ---------- 评分明细 ----------

export interface BreakdownRow {
  key: DimensionKey;
  score: number | null;
  /** 重新归一化后的实际权重（0–1）；不计分的维度为 null */
  weight: number | null;
  /** 对总分的贡献 = 得分 × 实际权重 */
  contribution: number | null;
  dimension: Dimension;
}

/** 每个维度的得分、实际权重和贡献；不计分的维度不参与归一化。evidenceCapped 时总分低于贡献之和 */
export function scoreBreakdown(r: ProductScore): { rows: BreakdownRow[]; sum: number | null; total: number | null } {
  const keys = Object.keys(WEIGHTS) as DimensionKey[];
  const wSum = keys.reduce((n, k) => n + (r.dimensions[k].score !== null ? WEIGHTS[k] : 0), 0);
  const rows = keys.map((k) => {
    const d = r.dimensions[k];
    const weight = d.score !== null && wSum > 0 ? WEIGHTS[k] / wSum : null;
    return { key: k, score: d.score, weight, contribution: weight !== null ? d.score! * weight : null, dimension: d };
  });
  const sum = wSum > 0 ? rows.reduce((n, x) => n + (x.contribution ?? 0), 0) : null;
  return { rows, sum, total: r.score };
}
