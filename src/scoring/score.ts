// 打分逻辑：固定规则，不调用 AI。规则说明见 docs/SCORING.md。
//
// 两条数据原则：
// - 打分（四个维度）只用已核对的成分：review_status = verified，或基础成分（category = base，不需要人工核对）。
//   产品成分表里带 [待核对] 标记的成分（名称未核对）不参与打分。
//   测试模式（ScoringData.allowDraft）下，draft 的有效成分和风险成分也参与打分，结果标注"测试数据，尚未核对"。
// - 安全相关（硬性过滤、孕期提示、搭配冲突）也看 draft 成分和名称未核对的成分，宁可多提示，结果里标注"未核对"。

import { usageTypeOf } from '../data/types';
import { evidenceFor, type TargetEvidence } from './evidence';
import type { Category, City, ExchangeRate, Ingredient, Product, RiskTag, Target, UsageType } from '../data/types';
import { normalizeName, type IngredientIndex } from '../data/ingredientIndex';
import {
  BRAND_CLAIM_CREDIT, CHELATOR_TARGETS, ENVIRONMENT_SCORES, EVIDENCE_SCORES, MISSING_EVIDENCE_LEVEL,
  IRRITANT_DEDUCTION, IRRITANT_TAGS, LEVEL_THRESHOLDS, NON_KEY_ACTIVE_CREDIT, RANKED_CONCERN_WEIGHTS, RINSE_OFF_MULTIPLIER,
  SENSITIVE_MULTIPLIER, STRONG_CLEANSER_DEDUCTION, TESTED_CLAIM_CREDIT, TESTED_EVIDENCE_SCORE, WEIGHTS, type DimensionKey,
} from './config';
import { matchesKeyActive, productKeyActiveTerms, type KeyActiveTerm } from '../data/keyActives';
import { fragranceInfo, fragranceTier, type FragranceInfo } from './fragrance';
import { RISK_TAG_LABELS, TARGET_LABELS, ingredientName, joinNames, type Text } from './labels';
import { priceInfo, type PriceInfo } from './price';
import { capFor, type BudgetCapsByCategory, type BudgetChoice } from './budget';

/** 打分用到的数据 */
export interface ScoringData {
  index: IngredientIndex;
  exchangeRates: ExchangeRate[];
  /** 各品类预算价格上限界线，由 computeBudgetCaps() 从产品库计算 */
  budgetCaps: BudgetCapsByCategory;
  /** 测试模式：允许 draft 成分参与打分。正式上线前必须关闭，见 config.ts 的 TEST_MODE_DRAFT_SCORING */
  allowDraft?: boolean;
}

/** 特殊状态（档案入口，可多选）。isotretinoin = 口服异维 A 酸：只影响护肤，洗护的处理不变 */
export type SpecialStatus = 'none' | 'pregnant' | 'trying' | 'breastfeeding' | 'rx' | 'isotretinoin';
export type WashFrequency = 'daily' | 'every_other_day' | 'twice_weekly_or_less';
/** 香味偏好：无香优先 / 接受香味 / 无所谓 */
export type FragrancePref = 'free_first' | 'ok' | 'any';

/**
 * 用户明确选择的一个需求（一项头皮困扰或一项期望效果）。一个选项可能对应多个 targets
 * （如"柔顺"对应毛躁和打结），按其中依据最好的一个计分，结果页每个需求一行。
 */
export interface NeedSpec {
  id: string;
  label: Text;
  targets: Target[];
  weight: number;
}

export interface ScoringProfile {
  /** 用户的困扰和期望效果，已映射到 targets 取值（needs 中所有 targets 的并集） */
  concerns: Target[];
  /** 按用户选项分组的需求；没有时每个 concern 单独作为一个需求 */
  needs?: NeedSpec[];
  /** 各困扰的权重；未写的按 concernsRanked 规则计算（洗发水侧重头皮，护发素只看发丝） */
  targetWeights?: Partial<Record<Target, number>>;
  /** true：按重要程度排序（面部）；false：多选不排序（头皮、头发），平均加权 */
  concernsRanked: boolean;
  /**
   * 只计入与某一步相关的需求时（面部按步骤分配）：这一步的品类和用户一共选了几项。
   * 卡片写"与洁面相关的需求：痘痘（你共选了 3 项）"，而不是"你选的 1 个需求"。
   */
  needScope?: { category: Category; selected: number };
  /** 敏感肌或头皮易痒 */
  sensitive: boolean;
  specialStatus: SpecialStatus;
  /** 多选的特殊状态；有这一项时代替 specialStatus */
  specialStatuses?: SpecialStatus[];
  /** 想避开的具体成分（INCI 名或别名） */
  avoidIngredients: string[];
  /** 想避开的成分类型，如 fragrance */
  avoidTags: RiskTag[];
  /** 该品类的价格上限：三个四分位上限 / 不限 / 自填上限 */
  budget: BudgetChoice;
  /** budget 为 custom 时的上限（USD） */
  customBudgetUsd?: number | null;
  fragrancePref?: FragrancePref | null;
  washFrequency: WashFrequency | null;
  /** 常用造型产品（每周 3 次以上）：每天洗头时也不因强清洁力表活扣分 */
  frequentStyling?: boolean;
  city: City | null;
  inUseProducts: Product[];
}

export type Level = 'high' | 'medium' | 'low';

export interface Dimension {
  /** 0–100；null 表示数据不足，不参与加权 */
  score: number | null;
  level: Level | null;
  weight: number;
  reason: Text;
  /**
   * score 为 null 的原因：not_scored = 这个维度对你不适用（如水质不硬、未设城市），
   * missing = 数据缺失（如只有品牌宣称或资料分类，没有成分或测试证据）。两者都不参与加权。
   */
  state?: 'not_scored' | 'missing';
}

