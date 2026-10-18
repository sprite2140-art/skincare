// 推荐理由：每款产品最多两条，按固定规则从打分明细中挑选，不调用 AI。
// 卡片上的理由用一句普通人能看懂的话；依据类型（成品测试 / 品牌宣称 / 资料分类 / 成分功能）放在详情里。
// 不推断实际柔顺程度或留香时长。

import { TARGET_LABELS, ingredientName, joinNames, type Text } from './labels';
import { positioningLabel, type NeedMatch, type ProductScore, type ScoringProfile } from './score';
import type { Product, Target } from '../data/types';

/** 成分针对某需求时的通俗说法："含{去屑}成分吡硫鎓锌" */
const ACTION: Partial<Record<Target, Text>> = {
  dandruff: { zh: '去屑', en: 'anti-dandruff' },
  scalp_oil: { zh: '控油', en: 'oil-control' },
  scalp_itch: { zh: '舒缓头皮痒', en: 'itch-soothing' },
  scalp_redness: { zh: '舒缓', en: 'soothing' },
  dry_scalp: { zh: '滋润头皮', en: 'scalp-moisturizing' },
  sensitive_scalp: { zh: '舒缓', en: 'soothing' },
  hair_loss: { zh: '常用于掉发护理的', en: 'hair-loss care' },
  damage: { zh: '修护', en: 'repairing' },
  dryness: { zh: '保湿', en: 'moisturizing' },
  frizz: { zh: '抚平毛躁', en: 'anti-frizz' },
  tangling: { zh: '顺发', en: 'detangling' },
  color_fade: { zh: '护色', en: 'color-care' },
  flat_hair: { zh: '蓬松', en: 'volumizing' },
  shine: { zh: '增加光泽', en: 'shine' },
  clarifying: { zh: '清洁', en: 'cleansing' },
  curl_definition: { zh: '卷发定型', en: 'curl-defining' },
  tone_yellow: { zh: '去黄', en: 'yellow-toning' },
  tone_orange: { zh: '去橙', en: 'orange-toning' },
  buildup: { zh: '去除残留的螯合', en: 'chelating' },
};

/** 理由的依据类型：详情中在每条理由后用小标签标注 */
export type ReasonBasis = 'tested' | 'ingredients' | 'brand_claim' | 'classification';
export type Reason = Text & { basis?: ReasonBasis };

/** 一句普通人能看懂的话；依据类型只在详情中用小标签标注 */
function needReason(m: NeedMatch, product: Product): Reason {
  const c = positioningLabel(m, product);
  const t = TARGET_LABELS[m.target];
  const a = ACTION[m.target] ?? t;
  if (m.bases.includes('tested')) {
    return { zh: `有产品测试支持改善${t.zh}`, en: `A product test supports it for ${t.en}`, basis: 'tested' };
  }
  if (m.keyIngredients.length > 0) {
    const n = joinNames(m.keyIngredients.slice(0, 2).map((i) => ingredientName(i, i.inciName)));
    return { zh: `含${a.zh}成分${n.zh}`, en: `Contains ${a.en} ingredient ${n.en}`, basis: 'ingredients' };
  }
  if (c) {
    return m.bases.includes('brand_claim') || product.claimSource === 'brand_text'
      ? { zh: `品牌说明针对${t.zh}`, en: `The brand says it targets ${t.en}`, basis: 'brand_claim' }
      : { zh: `定位为针对${t.zh}的产品`, en: `Positioned for ${t.en}`, basis: 'classification' };
  }
  const n = joinNames(m.ingredients.slice(0, 2).map((i) => ingredientName(i, i.inciName)));
  return { zh: `成分表里有${a.zh}成分${n.zh}，但不是主打`, en: `Lists ${a.en} ingredient ${n.en}, though not as a key ingredient`, basis: 'ingredients' };
}

function fragranceReason(r: ProductScore): Reason {
  const f = r.fragrance;
  const unknown = f.unknownCount > 0
    ? { zh: `（${f.unknownCount} 个成分暂无数据）`, en: ` (${f.unknownCount} ingredient(s) without data)` }
    : { zh: '', en: '' };
  const b = { basis: 'ingredients' as const };
  if (f.status === 'labeled_free') return { zh: `标注无香${unknown.zh}`, en: `Labeled fragrance-free${unknown.en}`, ...b };
  if (f.status === 'none_found') return { zh: `成分表中没有发现加香成分${unknown.zh}`, en: `No fragrance ingredient found in the list${unknown.en}`, ...b };
  if (f.fragrance.length === 0) return { zh: '含精油', en: 'Contains essential oils', ...b };
  return { zh: '含香精', en: 'Contains fragrance', ...b };
}

/** 温和：不含加香成分且没有常见刺激成分时合成一句 */
function gentleReason(r: ProductScore): Reason {
  return r.fragrance.status !== 'contains' && r.dimensions.irritation.score === 100
    ? { zh: '不含香精和常见刺激成分', en: 'No fragrance or common irritants', basis: 'ingredients' }
    : { zh: '常见刺激成分少', en: 'Few common irritants', basis: 'ingredients' };
}

export function recommendReasons(r: ProductScore, profile: ScoringProfile, scentGoal: boolean): Reason[] {
  const out: Reason[] = [];
  const needs = [...r.needMatches]
    .filter((m) => m.credit > 0)
    .sort((a, b) => b.weight * b.credit - a.weight * a.credit || b.credit - a.credit);
  if (needs[0]) out.push(needReason(needs[0], r.product));

  if (profile.fragrancePref === 'free_first') {
    out.push(fragranceReason(r));
  } else if (scentGoal && r.fragrance.status === 'contains') {
    out.push(r.fragrance.fragrance.length > 0
      ? { zh: '含香精，气味和留香因人而异，建议自己闻一闻', en: 'Contains fragrance; scent and how long it lasts vary, so try it yourself' }
      : { zh: '含精油，气味和留香因人而异，建议自己闻一闻', en: 'Contains essential oils; scent and how long it lasts vary, so try it yourself' });
  } else if (needs[1]) {
    out.push(needReason(needs[1], r.product));
  } else if (r.dimensions.irritation.level === 'high') {
    out.push(gentleReason(r));
  } else if (r.dimensions.environment.score === 100) {
    out.push(r.dimensions.environment.reason);
  }
  if (out.length === 0) {
    out.push(profile.concerns.length === 0
      ? { zh: '你没有选择具体需求，按温和程度和价格排序', en: 'No specific needs chosen; sorted by gentleness and price' }
      : { zh: '没有针对你所选需求的依据', en: 'Nothing supports the needs you chose' });
  }
  return out.slice(0, 2);
}

/** 详情"为什么推荐给你"：所有有依据的需求，加香味或温和度一条 */
export function detailReasons(r: ProductScore, profile: ScoringProfile, scentGoal: boolean): Reason[] {
  if (r.excluded) return [];
  const needs = [...r.needMatches]
    .filter((m) => m.credit > 0)
    .sort((a, b) => b.weight * b.credit - a.weight * a.credit || b.credit - a.credit)
    .map((m) => needReason(m, r.product));
  const extra = profile.fragrancePref === 'free_first' || r.fragrance.status !== 'contains' ? fragranceReason(r)
    : r.dimensions.irritation.level === 'high' ? gentleReason(r) : null;
  const out = extra ? [...needs, extra] : needs;
  return out.length > 0 ? out : recommendReasons(r, profile, scentGoal);
}

