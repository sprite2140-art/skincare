// 护肤单品打分：在洗护的 scoreProduct 之上加面部规则（草案第 4 节）。
// - 防晒：SPF 30 以上且广谱为硬性条件；缺数据放"信息不全"分组，不排除也不推荐。
// - 敏感肌：A 醇类、过氧化苯甲酰、果酸、水杨酸类计入刺激（每类 15 分，敏感加倍，冲洗型减半）；非敏感肌不扣分。
// - 所有人：含这些成分时提示"初次使用从低频开始，白天需要防晒"。
// - 特殊状态：孕期排除 A 醇类和 pregnancy_note = avoid 的成分；处方外用药 / 口服异维 A 酸排除含上述功效成分的免洗产品。
// - 浓度：公开浓度低于有效范围的主打成分按非主打计。
// - 同等级内排序：敏感肌的香味层级 → 防水（户外久或出汗时）→ 品牌标注不致痘（选了痘痘或出油时）→ 品牌标注肤质。

import type { FaceTarget, Product } from '../data/types';
import { usageTypeOf } from '../data/types';
import type { IngredientIndex } from '../data/ingredientIndex';
import {
  IRRITANT_ACTIVE_CLASSES, isUntintedMineral, productScopedIndex, productActiveClasses, type ActiveClass, type ActiveClassIndex,
} from '../data/faceActives';
import { keyActiveTerms, matchesKeyActive } from '../data/keyActives';
import type { FaceAnswers } from '../profile/faceQuestionnaire';
import { isFaceSensitive, prefersWaterResistant } from '../profile/faceQuestionnaire';
import { IRRITANT_DEDUCTION, RANKED_CONCERN_WEIGHTS, RINSE_OFF_MULTIPLIER, SENSITIVE_MULTIPLIER } from './config';
import { fragranceTier } from './fragrance';
import type { FaceStep } from './faceSteps';
import { ingredientName, joinNames, type Text } from './labels';
import {
  levelOf, scoreProduct, weightedTotal, type Flag, type NeedSpec, type ProductScore, type ScoringData, type ScoringProfile, type SpecialStatus,
} from './score';
import type { BudgetChoice } from './budget';

/** 面部需求在页面上的名称，与问卷选项一致 */
export const FACE_NEED_LABELS: Record<FaceTarget, Text> = {
  acne: { zh: '痘痘、闭口', en: 'Breakouts' },
  oil: { zh: '出油', en: 'Oiliness' },
  dryness: { zh: '干燥、脱皮', en: 'Dryness' },
  redness: { zh: '泛红', en: 'Redness' },
  pigmentation: { zh: '暗沉、色斑', en: 'Dullness, dark spots' },
  aging: { zh: '细纹、松弛', en: 'Fine lines, firmness' },
  pores: { zh: '毛孔', en: 'Visible pores' },
};

/** 防晒的硬性门槛（AAD：SPF 30 以上、广谱） */
export const MIN_SPF = 30;

const PREGNANCY: SpecialStatus[] = ['pregnant', 'trying', 'breastfeeding'];

export interface FaceContext {
  face: FaceAnswers;
  step: FaceStep;
  classes: ActiveClassIndex;
}

export interface FaceExtras {
  /** 成分表中各功效类别的成分（原文写法） */
  classes: Map<ActiveClass, string[]>;
  /** 防晒：ok / below = 不达标（已排除）/ incomplete = SPF 或广谱信息缺失 */
  sunscreen: 'ok' | 'below' | 'incomplete' | null;
  /** 未调色的物理防晒（"隐藏可能泛白的未调色物理防晒"开关） */
  untintedMineral: boolean;
  /**
   * 含 A 醇类、过氧化苯甲酰、果酸、水杨酸类：温和与否取决于个人耐受，"需要注意"里不显示温和度等级，
   * 改写"取决于耐受，见下方提示"（温和度分数照常计算）
   */
  toleranceDependent: boolean;
  /** 同等级内的排序加分项（只排序，不计分） */
  preferred: { waterResistant: boolean; nonComedogenic: boolean; skinType: boolean };
}

export interface FaceProductScore extends ProductScore {
  faceExtras: FaceExtras;
}