export interface Flag {
  code: string;
  text: Text;
  /** 依据的成分里有未核对（draft）的 */
  unverified: boolean;
}

export interface ConflictWarning {
  inUseProductId: string;
  ingredient: string;
  inUseIngredient: string;
  severity: 'mild' | 'severe';
  unverified: boolean;
  text: Text;
}

/** 温和度（刺激风险）的扣分明细，页面"需要注意"按这里列出，与温和度结论一致 */
export interface IrritantHit {
  tag: RiskTag;
  ingredients: Ingredient[];
  /** 实际扣分（已按冲洗型减半、敏感加倍）；不扣分时为 0 */
  deduction: number;
  /** 是否计入温和度（强清洁力表活只在每天洗头且不常用造型产品时计入；未核对的成分在正式模式下不计入） */
  counted: boolean;
  /** 依据的成分还没核对，未参与打分（只展示） */
  unverified: boolean;
}

export interface IrritationDetail {
  hits: IrritantHit[];
  rinseOff: boolean;
  sensitive: boolean;
}

export interface ProductScore {
  product: Product;
  excluded: boolean;
  exclusions: Flag[];
  /** 综合适配分 0–100；null 表示没有可用的已核对数据 */
  score: number | null;
  /** 适合等级（高 / 中 / 低，按综合分）；没有选需求时为 null，页面不显示总分和适合等级 */
  fitLevel: Level | null;
  /** 用户没有选任何需求：按温和程度和价格排序 */
  noNeeds: boolean;
  /** 选了需求但需求匹配为 0：不进入推荐列表，放在"不太匹配"区域 */
  lowMatch: boolean;
  /** 一项需求都没有满足，适合等级按规则降为"一般" */
  fitCapped: boolean;
  dimensions: Record<DimensionKey, Dimension>;
  notices: Flag[];
  conflicts: ConflictWarning[];
  /** 不在成分库的成分 */
  unknownIngredients: string[];
  /** 名称未核对（成分表中带 [待核对] 标记）的成分 */
  nameUnverifiedIngredients: string[];
  /** 在成分库但未核对的成分（基础成分不算） */
  unverifiedIngredients: string[];
  /** 测试模式下，打分用到了未核对的成分 */
  usesDraftData: boolean;
  /** 需求匹配的明细，供推荐理由使用 */
  needMatches: NeedMatch[];
  /** 温和度扣分明细 */
  irritation: IrritationDetail;
  fragrance: FragranceInfo;
  /** 展示用当地价格；usd 用于预算比较 */
  price: { amount: number | null; currency: string; usd: number | null };
  transparency: Product['transparency'];
}

interface Resolved {
  raw: string;
  position: number;
  ingredient: Ingredient | null;
  /** 成分表中带 [待核对] 标记 */
  nameUnverified: boolean;
}

/** 已核对：verified，或基础成分（不需要人工核对）；名称未核对的成分一律不算 */
const isVerified = (r: Resolved): r is Resolved & { ingredient: Ingredient } =>
  !r.nameUnverified && (r.ingredient?.reviewStatus === 'verified' || r.ingredient?.category === 'base');
const isKnown = (r: Resolved): r is Resolved & { ingredient: Ingredient } => r.ingredient !== null;

export function levelOf(score: number | null): Level | null {
  if (score === null) return null;
  if (score >= LEVEL_THRESHOLDS.high) return 'high';
  if (score >= LEVEL_THRESHOLDS.medium) return 'medium';
  return 'low';
}

function dimension(key: DimensionKey, score: number | null, reason: Text, state?: Dimension['state']): Dimension {
  const rounded = score === null ? null : Math.round(score);
  const d: Dimension = { score: rounded, level: levelOf(rounded), weight: WEIGHTS[key], reason };
  if (rounded === null) d.state = state ?? 'missing';
  return d;
}

function resolve(product: Product, index: IngredientIndex): Resolved[] {
  const flagged = new Set(product.inciNameUnverified);
  return product.inciList.map((raw, i) => ({
    raw,
    position: i + 1,
    ingredient: index.get(raw) ?? null,
    nameUnverified: flagged.has(raw),
  }));
}

export type IngredientStatus = 'verified' | 'draft' | 'unknown' | 'name_unverified';

/** 结果页展示用：每个成分的数据状态。名称未核对的成分显示为暂无数据 */
export function ingredientStatuses(product: Product, index: IngredientIndex): { name: string; status: IngredientStatus }[] {
  return resolve(product, index).map((r) => ({
    name: r.raw,
    status: r.nameUnverified ? 'name_unverified' : !r.ingredient ? 'unknown' : isVerified(r) ? 'verified' : 'draft',
  }));
}

/** 打分用的需求列表：问卷给出的 needs，或由 concerns + 权重得到（每个 target 一个需求） */
export function needSpecs(profile: Pick<ScoringProfile, 'concerns' | 'concernsRanked' | 'targetWeights' | 'needs'>): NeedSpec[] {
  if (profile.needs) return profile.needs.filter((n) => n.weight > 0 && n.targets.length > 0);
  return [...concernWeights(profile.concerns, profile.concernsRanked, profile.targetWeights)]
    .map(([t, w]) => ({ id: t, label: TARGET_LABELS[t], targets: [t], weight: w }));
}

