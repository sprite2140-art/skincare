// 面部产品的数据规则：品类、ID 前缀、10 列面部属性、品牌宣称对应表。字段说明见 docs/DATA_SCHEMA.md。

import {
  FACE_CATEGORIES, FACE_ID_PREFIXES, FACE_TARGETS, SKIN_TYPE_CLAIMS, TEXTURES, USE_TIMES, WATER_RESISTANCE, YES_NO_UNKNOWN,
} from './types';
import type { Category, FaceAttributes, FaceTarget, Ingredient, Product } from './types';

export const isFaceCategory = (category: string) => (FACE_CATEGORIES as readonly string[]).includes(category);

/**
 * brand_claim_targets 对应表（面部）：品牌原文里的说法 → 面部需求代码。
 * 只用于校验提示（原文出现这些词、但 brand_claim_targets 没有对应代码时提醒），不自动填写。
 */
export const FACE_CLAIM_KEYWORDS: { target: FaceTarget; pattern: RegExp; terms: string }[] = [
  { target: 'dryness', pattern: /\b(hydrat\w*|moisturi[sz]\w*)/i, terms: 'Hydrating / Moisturizing' },
  { target: 'acne', pattern: /\b(acne|blemish\w*|breakouts?)\b/i, terms: 'Acne / Blemish / Breakouts' },
  { target: 'oil', pattern: /\b(oil[- ]control\w*|mattif\w*)/i, terms: 'Oil control / Mattifying' },
  { target: 'redness', pattern: /\b(sooth\w*|calm\w*|redness)\b/i, terms: 'Soothing / Calming / Redness' },
  { target: 'pigmentation', pattern: /\b(brighten\w*|dark[- ]spots?)\b/i, terms: 'Brightening / Dark spots' },
  { target: 'aging', pattern: /\b(anti[- ]?aging|firm\w*|wrinkles?)\b/i, terms: 'Anti-aging / Firming / Wrinkles' },
  { target: 'pores', pattern: /\b(pores?|refin\w*)\b/i, terms: 'Pores / Refining' },
];

/** 品牌宣称原文中出现、但 brand_claim_targets 里没有的面部需求代码 */
export function missingFaceClaimTargets(p: Product): { target: FaceTarget; terms: string }[] {
  const text = p.brandClaims.quote || (p.brandClaims.status === 'brand_page_quote' ? p.brandClaims.text : '');
  if (!text) return [];
  return FACE_CLAIM_KEYWORDS.filter((k) => k.pattern.test(text) && !p.brandClaims.targets.includes(k.target))
    .map(({ target, terms }) => ({ target, terms }));
}

const hasFaceValues = (f: FaceAttributes) =>
  f.skinTypeClaim.length > 0 || f.texture !== null || f.spf !== null || f.broadSpectrum !== 'unknown' ||
  f.waterResistance !== 'unknown' || f.activeConcentrations.length > 0 || f.useTime !== 'unknown' ||
  f.useFrequency !== '' || f.nonComedogenicClaim !== 'unknown' || f.faceStepNote !== '';

const URL_RE = /^https?:\/\//;

/** 面部产品的格式检查；洗护产品这些列为空时不检查 */
export function validateFaceProduct(
  p: Product,
  lookup: (name: string) => Ingredient | undefined,
  err: (message: string) => void,
  warn: (message: string) => void,
) {
  const face = isFaceCategory(p.category);
  if (face && p.zone !== 'face') err(`品类 ${p.category} 是面部品类，zone 应为 face`);
  if (!face && p.zone === 'face' && p.category) err(`zone = face 时 category 应为面部品类：${FACE_CATEGORIES.join(' / ')}`);

  const prefix = FACE_ID_PREFIXES[p.category as Category];
  if (prefix && !new RegExp(`^${prefix}-${p.region}-\\d{3}$`).test(p.productId)) {
    err(`${p.category} 的 product_id 应为 ${prefix}-${p.region}-序号（3 位），如 ${prefix}-${p.region}-001`);
  }

  const f = p.face;
  if (!f) return;
  if (!face) {
    if (hasFaceValues(f)) warn('面部属性列（skin_type_claim 至 face_step_note）只用于面部产品，这里的内容不会使用');
    return;
  }
  const targets = [...p.claimedBenefits, ...p.brandClaims.targets, ...p.testedClaims.map((c) => c.target)];
  for (const t of new Set(targets)) {
    if (!(FACE_TARGETS as readonly string[]).includes(t)) err(`面部产品的需求代码应为 ${FACE_TARGETS.join(' / ')}：${t}`);
  }

  const oneOf = (field: string, value: string, allowed: readonly string[]) => {
    if (!allowed.includes(value)) err(`${field} 取值 "${value}" 不在允许范围：${allowed.join(' / ')}`);
  };
  for (const s of f.skinTypeClaim) oneOf('skin_type_claim', s, SKIN_TYPE_CLAIMS);
  if (f.skinTypeClaim.includes('all') && f.skinTypeClaim.length > 1) warn('skin_type_claim 写了 all，就不用再列其他肤质');
  if (f.texture !== null) oneOf('texture', f.texture, TEXTURES);
  oneOf('broad_spectrum', f.broadSpectrum, YES_NO_UNKNOWN);
  oneOf('water_resistance', f.waterResistance, WATER_RESISTANCE);
  oneOf('use_time', f.useTime, USE_TIMES);
  oneOf('non_comedogenic_claim', f.nonComedogenicClaim, YES_NO_UNKNOWN);

  if (p.category === 'sunscreen') {
    if (f.spf === null) warn('防晒缺少 spf');
    else if (!(f.spf > 0)) err('spf 应为正数');
    if (f.broadSpectrum === 'unknown') warn('防晒的 broad_spectrum 未填写（yes / no）');
  } else {
    if (f.spf !== null) err('spf 只有 sunscreen 填写');
    if (f.broadSpectrum !== 'unknown' || f.waterResistance !== 'unknown') warn('broad_spectrum、water_resistance 只用于防晒，这里的内容不会使用');
  }

  for (const a of f.activeConcentrations) {
    if (!a.inci || !a.concentration || !URL_RE.test(a.url)) {
      err(`active_concentrations 每一项格式为 INCI|浓度|链接，三项都要填，链接为 http(s)：${a.inci}|${a.concentration}|${a.url}`);
      continue;
    }
    if (!/\d/.test(a.concentration)) err(`active_concentrations 的浓度应含数字（如 2%）：${a.inci}|${a.concentration}`);
    const ing = lookup(a.inci);
    const inList = p.inciList.some((n) => {
      const m = lookup(n);
      return m && ing ? m.inciName === ing.inciName : n.toLowerCase() === a.inci.toLowerCase();
    });
    if (!inList) warn(`active_concentrations 中的 "${a.inci}" 在 inci_list 中找不到`);
  }

  if (f.nonComedogenicClaim === 'yes' && !URL_RE.test(p.brandClaims.sourceUrl)) {
    err('non_comedogenic_claim = yes 时必须填写 brand_claims_source_url（出处）');
  }

  for (const m of missingFaceClaimTargets(p)) {
    warn(`品牌宣称原文含 ${m.terms}，brand_claim_targets 里没有 ${m.target}；请确认是否补上`);
  }
}