/** 某一步的打分输入：只对这一步分到的需求计分，权重按用户的排序 3 / 2 / 1 */
export function faceScoringProfile(
  face: FaceAnswers, step: FaceStep,
  base: Pick<ScoringProfile, 'specialStatus' | 'specialStatuses' | 'avoidIngredients' | 'avoidTags'> & { customBudgetUsd?: number | null },
): ScoringProfile {
  const weightOf = (t: FaceTarget) => RANKED_CONCERN_WEIGHTS[Math.min(face.concerns.indexOf(t), RANKED_CONCERN_WEIGHTS.length - 1)];
  const needs: NeedSpec[] = step.needs.map((t) => ({ id: t, label: FACE_NEED_LABELS[t], targets: [t], weight: weightOf(t) }));
  const budget: BudgetChoice = face.budget === 'q1' || face.budget === 'q2' || face.budget === 'q3' ? face.budget : 'none';
  return {
    concerns: [...step.needs],
    needs,
    concernsRanked: true,
    needScope: { category: step.category, selected: face.concerns.length },
    sensitive: isFaceSensitive(face),
    specialStatus: base.specialStatus,
    specialStatuses: base.specialStatuses,
    avoidIngredients: base.avoidIngredients,
    avoidTags: base.avoidTags,
    budget,
    // 敏感肌同等级内优先无香（沿用洗护的香味层级）
    fragrancePref: isFaceSensitive(face) ? 'free_first' : null,
    washFrequency: null,
    // 面部暂不用水硬度，环境维度不计分
    city: null,
    inUseProducts: [],
  };
}

/**
 * 有效范围里的百分比下限和上限，如"免洗 2%（控油）–5%"→ 2 / 5；认不出时为 null。
 * 写的是允许最高浓度（如防晒剂"允许最高25%"）、或写明有效浓度未知 / 未核定时，不当作下限，返回 null
 */
export function parseRangePercent(range: string): { min: number; max: number | null } | null {
  if (/最高|未知|未核定/.test(range)) return null;
  const nums = [...range.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1]));
  if (nums.length === 0) return null;
  // 第一个范围：数字与连接号之间可以有说明文字，如"2%（控油）–5%"
  const dash = /(\d+(?:\.\d+)?)\s*%?[^\d–—-]*[–—-]\s*(\d+(?:\.\d+)?)\s*%/.exec(range);
  if (dash) return { min: Number(dash[1]), max: Number(dash[2]) };
  return { min: Math.min(...nums), max: null };
}

const percentOf = (s: string) => {
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(s);
  return m ? Number(m[1]) : null;
};

/**
 * 浓度规则：产品公开的浓度低于成分库有效范围的下限时，这个成分不算主打（按非主打 30% 计）；
 * 高于上限时不加分，只提示。浓度或范围缺一项时不调整。
 */
function applyConcentrations(product: Product, index: IngredientIndex): { product: Product; notes: Flag[] } {
  const notes: Flag[] = [];
  const below: string[] = [];
  for (const a of product.face?.activeConcentrations ?? []) {
    const ing = index.get(a.inci);
    const range = ing ? parseRangePercent(ing.effectiveRange) : null;
    const pct = percentOf(a.concentration);
    // 有最低有效浓度的成分（如壬二酸）由证据等级降级处理，不再按非主打计，避免重复扣分
    if (!ing || !range || pct === null || ing.evidenceMinConcentration != null) continue;
    const n = ingredientName(ing, a.inci);
    if (pct < range.min) below.push(a.inci);
    else if (range.max !== null && pct > range.max) {
      notes.push({
        code: 'above_range',
        unverified: ing.reviewStatus !== 'verified',
        text: { zh: `${n.zh}浓度 ${a.concentration}，高于有效范围（${ing.effectiveRange}），不额外加分`, en: `${n.en} at ${a.concentration} is above the effective range (${ing.effectiveRange}); no extra credit` },
      });
    }
  }
  if (below.length === 0) return { product, notes };
  // 从主打成分中去掉低于有效范围的成分
  const keyActives = product.keyActives.filter((k) => !below.some((inci) => matchesKeyActive(inci, index.get(inci) ?? null, keyActiveTerms(k))));
  for (const inci of below) {
    const ing = index.get(inci)!;
    const n = ingredientName(ing, inci);
    notes.push({
      code: 'below_range',
      unverified: ing.reviewStatus !== 'verified',
      text: { zh: `${n.zh}的公开浓度低于有效范围（${ing.effectiveRange}），按非主打成分计`, en: `${n.en} is below the effective range (${ing.effectiveRange}), so it counts as a non-key active` },
    });
  }
  // 去掉后没有主打成分时，按"品牌没有单独公布"处理（有效成分都按非主打计），不能变成"还没填写"（按满分计）
  return { product: { ...product, keyActives, keyActivesDisclosed: product.keyActivesDisclosed && keyActives.length > 0 }, notes };
}

