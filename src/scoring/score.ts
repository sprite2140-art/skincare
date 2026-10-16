// 打分逻辑：固定规则，不调用 AI。规则说明见 docs/SCORING.md。
//
// 两条数据原则：
// - 打分（四个维度）只用已核对的成分：review_status = verified，或基础成分（category = base，不需要人工核对）。
//   产品成分表里带 [待核对] 标记的成分（名称未核对）不参与打分。
//   测试模式（ScoringData.allowDraft）下，draft 的有效成分和风险成分也参与打分，结果标注"测试数据，尚未核对"。
// - 安全相关（硬性过滤、孕期提示、搭配冲突）也看 draft 成分和名称未核对的成分，宁可多提示，结果里标注"未核对"。

import { usageTypeOf } from '../data/types';
import type { City, ExchangeRate, Ingredient, Product, RiskTag, Target } from '../data/types';
import { normalizeName, type IngredientIndex } from '../data/ingredientIndex';
import {
  CHELATING_FUNCTION, ENVIRONMENT_SCORES, EVIDENCE_SCORES, IRRITANT_DEDUCTION, IRRITANT_TAGS,
  LEVEL_THRESHOLDS, NON_KEY_ACTIVE_CREDIT, RANKED_CONCERN_WEIGHTS, RINSE_OFF_MULTIPLIER, SENSITIVE_MULTIPLIER,
  STRONG_CLEANSER_DEDUCTION, WEIGHTS, type DimensionKey,
} from './config';
import { RISK_TAG_LABELS, TARGET_LABELS, ingredientName, joinNames, type Text } from './labels';
import { priceInfo, withinBudget, type PriceInfo } from './price';
import { capFor, type BudgetCapsByCategory, type BudgetChoice } from './budget';

/** 打分用到的数据 */
export interface ScoringData {
  index: IngredientIndex;
  exchangeRates: ExchangeRate[];
  /** 各品类预算档位界线，由 computeBudgetCaps() 从产品库计算 */
  budgetCaps: BudgetCapsByCategory;
  /** 测试模式：允许 draft 成分参与打分。正式上线前必须关闭，见 config.ts 的 TEST_MODE_DRAFT_SCORING */
  allowDraft?: boolean;
}

export type SpecialStatus = 'none' | 'pregnant' | 'trying' | 'breastfeeding' | 'rx';
export type WashFrequency = 'daily' | 'every_other_day' | 'twice_weekly_or_less';

