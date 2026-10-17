// 推荐理由：每款产品最多两条，按固定规则从打分明细中挑选，不调用 AI。
// 理由只说明依据（成品测试 / 品牌宣称或资料分类 / 成分功能），不推断实际柔顺程度或留香时长。

import { TARGET_LABELS, ingredientName, joinNames, type Text } from './labels';
import { positioningLabel, type NeedMatch, type ProductScore, type ScoringProfile } from './score';
import type { Product } from '../data/types';

function needReason(m: NeedMatch, product: Product): Text {
  const c = positioningLabel(m, product);
  const t = TARGET_LABELS[m.target];
  if (m.bases.includes('tested')) {
    return { zh: `针对${t.zh}：有成品测试支持（依据：成品测试）`, en: `For ${t.en}: supported by a product test (basis: product test)` };
  }
  if (m.keyIngredients.length > 0) {
    const n = joinNames(m.keyIngredients.slice(0, 2).map((i) => ingredientName(i, i.inciName)));
    const claim = c ? { zh: `${c.zh} + `, en: `${c.en} + ` } : { zh: '', en: '' };
    return {
      zh: `针对${t.zh}：主打成分含${n.zh}（依据：${claim.zh}成分功能）`,
      en: `For ${t.en}: key ingredient ${n.en} (basis: ${claim.en}ingredient function)`,
    };
  }
  if (c) {
    return m.bases.includes('brand_claim')
      ? { zh: `品牌宣称针对${t.zh}（依据：品牌宣称）`, en: `Brand claims it helps with ${t.en} (basis: brand claim)` }
      : { zh: `产品定位针对${t.zh}（依据：${c.zh}）`, en: `Positioned for ${t.en} (basis: ${c.en})` };
  }
  const n = joinNames(m.ingredients.slice(0, 2).map((i) => ingredientName(i, i.inciName)));
  return {
    zh: `针对${t.zh}：成分表含${n.zh}，非主打（依据：成分功能，仅作参考）`,
    en: `For ${t.en}: lists ${n.en}, not a key ingredient (basis: ingredient function, for reference only)`,
  };
}

function fragranceReason(r: ProductScore): Text {
  const f = r.fragrance;
  const unknown = f.unknownCount > 0
    ? { zh: `；另有 ${f.unknownCount} 个成分暂无数据，无法完全确认`, en: `; ${f.unknownCount} ingredient(s) have no data, so this is not certain` }
    : { zh: '', en: '' };
  const oils = f.essentialOils.length > 0
    ? { zh: `；含精油（${f.essentialOils.slice(0, 2).join('、')}）`, en: `; contains essential oils (${f.essentialOils.slice(0, 2).join(', ')})` }
    : { zh: '', en: '' };
  if (f.status === 'labeled_free') {
    return { zh: `标注无香，成分表未发现已知加香成分${oils.zh}${unknown.zh}`, en: `Labeled fragrance-free; no known fragrance ingredient listed${oils.en}${unknown.en}` };
  }
  if (f.status === 'none_found') {
    return {
      zh: `未标注无香，成分表未发现已知加香成分${oils.zh}${unknown.zh}`,
      en: `Not labeled fragrance-free; no known fragrance ingredient listed${oils.en}${unknown.en}`,
    };
  }
  if (f.fragrance.length === 0) {
    // 只含精油（精油也算加香）
    return { zh: `含精油（${f.essentialOils.slice(0, 2).join('、')}）`, en: `Contains essential oils (${f.essentialOils.slice(0, 2).join(', ')})` };
  }
  return { zh: `含香精（${f.fragrance.slice(0, 2).join('、')}）`, en: `Contains fragrance (${f.fragrance.slice(0, 2).join(', ')})` };
}

export function recommendReasons(r: ProductScore, profile: ScoringProfile, scentGoal: boolean): Text[] {
  const out: Text[] = [];
  const needs = [...r.needMatches]
    .filter((m) => m.credit > 0)
    .sort((a, b) => b.weight * b.credit - a.weight * a.credit || b.credit - a.credit);
  if (needs[0]) out.push(needReason(needs[0], r.product));

  if (profile.fragrancePref === 'free_first') {
    out.push(fragranceReason(r));
  } else if (scentGoal && r.fragrance.status === 'contains') {
    out.push(r.fragrance.fragrance.length > 0
      ? { zh: '含香精；气味和留香因人而异，需要自己试', en: 'Contains fragrance; scent and how long it lasts vary, so try it yourself' }
      : { zh: '含精油；气味和留香因人而异，需要自己试', en: 'Contains essential oils; scent and how long it lasts vary, so try it yourself' });
  } else if (needs[1]) {
    out.push(needReason(needs[1], r.product));
  } else if (r.dimensions.irritation.level === 'high') {
    out.push({ zh: '有数据的成分中常见刺激成分少', en: 'Few common irritants among ingredients with data' });
  } else if (r.dimensions.environment.score === 100) {
    out.push(r.dimensions.environment.reason);
  }
  if (out.length === 0) out.push({ zh: '没有匹配到你的具体需求，按刺激风险和数据完整度排序', en: 'No specific need matched; ranked by irritation risk and data completeness' });
  return out.slice(0, 2);
}