export function concernWeights(
  concerns: Target[], ranked: boolean, overrides: Partial<Record<Target, number>> = {},
): Map<Target, number> {
  const weights = new Map<Target, number>();
  concerns.forEach((c, i) => {
    if (weights.has(c)) return;
    const w = overrides[c] ?? (ranked
      ? RANKED_CONCERN_WEIGHTS[Math.min(i, RANKED_CONCERN_WEIGHTS.length - 1)]
      : 1);
    if (w > 0) weights.set(c, w);
  });
  return weights;
}

// ---------- 硬性过滤 ----------

const PREGNANCY_STATUSES: SpecialStatus[] = ['pregnant', 'trying', 'breastfeeding'];
const STATUS_LABELS: Record<SpecialStatus, Text> = {
  none: { zh: '', en: '' },
  pregnant: { zh: '怀孕', en: 'pregnancy' },
  trying: { zh: '备孕', en: 'trying to conceive' },
  breastfeeding: { zh: '哺乳', en: 'breastfeeding' },
  rx: { zh: '正在用处方皮肤药', en: 'using prescription skin medication' },
  isotretinoin: { zh: '口服异维 A 酸', en: 'taking oral isotretinoin' },
};

/** 用户的特殊状态列表（多选；旧档案只有单选的 specialStatus） */
export function statusesOf(profile: Pick<ScoringProfile, 'specialStatus' | 'specialStatuses'>): SpecialStatus[] {
  const list = profile.specialStatuses ?? [profile.specialStatus];
  return list.filter((s) => s !== 'none');
}

function withTag(items: Resolved[], tag: RiskTag) {
  const hits = items.filter(isKnown).filter((r) => r.ingredient.riskTags.includes(tag));
  return {
    hits,
    names: joinNames(hits.map((r) => ingredientName(r.ingredient, r.raw))),
    unverified: hits.some((r) => !isVerified(r)),
  };
}

/** 孕期 / 处方药需注意成分的原因：取成分库里的通俗解释，让用户知道是谨慎处理 */
function cautionReasons(hits: (Resolved & { ingredient: Ingredient })[]): Text {
  const seen = new Set<string>();
  const zh: string[] = [];
  const en: string[] = [];
  for (const r of hits) {
    if (seen.has(r.ingredient.inciName)) continue;
    seen.add(r.ingredient.inciName);
    const n = ingredientName(r.ingredient, r.raw);
    if (r.ingredient.explainZh) zh.push(`${n.zh}：${r.ingredient.explainZh}`);
    if (r.ingredient.explainEn) en.push(`${n.en}: ${r.ingredient.explainEn}`);
  }
  return { zh: zh.join(''), en: en.length ? ` ${en.join(' ')}` : '' };
}

const unverifiedSuffix = (unverified: boolean): Text =>
  unverified ? { zh: '（成分数据未核对）', en: ' (ingredient data not yet verified)' } : { zh: '', en: '' };

function hardFilters(
  product: Product, items: Resolved[], profile: ScoringProfile, index: IngredientIndex, price: PriceInfo,
  capUsd: number | null,
): Flag[] {
  const out: Flag[] = [];

  // 特殊状态（可多选）：孕期类对应 pregnancy_caution，处方药对应 rx_caution；口服异维 A 酸在洗护中没有对应标签
  const seenTags = new Set<RiskTag>();
  for (const status of statusesOf(profile)) {
    const statusTag: RiskTag | null = PREGNANCY_STATUSES.includes(status)
      ? 'pregnancy_caution'
      : status === 'rx' ? 'rx_caution' : null;
    if (!statusTag || seenTags.has(statusTag)) continue;
    seenTags.add(statusTag);
    const { hits, names, unverified } = withTag(items, statusTag);
    if (hits.length > 0) {
      const s = STATUS_LABELS[status];
      const suf = unverifiedSuffix(unverified);
      const why = cautionReasons(hits);
      out.push({
        code: 'special_status',
        unverified,
        text: {
          zh: `含${names.zh}，为谨慎起见，${s.zh}期间不推荐${suf.zh}。${why.zh}`.trimEnd(),
          en: `Contains ${names.en}; as a precaution, not recommended during ${s.en}${suf.en}.${why.en}`.trimEnd(),
        },
      });
    }
  }

  // 想避开的具体成分：按名称匹配，库里没有的成分也能避开
  const avoidKeys = new Set<string>();
  for (const name of profile.avoidIngredients) {
    avoidKeys.add(normalizeName(name));
    const ing = index.get(name);
    if (ing) avoidKeys.add(normalizeName(ing.inciName));
  }
  const avoidHits = items.filter(
    (r) => avoidKeys.has(normalizeName(r.raw)) || (r.ingredient && avoidKeys.has(normalizeName(r.ingredient.inciName))),
  );
  if (avoidHits.length > 0) {
    const names = joinNames(avoidHits.map((r) => ingredientName(r.ingredient, r.raw)));
    out.push({
      code: 'avoid_ingredient',
      unverified: false,
      text: { zh: `含你想避开的成分：${names.zh}`, en: `Contains ingredients you want to avoid: ${names.en}` },
    });
  }

  // 想避开的成分类型
  for (const tag of profile.avoidTags) {
    const { hits, names, unverified } = withTag(items, tag);
    if (hits.length === 0) continue;
    const suf = unverifiedSuffix(unverified);
    out.push({
      code: 'avoid_tag',
      unverified,
      text: {
        zh: `含${RISK_TAG_LABELS[tag].zh}（${names.zh}），你选择了避开${suf.zh}`,
        en: `Contains ${RISK_TAG_LABELS[tag].en} (${names.en}), which you chose to avoid${suf.en}`,
      },
    });
  }

  // 单件价格上限：换算成 USD 比较，等于上限的保留
  if (price.status === 'ok' && capUsd !== null && price.usd > capUsd) {
    const local = `${product.price} ${product.currency}`;
    const usd = product.currency === 'USD' ? '' : `（约 ${price.usd.toFixed(2)} USD）`;
    const usdEn = product.currency === 'USD' ? '' : ` (about ${price.usd.toFixed(2)} USD)`;
    out.push({
      code: 'over_budget',
      unverified: false,
      text: {
        zh: `价格 ${local}${usd}，超出你选的预算上限（约 ${capUsd.toFixed(2)} USD）`,
        en: `Price ${local}${usdEn} is over your budget limit (about ${capUsd.toFixed(2)} USD)`,
      },
    });
  }

  return out;
}