const CLASS_LABELS: Record<ActiveClass, Text> = {
  retinoid: { zh: 'A 醇类', en: 'retinoids' },
  benzoyl_peroxide: { zh: '过氧化苯甲酰', en: 'benzoyl peroxide' },
  aha: { zh: '果酸', en: 'AHAs' },
  bha: { zh: '水杨酸类', en: 'BHAs' },
  pha: { zh: 'PHA（多羟基酸）', en: 'PHAs (polyhydroxy acids)' },
  vitamin_c: { zh: '维生素 C', en: 'vitamin C' },
  sunscreen_mineral: { zh: '物理防晒剂', en: 'mineral sunscreen filters' },
  sunscreen_organic: { zh: '化学防晒剂', en: 'chemical sunscreen filters' },
  iron_oxide: { zh: '氧化铁', en: 'iron oxides' },
};
export const activeClassLabel = (c: ActiveClass) => CLASS_LABELS[c];

export function scoreFaceProduct(product: Product, profile: ScoringProfile, data: ScoringData, ctx: FaceContext): FaceProductScore {
  const { product: adjusted, notes: concentrationNotes } = applyConcentrations(product, data.index);
  // 氧化锌、二氧化钛的功效只在防晒且公开为活性成分时计入
  const ps = scoreProduct(adjusted, profile, { ...data, index: productScopedIndex(data.index, product) });
  const classes = productActiveClasses(product, data.index, ctx.classes);
  const irritantClasses = IRRITANT_ACTIVE_CLASSES.filter((c) => classes.has(c));
  const leaveOn = usageTypeOf(product) !== 'rinse_off';
  const statuses = profile.specialStatuses ?? (profile.specialStatus === 'none' ? [] : [profile.specialStatus]);
  const exclusions = [...ps.exclusions];
  const notices = [...ps.notices, ...concentrationNotes];
  const names = (list: ActiveClass[]) => joinNames(list.map((c) => CLASS_LABELS[c]));

  // 特殊状态：孕期排除 A 醇类（AAD 孕期护肤页）；pregnancy_note = avoid 的成分已由 pregnancy_caution 标签排除
  if (statuses.some((s) => PREGNANCY.includes(s)) && classes.has('retinoid') && !exclusions.some((e) => e.code === 'special_status')) {
    exclusions.push({
      code: 'special_status',
      unverified: false,
      text: { zh: `含 A 醇类（${classes.get('retinoid')!.join('、')}），怀孕、备孕和哺乳期间不推荐`, en: `Contains retinoids (${classes.get('retinoid')!.join(', ')}); not recommended during pregnancy, when trying to conceive or breastfeeding` },
    });
  }
  // pregnancy_note = caution：不排除，只提示
  if (statuses.some((s) => PREGNANCY.includes(s))) {
    const caution = product.inciList.map((raw) => data.index.get(raw)).filter((i) => i?.pregnancyNote === 'caution');
    if (caution.length > 0) {
      const n = joinNames(caution.map((i) => ingredientName(i!, i!.inciName)));
      notices.push({ code: 'pregnancy_caution_use', unverified: false, text: { zh: `含${n.zh}，孕期请注意用量，告诉医生你在用什么`, en: `Contains ${n.en}; during pregnancy, watch the amount and tell your doctor what you use` } });
    }
  }
  // 处方外用药 / 口服异维 A 酸：含功效成分的免洗产品排除（AAD 去角质页、异维 A 酸护肤页）。
  // 只有处方外用药时不排除过氧化苯甲酰（处方抗生素外用药常与它同用，作者决定 2026-10-24），改为提示
  const iso = statuses.includes('isotretinoin');
  const rxExcluded = iso ? irritantClasses : statuses.includes('rx') ? irritantClasses.filter((c) => c !== 'benzoyl_peroxide') : [];
  if (statuses.includes('rx') && !iso && classes.has('benzoyl_peroxide')) {
    notices.push({
      code: 'rx_bpo_note',
      unverified: false,
      text: {
        zh: '如果你在用处方外用药：抗生素类（如克林霉素）常与过氧化苯甲酰同用；处方维 A 酸（tretinoin）不要与过氧化苯甲酰在同一时段使用。具体请按医生的方案。',
        en: 'If you use a prescription topical: antibiotics (such as clindamycin) are often used with benzoyl peroxide; do not use prescription tretinoin at the same time of day as benzoyl peroxide. Follow your doctor\'s plan.',
      },
    });
  }
  if (leaveOn && rxExcluded.length > 0) {
    const n = names(rxExcluded);
    exclusions.push({
      code: 'rx_actives',
      unverified: false,
      text: { zh: `含${n.zh}，你在用处方药，叠加可能加重刺激，请按医生的方案`, en: `Contains ${n.en}; with your prescription treatment this may add irritation, so follow your doctor's plan` },
    });
  }

  // 防晒：SPF 30 以上且广谱
  let sunscreen: FaceExtras['sunscreen'] = null;
  if (product.category === 'sunscreen') {
    const f = product.face;
    const spf = f?.spf ?? null;
    const broad = f?.broadSpectrum ?? 'unknown';
    if ((spf !== null && spf < MIN_SPF) || broad === 'no') {
      sunscreen = 'below';
      exclusions.push({
        code: 'sunscreen_standard',
        unverified: false,
        text: { zh: `不符合 SPF ${MIN_SPF} 以上、广谱的建议`, en: `Does not meet the SPF ${MIN_SPF}+, broad-spectrum recommendation` },
      });
    } else if (spf === null || broad === 'unknown') {
      sunscreen = 'incomplete';
      const missing: Text[] = [
        ...(spf === null ? [{ zh: 'SPF', en: 'SPF' }] : []),
        ...(broad === 'unknown' ? [{ zh: '是否广谱', en: 'broad spectrum' }] : []),
      ];
      notices.push({
        code: 'sunscreen_incomplete',
        unverified: false,
        text: {
          zh: `信息不全，无法确认：缺少${missing.map((m) => m.zh).join('、')}`,
          en: `Incomplete, cannot confirm: missing ${missing.map((m) => m.en).join(' and ')}`,
        },
      });
    } else sunscreen = 'ok';
    const wr = f?.waterResistance ?? 'unknown';
    notices.push({
      code: 'water_resistance',
      unverified: false,
      text: wr === '40' || wr === '80'
        ? { zh: `防水 ${wr} 分钟`, en: `Water resistant (${wr} minutes)` }
        : { zh: '未标注防水', en: 'Not labeled water resistant' },
    });
  }

  // 所有人：含功效成分时从低频开始、白天防晒
  if (irritantClasses.length > 0) {
    const n = names(irritantClasses);
    notices.push({
      code: 'active_start_slow',
      unverified: false,
      text: { zh: `含${n.zh}：初次使用从低频开始（如隔天一次），白天需要防晒`, en: `Contains ${n.en}: start slowly (for example every other day) and use sunscreen during the day` },
    });
  }

  // 敏感肌：功效成分计入刺激风险
  let dimensions = ps.dimensions;
  let irritation = ps.irritation;
  if (profile.sensitive && irritantClasses.length > 0 && dimensions.irritation.score !== null) {
    const rinseOff = !leaveOn;
    const per = IRRITANT_DEDUCTION * SENSITIVE_MULTIPLIER * (rinseOff ? RINSE_OFF_MULTIPLIER : 1);
    const deduction = per * irritantClasses.length;
    const score = Math.max(0, dimensions.irritation.score - deduction);
    const n = names(irritantClasses);
    const reason = {
      zh: `${dimensions.irritation.reason.zh}；含${n.zh}，你的皮肤经常敏感，计入刺激（每类扣 ${per} 分）`,
      en: `${dimensions.irritation.reason.en}; contains ${n.en}, counted as irritants because your skin is often sensitive (−${per} each)`,
    };
    dimensions = { ...dimensions, irritation: { ...dimensions.irritation, score, level: levelOf(score), reason } };
    const ingredients = irritantClasses.flatMap((c) => classes.get(c)!).map((raw) => data.index.get(raw)).filter((i): i is NonNullable<typeof i> => !!i);
    irritation = { ...irritation, hits: [...irritation.hits, { tag: 'active_irritant', ingredients, deduction, counted: true, unverified: false }] };
  }
  // 面部暂不用水硬度：环境维度不计分，原因写清楚（不是"未设置城市"）
  dimensions = {
    ...dimensions,
    environment: { ...dimensions.environment, reason: { zh: '面部护肤暂不考虑水硬度，不计分', en: 'Water hardness is not used for face care yet; not scored' } },
  };
  const score = weightedTotal(dimensions);
  const anyMet = ps.needMatches.some((m) => m.credit >= 1);
  const rawLevel = ps.noNeeds ? null : levelOf(score);
  const fitCapped = !ps.noNeeds && !anyMet && (rawLevel === 'high' || rawLevel === 'medium');

  const f = product.face;
  const claims = f?.skinTypeClaim ?? [];
  const skinType = ctx.face.skinType;
  return {
    ...ps,
    product,
    exclusions,
    excluded: exclusions.length > 0,
    notices,
    dimensions,
    irritation,
    score,
    fitLevel: fitCapped ? 'low' : rawLevel,
    fitCapped,
    faceExtras: {
      classes,
      sunscreen,
      untintedMineral: product.category === 'sunscreen' && isUntintedMineral(classes),
      toleranceDependent: irritantClasses.length > 0,
      preferred: {
        waterResistant: product.category === 'sunscreen' && prefersWaterResistant(ctx.face) && (f?.waterResistance === '40' || f?.waterResistance === '80'),
        nonComedogenic: (ctx.face.concerns.includes('acne') || ctx.face.concerns.includes('oil')) && f?.nonComedogenicClaim === 'yes',
        // 品牌标注适合痘肌：选了痘痘的人也算肤质一致
        skinType: (!!skinType && skinType !== 'unsure' && (claims.includes(skinType) || claims.includes('all')))
          || (ctx.face.concerns.includes('acne') && claims.includes('acne_prone')),
      },
    },
  };
}