export interface ScoringProfile {
  /** 用户的困扰，已映射到 targets 取值 */
  concerns: Target[];
  /** true：按重要程度排序（面部）；false：多选不排序（头皮、头发），平均加权 */
  concernsRanked: boolean;
  /** 敏感肌或头皮易痒 */
  sensitive: boolean;
  specialStatus: SpecialStatus;
  /** 想避开的具体成分（INCI 名或别名） */
  avoidIngredients: string[];
  /** 想避开的成分类型，如 fragrance */
  avoidTags: RiskTag[];
  /** 该品类的预算档位：第一档 / 第二档 / 不限 */
  budget: BudgetChoice;
  washFrequency: WashFrequency | null;
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

export interface ProductScore {
  product: Product;
  excluded: boolean;
  exclusions: Flag[];
  /** 综合适配分 0–100；null 表示没有可用的已核对数据 */
  score: number | null;
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

function dimension(key: DimensionKey, score: number | null, reason: Text): Dimension {
  const rounded = score === null ? null : Math.round(score);
  return { score: rounded, level: levelOf(rounded), weight: WEIGHTS[key], reason };
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

export function concernWeights(concerns: Target[], ranked: boolean): Map<Target, number> {
  const weights = new Map<Target, number>();
  concerns.forEach((c, i) => {
    if (weights.has(c)) return;
    const w = ranked
      ? RANKED_CONCERN_WEIGHTS[Math.min(i, RANKED_CONCERN_WEIGHTS.length - 1)]
      : 1;
    weights.set(c, w);
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
};

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

  // 特殊状态
  const statusTag: RiskTag | null = PREGNANCY_STATUSES.includes(profile.specialStatus)
    ? 'pregnancy_caution'
    : profile.specialStatus === 'rx' ? 'rx_caution' : null;
  if (statusTag) {
    const { hits, names, unverified } = withTag(items, statusTag);
    if (hits.length > 0) {
      const s = STATUS_LABELS[profile.specialStatus];
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

  // 单件预算上限：换算成 USD 比较
  if (price.status === 'ok' && capUsd !== null && !withinBudget(price.usd, capUsd)) {
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

function conflictSeverity(a: Ingredient, b: Ingredient): 'mild' | 'severe' | null {
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

/**
 * 需求匹配。keyActives 为产品主打有效成分的规范化名称集合：
 * 主打成分覆盖的困扰按满分计，只有非主打成分覆盖的按 NON_KEY_ACTIVE_CREDIT 计。
 * keyActives 为 null（产品还没填写主打成分）时，所有有效成分都按满分计。
 */
function scoreNeed(
  verified: (Resolved & { ingredient: Ingredient })[],
  weights: Map<Target, number>,
  keyActives: Set<string> | null,
) {
  const isKey = (i: Ingredient) => keyActives === null || keyActives.has(normalizeName(i.inciName));
  const matches = new Map<Target, Ingredient[]>();
  for (const [target] of weights) {
    matches.set(
      target,
      verified.filter((r) => r.ingredient.category === 'active' && r.ingredient.targets.includes(target)).map((r) => r.ingredient),
    );
  }

  if (weights.size === 0) {
    return {
      matches,
      dim: dimension('need', null, { zh: '你没有选择困扰，此项不计分', en: 'No concerns selected, so this is not scored' }),
    };
  }

  let total = 0;
  let covered = 0;
  const zh: string[] = [];
  const en: string[] = [];
  for (const [target, w] of weights) {
    total += w;
    const label = TARGET_LABELS[target];
    const hit = matches.get(target)!;
    if (hit.length > 0) {
      const hasKey = hit.some(isKey);
      covered += w * (hasKey ? 1 : NON_KEY_ACTIVE_CREDIT);
      const pct = Math.round(NON_KEY_ACTIVE_CREDIT * 100);
      const label2 = (i: Ingredient): Text => {
        const n = ingredientName(i, i.inciName);
        if (keyActives === null) return n;
        return isKey(i)
          ? { zh: `${n.zh}（主打）`, en: `${n.en} (key active)` }
          : { zh: `${n.zh}（非主打，按 ${pct}% 计）`, en: `${n.en} (not a key active, counted at ${pct}%)` };
      };
      const names = joinNames(hit.map(label2));
      zh.push(`针对${label.zh}：含${names.zh}`);
      en.push(`for ${label.en}: contains ${names.en}`);
    } else {
      zh.push(`针对${label.zh}：未找到有数据的有效成分`);
      en.push(`for ${label.en}: no active ingredient with data found`);
    }
  }
  const enText = en.join('; ');
  return {
    matches,
    dim: dimension('need', (covered / total) * 100, {
      zh: zh.join('；'),
      en: enText.charAt(0).toUpperCase() + enText.slice(1),
    }),
  };
}

function scoreEvidence(matches: Map<Target, Ingredient[]>, weights: Map<Target, number>): Dimension {
  let total = 0;
  let sum = 0;
  const parts: { name: Text; level: string }[] = [];
  for (const [target, w] of weights) {
    // 每个困扰取针对它的成分中证据最强的一个，再按困扰权重平均
    const best = (matches.get(target) ?? [])
      .filter((i) => i.evidenceLevel !== null)
      .sort((a, b) => EVIDENCE_SCORES[b.evidenceLevel!] - EVIDENCE_SCORES[a.evidenceLevel!])[0];
    if (!best) continue;
    total += w;
    sum += w * EVIDENCE_SCORES[best.evidenceLevel!];
    if (!parts.some((p) => p.name.en === best.inciName)) {
      parts.push({ name: ingredientName(best, best.inciName), level: best.evidenceLevel! });
    }
  }
  if (total === 0) {
    return dimension('evidence', null, {
      zh: '没有针对你困扰的有数据成分，无法评估证据强度',
      en: 'No ingredient with data targets your concerns, so evidence cannot be rated',
    });
  }
  return dimension('evidence', sum / total, {
    zh: '证据等级：' + parts.map((p) => `${p.name.zh} ${p.level} 级`).join('、'),
    en: 'Evidence: ' + parts.map((p) => `${p.name.en} level ${p.level}`).join(', '),
  });
}

function scoreIrritation(
  verified: (Resolved & { ingredient: Ingredient })[],
  profile: ScoringProfile,
  product: Product,
): Dimension {
  // 使用方式未知时按免洗处理（不减半），偏保守
  const rinseOff = usageTypeOf(product) === 'rinse_off';
  const mult = (profile.sensitive ? SENSITIVE_MULTIPLIER : 1) * (rinseOff ? RINSE_OFF_MULTIPLIER : 1);
  let deduction = 0;
  const found: Text[] = [];

  const tags: RiskTag[] = [...IRRITANT_TAGS];
  if (profile.washFrequency === 'daily') tags.push('strong_cleanser');
  for (const tag of tags) {
    const hits = verified.filter((r) => r.ingredient.riskTags.includes(tag));
    if (hits.length === 0) continue;
    deduction += (tag === 'strong_cleanser' ? STRONG_CLEANSER_DEDUCTION : IRRITANT_DEDUCTION) * mult;
    const names = joinNames(hits.map((r) => ingredientName(r.ingredient, r.raw)));
    const why = tag === 'strong_cleanser' ? { zh: '，你每天洗头', en: ', and you wash daily' } : { zh: '', en: '' };
    found.push({
      zh: `${RISK_TAG_LABELS[tag].zh}（${names.zh}${why.zh}）`,
      en: `${RISK_TAG_LABELS[tag].en} (${names.en}${why.en})`,
    });
  }

  const score = Math.max(0, 100 - deduction);
  if (found.length === 0) {
    return dimension('irritation', score, {
      zh: '有数据的成分中没有常见刺激成分',
      en: 'No common irritants among ingredients with data',
    });
  }
  const list = joinNames(found);
  const sens = profile.sensitive
    ? { zh: '；你的皮肤或头皮较敏感，扣分加倍', en: '; doubled because your skin or scalp is sensitive' }
    : { zh: '', en: '' };
  const rinse = rinseOff
    ? { zh: '；冲洗型产品停留时间短，扣分减半', en: '; halved because it is rinsed off' }
    : { zh: '', en: '' };
  return dimension('irritation', score, {
    zh: `含${list.zh}${sens.zh}${rinse.zh}`,
    en: `Contains ${list.en}${sens.en}${rinse.en}`,
  });
}

function scoreEnvironment(verified: (Resolved & { ingredient: Ingredient })[], city: City | null): Dimension {
  const neutral = (reason: Text) => dimension('environment', ENVIRONMENT_SCORES.neutral, reason);
  if (!city) return neutral({ zh: '未设置城市，按中性计分', en: 'No city set, scored as neutral' });
  if (city.reviewStatus !== 'verified') {
    return neutral({ zh: `${city.city}的水硬度数据未核对，按中性计分`, en: `Water hardness for ${city.city} is not verified yet, scored as neutral` });
  }
  if (city.waterHardness === 'unknown') {
    return neutral({ zh: `暂无${city.city}的水硬度数据，按中性计分`, en: `No water hardness data for ${city.city}, scored as neutral` });
  }
  if (city.waterHardness !== 'hard') {
    return neutral({ zh: `${city.city}水质不硬，无需特别考虑`, en: `Water in ${city.city} is not hard, no special needs` });
  }
  const chelators = verified.filter((r) => r.ingredient.functions.includes(CHELATING_FUNCTION));
  if (chelators.length > 0) {
    const names = joinNames(chelators.map((r) => ingredientName(r.ingredient, r.raw)));
    return dimension('environment', ENVIRONMENT_SCORES.hardWithChelator, {
      zh: `${city.city}水偏硬，这款含螯合剂（${names.zh}）`,
      en: `Water in ${city.city} is hard; this contains chelating agents (${names.en})`,
    });
  }
  return dimension('environment', ENVIRONMENT_SCORES.hardWithoutChelator, {
    zh: `${city.city}水偏硬，这款不含已核对的螯合剂`,
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

/** 产品主打有效成分的规范化名称（按成分库主名统一别名）；没填写时为 null */
function keyActiveSet(product: Product, index: IngredientIndex): Set<string> | null {
  if (product.keyActives.length === 0) return null;
  return new Set(product.keyActives.map((n) => normalizeName(index.get(n)?.inciName ?? n)));
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
  const capUsd = capFor(profile.budget, caps);
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
  if (product.keyActives.length === 0 && profile.concerns.length > 0) {
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
  if (profile.budget !== 'none' && price.status !== 'ok') {
    // 价格未知或无法换算的产品不参与预算档位计算，也只在"不限"档出现
    const why = price.status === 'no_price'
      ? { zh: '价格未知', en: 'Price unknown' }
      : { zh: `汇率表中没有 ${product.currency}`, en: `No exchange rate for ${product.currency}` };
    exclusions.push({
      code: 'price_unknown',
      unverified: false,
      text: { zh: `${why.zh}，只在预算选"不限"时显示`, en: `${why.en}; shown only when budget is "No limit"` },
    });
  } else if (profile.budget !== 'none' && !caps) {
    notices.push({
      code: 'budget_unchecked',
      unverified: false,
      text: { zh: '该品类有价格的产品太少，还没有预算档位，未做预算筛选', en: 'Too few priced products in this category to set budget ranges; budget not checked' },
    });
  }

  const weights = concernWeights(profile.concerns, profile.concernsRanked);
  const noData: Text = { zh: '没有可用的成分数据，无法评分', en: 'No usable ingredient data, cannot score' };
  let dimensions: Record<DimensionKey, Dimension>;
  if (verified.length === 0) {
    dimensions = {
      need: dimension('need', null, noData),
      irritation: dimension('irritation', null, noData),
      evidence: dimension('evidence', null, noData),
      environment: dimension('environment', null, noData),
    };
  } else {
    const need = scoreNeed(verified, weights, keyActiveSet(product, index));
    dimensions = {
      need: need.dim,
      irritation: scoreIrritation(verified, profile, product),
      evidence: scoreEvidence(need.matches, weights),
      environment: scoreEnvironment(verified, profile.city),
    };
  }

  return {
    product,
    excluded: exclusions.length > 0,
    exclusions,
    score: weightedTotal(dimensions),
    dimensions,
    notices,
    conflicts,
    unknownIngredients,
    nameUnverifiedIngredients,
    unverifiedIngredients,
    usesDraftData,
    price: { amount: product.price, currency: product.currency, usd: price.usd },
    transparency: product.transparency,
  };
}

/** 对某品类的所有产品打分并排序：可推荐的按分数从高到低，无法评分的其次，被排除的最后 */
export function rankProducts(
  products: Product[],
  category: string,
  profile: ScoringProfile,
  data: ScoringData,
): ProductScore[] {
  const rank = (s: ProductScore) => (s.excluded ? 2 : s.score === null ? 1 : 0);
  return products
    .filter((p) => p.category === category)
    .map((p) => scoreProduct(p, profile, data))
    .sort((a, b) => rank(a) - rank(b) || (b.score ?? 0) - (a.score ?? 0) || a.product.productId.localeCompare(b.product.productId));
}