// ---------- 搭配冲突 ----------

/** 两个成分之间的搭配冲突（任一方的 conflicts_with 写明即可，双向识别） */
export function conflictSeverity(a: Ingredient, b: Ingredient): 'mild' | 'severe' | null {
  const matches = (target: Ingredient, name: string) => {
    const key = normalizeName(name);
    return [target.inciName, ...target.aliases].some((n) => normalizeName(n) === key);
  };
  let found: 'mild' | 'severe' | null = null;
  for (const c of a.conflictsWith) if (matches(b, c.inci)) found = found === 'severe' ? found : c.severity;
  for (const c of b.conflictsWith) if (matches(a, c.inci)) found = found === 'severe' ? found : c.severity;
  return found;
}

function checkConflicts(items: Resolved[], profile: ScoringProfile, index: IngredientIndex): ConflictWarning[] {
  const out: ConflictWarning[] = [];
  const seen = new Set<string>();
  for (const used of profile.inUseProducts) {
    const usedItems = resolve(used, index).filter(isKnown);
    for (const a of items.filter(isKnown)) {
      for (const b of usedItems) {
        const severity = conflictSeverity(a.ingredient, b.ingredient);
        if (!severity) continue;
        const key = `${used.productId}|${a.ingredient.inciName}|${b.ingredient.inciName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const unverified = !isVerified(a) || !isVerified(b);
        const an = ingredientName(a.ingredient, a.raw);
        const bn = ingredientName(b.ingredient, b.raw);
        const usedName = { zh: used.nameZh || used.nameEn, en: used.nameEn || used.nameZh };
        const suf = unverifiedSuffix(unverified);
        out.push({
          inUseProductId: used.productId,
          ingredient: a.ingredient.inciName,
          inUseIngredient: b.ingredient.inciName,
          severity,
          unverified,
          text: severity === 'severe'
            ? {
                zh: `含${an.zh}，与你在用的「${usedName.zh}」中的${bn.zh}严重冲突，不建议同时使用${suf.zh}`,
                en: `Contains ${an.en}, which seriously conflicts with ${bn.en} in "${usedName.en}" you use${suf.en}`,
              }
            : {
                zh: `含${an.zh}，与你在用的「${usedName.zh}」中的${bn.zh}有冲突，建议分开早晚使用${suf.zh}`,
                en: `Contains ${an.en}, which conflicts with ${bn.en} in "${usedName.en}"; use them at different times of day${suf.en}`,
              },
        });
      }
    }
  }
  return out;
}

// ---------- 四个维度（只用 verified 成分） ----------

/** 产品定位的来源标注：品牌原文为"品牌宣称"，资料整理时的分类为"资料分类"（没写来源的按资料分类） */
export function claimLabel(product: Pick<Product, 'claimSource'>): Text {
  return product.claimSource === 'brand_text'
    ? { zh: '品牌宣称', en: 'brand claim' }
    : { zh: '资料分类', en: 'data classification' };
}

/** 一个困扰的匹配依据 */
/** claim = 产品定位（claimed_benefits，品牌原文或资料分类）；brand_claim = 品牌产品页明确宣称的效果（brand_claim_targets） */
export type NeedBasis = 'tested' | 'claim' | 'brand_claim' | 'key_active' | 'ingredient';

/** 产品定位类依据的标注：有品牌明确宣称时显示"品牌宣称"，否则按 claimed_benefits 的来源 */
export function positioningLabel(m: Pick<NeedMatch, 'bases'>, product: Pick<Product, 'claimSource'>): Text | null {
  if (m.bases.includes('brand_claim')) return { zh: '品牌宣称', en: 'brand claim' };
  if (m.bases.includes('claim')) return claimLabel(product);
  return null;
}

export interface NeedMatch {
  /** 需求（用户选项）的 id 和名称 */
  id: string;
  label: Text;
  targets: Target[];
  /** 依据最好的那个 target */
  target: Target;
  weight: number;
  /** 0–1 */
  credit: number;
  bases: NeedBasis[];
  /** 针对该困扰的有效成分（成分功能） */
  ingredients: Ingredient[];
  keyIngredients: Ingredient[];
}

/** 成分是否针对某困扰：成分库 targets，或螯合剂清单上的成分 → 产品残留 */
function ingredientTargets(i: Ingredient, target: Target): boolean {
  if (i.category === 'active' && i.targets.includes(target)) return true;
  return !!i.chelator && CHELATOR_TARGETS.includes(target);
}

/**
 * 需求匹配。每个困扰按最可靠的依据计分（不按成分数量加分）：
 * 成品测试 1；主打成分覆盖 1；品牌宣称（产品定位）BRAND_CLAIM_CREDIT；只有非主打成分覆盖 NON_KEY_ACTIVE_CREDIT。
 * keyTerms 为 null（产品还没填写主打成分）时，有效成分都按满分计。
 */
function matchTarget(
  product: Product,
  verified: (Resolved & { ingredient: Ingredient })[],
  target: Target,
  isKey: (r: Resolved & { ingredient: Ingredient }) => boolean,
) {
  const hits = verified.filter((r) => ingredientTargets(r.ingredient, target));
  const unique = (list: (Resolved & { ingredient: Ingredient })[]) =>
    list.map((r) => r.ingredient).filter((ing, i, arr) => arr.indexOf(ing) === i);
  const ingredients = unique(hits);
  const keyIngredients = unique(hits.filter(isKey));
  const bases: NeedBasis[] = [];
  let credit = 0;
  if (product.testedClaims.some((c) => c.target === target)) {
    bases.push('tested');
    credit = Math.max(credit, TESTED_CLAIM_CREDIT);
  }
  if (product.brandClaims.targets.includes(target)) {
    bases.push('brand_claim');
    credit = Math.max(credit, BRAND_CLAIM_CREDIT);
  }
  if (product.claimedBenefits.includes(target)) {
    bases.push('claim');
    credit = Math.max(credit, BRAND_CLAIM_CREDIT);
  }
  if (keyIngredients.length > 0) {
    bases.push('key_active');
    credit = Math.max(credit, 1);
  } else if (ingredients.length > 0) {
    bases.push('ingredient');
    credit = Math.max(credit, NON_KEY_ACTIVE_CREDIT);
  }
  return { target, credit, bases, ingredients, keyIngredients };
}

function scoreNeed(
  product: Product,
  verified: (Resolved & { ingredient: Ingredient })[],
  specs: NeedSpec[],
  keyTerms: KeyActiveTerm[] | null,
) {
  const isKey = (r: Resolved & { ingredient: Ingredient }) => keyTerms === null || matchesKeyActive(r.raw, r.ingredient, keyTerms);
  const needMatches: NeedMatch[] = [];
  for (const spec of specs) {
    // 一个需求对应多个 target 时，取依据最好的一个（同分时依据种类多的优先）
    const best = spec.targets
      .map((t) => matchTarget(product, verified, t, isKey))
      .sort((a, b) => b.credit - a.credit || b.bases.length - a.bases.length)[0];
    needMatches.push({ id: spec.id, label: spec.label, targets: spec.targets, weight: spec.weight, ...best });
  }

  if (specs.length === 0) {
    return {
      needMatches,
      dim: dimension('need', null, { zh: '你没有选择困扰或期望效果，此项不计分', en: 'No concerns or goals selected, so this is not scored' }),
    };
  }

  let total = 0;
  let covered = 0;
  const zh: string[] = [];
  const en: string[] = [];
  const pct = Math.round(NON_KEY_ACTIVE_CREDIT * 100);
  for (const m of needMatches) {
    total += m.weight;
    covered += m.weight * m.credit;
    const label = m.label;
    const partsZh: string[] = [];
    const partsEn: string[] = [];
    if (m.bases.includes('tested')) {
      partsZh.push('有成品测试');
      partsEn.push('product test available');
    }
    const pos = positioningLabel(m, product);
    if (pos) {
      partsZh.push(pos.zh);
      partsEn.push(pos.en);
    }
    if (m.keyIngredients.length > 0) {
      const n = joinNames(m.keyIngredients.map((i) => ingredientName(i, i.inciName)));
      const tag = keyTerms === null ? { zh: '', en: '' } : { zh: '（主打）', en: ' (key active)' };
      partsZh.push(`含${n.zh}${tag.zh}`);
      partsEn.push(`contains ${n.en}${tag.en}`);
    } else if (m.ingredients.length > 0) {
      const n = joinNames(m.ingredients.map((i) => ingredientName(i, i.inciName)));
      partsZh.push(`含${n.zh}（非主打，按 ${pct}% 计）`);
      partsEn.push(`contains ${n.en} (not a key active, counted at ${pct}%)`);
    }
    if (partsZh.length === 0) {
      zh.push(`针对${label.zh}：没有找到依据`);
      en.push(`for ${label.en}: no support found`);
    } else {
      zh.push(`针对${label.zh}：${partsZh.join('，')}`);
      en.push(`for ${label.en}: ${partsEn.join(', ')}`);
    }
  }
  const enText = en.join('; ');
  return {
    needMatches,
    dim: dimension('need', (covered / total) * 100, {
      zh: zh.join('；'),
      en: enText.charAt(0).toUpperCase() + enText.slice(1),
    }),
  };
}

/**
 * 证据强度：每个需求取最强的依据——成品测试 100；否则取针对它的成分中证据最强的一个（按需求读取 evidence_by_target，A / B / C）。
 * 没有可评级的证据（只有品牌宣称、资料分类、尚无证据等级的成分，或没有依据）的需求按最低等级
 * （MISSING_EVIDENCE_LEVEL，C 级）计分，页面写"暂无证据，按最低等级计"。再按需求权重平均。
 */
function scoreEvidence(needMatches: NeedMatch[], usage: UsageType | null): Dimension {
  if (needMatches.length === 0) {
    return dimension('evidence', null, { zh: '你没有选择需求，此项不计分', en: 'No needs selected, so this is not scored' }, 'not_scored');
  }
  let total = 0;
  let sum = 0;
  const zh: string[] = [];
  const en: string[] = [];
  const missingZh: string[] = [];
  const missingEn: string[] = [];
  const low = EVIDENCE_SCORES[MISSING_EVIDENCE_LEVEL];
  for (const m of needMatches) {
    // 每个成分按这个需求的 targets 逐个读取证据等级（evidence_by_target），取最强的一个
    const best = m.ingredients
      .flatMap((i) => m.targets.filter((t) => ingredientTargets(i, t)).map((t) => ({ ing: i, ev: evidenceFor(i, t, usage) })))
      .filter((x): x is { ing: Ingredient; ev: TargetEvidence } => x.ev !== null)
      .sort((a, b) => EVIDENCE_SCORES[b.ev.level] - EVIDENCE_SCORES[a.ev.level])[0];
    let score: number;
    if (m.bases.includes('tested')) {
      score = TESTED_EVIDENCE_SCORE;
      zh.push(`${m.label.zh}有成品测试`);
      en.push(`product test for ${m.label.en}`);
    } else if (best) {
      score = EVIDENCE_SCORES[best.ev.level];
      const n = ingredientName(best.ing, best.ing.inciName);
      const down = best.ev.downgraded
        ? { zh: '（证据来自免洗产品，冲洗型降一级）', en: ' (evidence is from leave-on use, one level lower for rinse-off)' }
        : { zh: '', en: '' };
      if (!zh.includes(`${n.zh} ${best.ev.level} 级${down.zh}`)) {
        zh.push(`${n.zh} ${best.ev.level} 级${down.zh}`);
        en.push(`${n.en} level ${best.ev.level}${down.en}`);
      }
    } else {
      score = low;
      missingZh.push(m.label.zh);
      missingEn.push(m.label.en);
    }
    total += m.weight;
    sum += m.weight * score;
  }
  const missing = missingZh.length > 0
    ? {
      zh: `${missingZh.join('、')}暂无证据，按最低等级（${MISSING_EVIDENCE_LEVEL} 级，${low} 分）计`,
      en: `no evidence yet for ${missingEn.join(', ')}, counted at the lowest level (${MISSING_EVIDENCE_LEVEL}, ${low})`,
    }
    : null;
  const zhText = [zh.join('、'), missing?.zh].filter(Boolean).join('；');
  const enText = [en.join(', '), missing?.en].filter(Boolean).join('; ');
  return dimension('evidence', sum / total, {
    zh: zhText,
    en: enText.charAt(0).toUpperCase() + enText.slice(1),
  });
}

function scoreIrritation(
  verified: (Resolved & { ingredient: Ingredient })[],
  profile: ScoringProfile,
  product: Product,
  known: (Resolved & { ingredient: Ingredient })[],
): { dim: Dimension; detail: IrritationDetail } {
  // 使用方式未知时按免洗处理（不减半），偏保守
  const rinseOff = usageTypeOf(product) === 'rinse_off';
  const mult = (profile.sensitive ? SENSITIVE_MULTIPLIER : 1) * (rinseOff ? RINSE_OFF_MULTIPLIER : 1);
  let deduction = 0;
  const found: Text[] = [];
  const hitsOut: IrritantHit[] = [];

  // 强清洁力表活只在每天洗头且不常用造型产品时扣分；不扣分时也记下来，页面说明原因
  const cleanserCounts = profile.washFrequency === 'daily' && !profile.frequentStyling;
  for (const tag of [...IRRITANT_TAGS, 'strong_cleanser'] as RiskTag[]) {
    const hits = verified.filter((r) => r.ingredient.riskTags.includes(tag));
    const uniq = (list: (Resolved & { ingredient: Ingredient })[]) =>
      list.map((r) => r.ingredient).filter((ing, i, arr) => arr.indexOf(ing) === i);
    if (hits.length === 0) {
      // 成分库里有、但还没核对（正式模式下不参与打分）的风险成分：仍在页面列出，注明未计入温和度
      const draft = known.filter((r) => r.ingredient.riskTags.includes(tag));
      if (draft.length > 0) hitsOut.push({ tag, ingredients: uniq(draft), deduction: 0, counted: false, unverified: true });
      continue;
    }
    const ingredients = uniq(hits);
    if (tag === 'strong_cleanser' && !cleanserCounts) {
      hitsOut.push({ tag, ingredients, deduction: 0, counted: false, unverified: false });
      continue;
    }
    const d = (tag === 'strong_cleanser' ? STRONG_CLEANSER_DEDUCTION : IRRITANT_DEDUCTION) * mult;
    deduction += d;
    hitsOut.push({ tag, ingredients, deduction: d, counted: true, unverified: false });
    const names = joinNames(hits.map((r) => ingredientName(r.ingredient, r.raw)));
    const why = tag === 'strong_cleanser' ? { zh: '，你每天洗头', en: ', and you wash daily' } : { zh: '', en: '' };
    found.push({
      zh: `${RISK_TAG_LABELS[tag].zh}（${names.zh}${why.zh}）`,
      en: `${RISK_TAG_LABELS[tag].en} (${names.en}${why.en})`,
    });
  }

  const score = Math.max(0, 100 - deduction);
  const detail: IrritationDetail = { hits: hitsOut, rinseOff, sensitive: profile.sensitive };
  if (found.length === 0) {
    return {
      dim: dimension('irritation', score, {
        zh: '有数据的成分中没有常见刺激成分',
        en: 'No common irritants among ingredients with data',
      }),
      detail,
    };
  }
  const list = joinNames(found);
  const sens = profile.sensitive
    ? { zh: '；你的皮肤或头皮较敏感，扣分加倍', en: '; doubled because your skin or scalp is sensitive' }
    : { zh: '', en: '' };
  const rinse = rinseOff
    ? { zh: '；冲洗型产品停留时间短，扣分减半', en: '; halved because it is rinsed off' }
    : { zh: '', en: '' };
  return {
    dim: dimension('irritation', score, {
      zh: `含${list.zh}${sens.zh}${rinse.zh}`,
      en: `Contains ${list.en}${sens.en}${rinse.en}`,
    }),
    detail,
  };
}

function scoreEnvironment(verified: (Resolved & { ingredient: Ingredient })[], city: City | null, allowDraft: boolean): Dimension {
  // 只有水偏硬时才计分；未设城市、无数据、数据未核对、各区不同、水质不硬时不计分，其余维度权重重新归一化
  const skip = (reason: Text) => dimension('environment', null, reason, 'not_scored');
  const zhName = city ? city.cityZh || city.city : '';
  if (!city) return skip({ zh: '未设置城市，不计分', en: 'No city set; not scored' });
  if (city.reviewStatus !== 'verified' && !(allowDraft && city.waterHardness !== 'unknown')) {
    return skip({ zh: `${zhName}的水硬度数据未核对，不计分`, en: `Water hardness for ${city.city} is not verified yet; not scored` });
  }
  if (city.waterHardness === 'varies') {
    return skip({
      zh: `${zhName}不同供水分区或时期的水硬度不同，无法确定你家的水，不计分`,
      en: `Water hardness in ${city.city} differs by supply zone or period, so yours cannot be determined; not scored`,
    });
  }
  if (city.waterHardness === 'unknown') {
    return skip({ zh: `暂无${zhName}的水硬度数据，不计分`, en: `No water hardness data for ${city.city}; not scored` });
  }
  if (city.waterHardness !== 'hard' && city.waterHardness !== 'very_hard') {
    return skip({ zh: `${zhName}水质不硬，不计分`, en: `Water in ${city.city} is not hard; not scored` });
  }
  const chelators = verified.filter((r) => r.ingredient.chelator);
  if (chelators.length > 0) {
    const names = joinNames(chelators.map((r) => ingredientName(r.ingredient, r.raw)));
    return dimension('environment', ENVIRONMENT_SCORES.hardWithChelator, {
      zh: `${zhName}水偏硬，这款含螯合剂（${names.zh}）`,
      en: `Water in ${city.city} is hard; this contains chelating agents (${names.en})`,
    });
  }
  return dimension('environment', ENVIRONMENT_SCORES.hardWithoutChelator, {
    zh: `${zhName}水偏硬，这款不含已核对的螯合剂`,
    en: `Water in ${city.city} is hard; this has no verified chelating agent`,
  });
}

// ---------- 汇总 ----------

export function weightedTotal(dims: Record<DimensionKey, Dimension>): number | null {
  // 数据不足的维度不计入，其余权重重新归一化
  let wSum = 0;
  let sum = 0;
  for (const d of Object.values(dims)) {
    if (d.score === null) continue;
    wSum += d.weight;
    sum += d.weight * d.score;
  }
  return wSum === 0 ? null : Math.round(sum / wSum);
}

export function scoreProduct(product: Product, profile: ScoringProfile, data: ScoringData): ProductScore {
  const { index } = data;
  const items = resolve(product, index);
  const price = priceInfo(product, data.exchangeRates);
  const usable = (r: Resolved): r is Resolved & { ingredient: Ingredient } =>
    isVerified(r) || (!!data.allowDraft && !r.nameUnverified && r.ingredient !== null);
  const verified = items.filter(usable);
  const usesDraftData = verified.some((r) => !isVerified(r));
  const nameUnverifiedIngredients = items.filter((r) => r.nameUnverified).map((r) => r.raw);
  const unknownIngredients = items.filter((r) => !r.nameUnverified && !r.ingredient).map((r) => r.raw);
  const unverifiedIngredients = items.filter((r) => !r.nameUnverified && r.ingredient && !isVerified(r)).map((r) => r.raw);

  const caps = data.budgetCaps[product.category];
  const capUsd = capFor(profile.budget, caps, profile.customBudgetUsd ?? null);
  const exclusions = hardFilters(product, items, profile, index, price, capUsd);
  const conflicts = checkConflicts(items, profile, index);
  for (const c of conflicts.filter((c) => c.severity === 'severe')) {
    exclusions.push({ code: 'severe_conflict', unverified: c.unverified, text: c.text });
  }

  const notices: Flag[] = [];
  // 孕期被动提示：对所有人显示，不询问任何人
  const preg = withTag(items, 'pregnancy_caution');
  if (preg.hits.length > 0) {
    const suf = unverifiedSuffix(preg.unverified);
    notices.push({
      code: 'pregnancy_notice',
      unverified: preg.unverified,
      text: {
        zh: `含${preg.names.zh}，孕期或哺乳期请注意（谨慎提示，不代表确定有害）${suf.zh}。${cautionReasons(preg.hits).zh}`.trimEnd(),
        en: `Contains ${preg.names.en}; take care during pregnancy or breastfeeding (a precaution, not proof of harm)${suf.en}.${cautionReasons(preg.hits).en}`.trimEnd(),
      },
    });
  }
  // 测试模式下 draft 成分已参与打分，不算"暂无数据"
  const missing = unknownIngredients.length + nameUnverifiedIngredients.length + (data.allowDraft ? 0 : unverifiedIngredients.length);
  if (missing > 0) {
    notices.push({
      code: 'missing_data',
      unverified: false,
      text: { zh: `有 ${missing} 个成分暂无数据，未参与打分`, en: `${missing} ingredient(s) have no data yet and were not scored` },
    });
  }
  if (product.keyActives.length === 0 && product.keyActivesDisclosed && profile.concerns.length > 0) {
    notices.push({
      code: 'key_actives_missing',
      unverified: false,
      text: {
        zh: '产品还没有填写主打有效成分，需求匹配暂按成分表中的有效成分满分计算',
        en: 'Key actives not filled in yet; needs are matched using all listed active ingredients at full credit',
      },
    });
  }
  if (usesDraftData) {
    notices.push({
      code: 'test_data',
      unverified: true,
      text: { zh: '测试数据，尚未核对：打分用到了未经人工核对的成分数据', en: 'Test data, not yet verified: scoring used ingredient data that has not been reviewed' },
    });
  }
  const budgetLimited = profile.budget === 'custom' ? capUsd !== null : profile.budget !== 'none';
  if (budgetLimited && price.status !== 'ok') {
    // 价格未知或无法换算的产品不参与预算价格上限计算，也只在"不限"档出现
    const why = price.status === 'no_price'
      ? { zh: '价格未知', en: 'Price unknown' }
      : { zh: `汇率表中没有 ${product.currency}`, en: `No exchange rate for ${product.currency}` };
    exclusions.push({
      code: 'price_unknown',
      unverified: false,
      text: { zh: `${why.zh}，只在预算选"不限"时显示`, en: `${why.en}; shown only when budget is "No limit"` },
    });
  } else if (budgetLimited && profile.budget !== 'custom' && !caps) {
    notices.push({
      code: 'budget_unchecked',
      unverified: false,
      text: { zh: '该品类有价格的产品太少，还没有预算价格上限，未做预算筛选', en: 'Too few priced products in this category to set budget limits; budget not checked' },
    });
  }

  const specs = needSpecs(profile);
  const noData: Text = { zh: '没有可用的成分数据，无法评分', en: 'No usable ingredient data, cannot score' };
  let dimensions: Record<DimensionKey, Dimension>;
  let needMatches: NeedMatch[] = [];
  let irritation: IrritationDetail = { hits: [], rinseOff: usageTypeOf(product) === 'rinse_off', sensitive: profile.sensitive };
  if (verified.length === 0) {
    dimensions = {
      need: dimension('need', null, noData),
      irritation: dimension('irritation', null, noData),
      evidence: dimension('evidence', null, noData),
      environment: dimension('environment', null, noData),
    };
  } else {
    const need = scoreNeed(product, verified, specs, productKeyActiveTerms(product));
    needMatches = need.needMatches;
    const evidence = scoreEvidence(needMatches, usageTypeOf(product));
    const irr = scoreIrritation(verified, profile, product, items.filter((r): r is Resolved & { ingredient: Ingredient } => !r.nameUnverified && r.ingredient !== null));
    irritation = irr.detail;
    dimensions = {
      need: need.dim,
      irritation: irr.dim,
      evidence,
      environment: scoreEnvironment(verified, profile.city, !!data.allowDraft),
    };
  }

  const score = weightedTotal(dimensions);
  const noNeeds = profile.concerns.length === 0;
  // 一项需求都没有满足（只有"部分"或"无依据"）时，适合等级最高为"一般"
  const anyMet = needMatches.some((m) => m.credit >= 1);
  const rawLevel = noNeeds ? null : levelOf(score);
  const fitCapped = !noNeeds && !anyMet && (rawLevel === 'high' || rawLevel === 'medium');

  return {
    product,
    excluded: exclusions.length > 0,
    exclusions,
    score,
    fitLevel: fitCapped ? 'low' : rawLevel,
    fitCapped,
    noNeeds,
    lowMatch: !noNeeds && dimensions.need.score === 0,
    dimensions,
    notices,
    conflicts,
    unknownIngredients,
    nameUnverifiedIngredients,
    unverifiedIngredients,
    usesDraftData,
    needMatches,
    irritation,
    fragrance: fragranceInfo(product, index),
    price: { amount: product.price, currency: product.currency, usd: price.usd },
    transparency: product.transparency,
  };
}

/**
 * 对某品类的所有产品打分并排序。分组：可推荐 → 不太匹配（选了需求但需求匹配为 0）→ 无法评分 → 被排除。
 * 组内：
 * - 选了需求：适合等级（高 → 中 → 低）→ 香味层级（只在"无香优先"时）→ 综合分。
 * - 没有选需求：温和程度（刺激风险分）从高到低 → 价格从低到高。
 */
export function rankProducts(
  products: Product[],
  category: string,
  profile: ScoringProfile,
  data: ScoringData,
): ProductScore[] {
  const group = (s: ProductScore) => (s.excluded ? 3 : s.score === null ? 2 : s.lowMatch ? 1 : 0);
  const LEVEL_ORDER = { high: 0, medium: 1, low: 2 } as const;
  const level = (s: ProductScore) => (s.fitLevel ? LEVEL_ORDER[s.fitLevel] : 3);
  const tier = (s: ProductScore) => (profile.fragrancePref === 'free_first' && !s.excluded ? fragranceTier(s.fragrance) : 0);
  const gentle = (s: ProductScore) => s.dimensions.irritation.score ?? -1;
  const price = (s: ProductScore) => s.price.usd ?? Infinity;
  const noNeeds = profile.concerns.length === 0;
  return products
    .filter((p) => p.category === category)
    .map((p) => scoreProduct(p, profile, data))
    .sort((a, b) =>
      group(a) - group(b)
      || (noNeeds
        ? gentle(b) - gentle(a) || price(a) - price(b)
        : level(a) - level(b) || tier(a) - tier(b) || (b.score ?? 0) - (a.score ?? 0))
      || a.product.productId.localeCompare(b.product.productId));
}