export interface RankOptions {
  /** "隐藏可能泛白的未调色物理防晒" */
  hideUntintedMineral?: boolean;
}

/**
 * 一步的产品排序。分组：可推荐 → 不太匹配 → 防晒信息不全 → 无法评分 → 被排除。
 * 组内：选了需求时 适合等级 → 香味层级（敏感肌）→ 同等级的标注排序 → 综合分；
 * 没有分到需求时 温和程度 → 标注排序 → 价格（与洗护"没选需求"一致）。
 */
export function rankFaceStep(
  products: Product[], profile: ScoringProfile, data: ScoringData, ctx: FaceContext, opts: RankOptions = {},
): { ranked: FaceProductScore[]; hidden: number } {
  const scored = products
    // 入库依据待补的产品不出现在推荐结果里
    .filter((p) => p.category === ctx.step.category && !p.inclusionPending)
    .map((p) => scoreFaceProduct(p, profile, data, ctx));
  const hide = opts.hideUntintedMineral && ctx.step.id === 'sunscreen';
  const shown = hide ? scored.filter((s) => !s.faceExtras.untintedMineral) : scored;
  const group = (s: FaceProductScore) =>
    s.excluded ? 4 : s.score === null ? 3 : s.faceExtras.sunscreen === 'incomplete' ? 2 : s.lowMatch ? 1 : 0;
  const LEVEL_ORDER = { high: 0, medium: 1, low: 2 } as const;
  const level = (s: FaceProductScore) => (s.fitLevel ? LEVEL_ORDER[s.fitLevel] : 3);
  const tier = (s: FaceProductScore) => (profile.fragrancePref === 'free_first' && !s.excluded ? fragranceTier(s.fragrance) : 0);
  const prefs = (s: FaceProductScore) => {
    const p = s.faceExtras.preferred;
    // 防水 > 不致痘 > 肤质：按顺序比较
    return (p.waterResistant ? 4 : 0) + (p.nonComedogenic ? 2 : 0) + (p.skinType ? 1 : 0);
  };
  const gentle = (s: FaceProductScore) => s.dimensions.irritation.score ?? -1;
  const price = (s: FaceProductScore) => s.price.usd ?? Infinity;
  const noNeeds = ctx.step.needs.length === 0;
  const ranked = shown.sort((a, b) =>
    group(a) - group(b)
    || (noNeeds
      ? gentle(b) - gentle(a) || tier(a) - tier(b) || prefs(b) - prefs(a) || price(a) - price(b)
      : level(a) - level(b) || tier(a) - tier(b) || prefs(b) - prefs(a) || (b.score ?? 0) - (a.score ?? 0))
    || a.product.productId.localeCompare(b.product.productId));
  return { ranked, hidden: scored.length - shown.length };
}
