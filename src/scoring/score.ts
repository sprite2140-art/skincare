// 打分逻辑：固定规则，不调用 AI。规则说明见 docs/SCORING.md。
//
// 两条数据原则：
// - 打分（四个维度）只用 review_status = verified 的成分。
// - 安全相关（硬性过滤、孕期提示、搭配冲突）也看 draft 成分，宁可多提示，结果里标注"未核对"。

import { usageTypeOf } from '../data/types';
import type { City, ExchangeRate, Ingredient, Product, RiskTag, Target } from '../data/types';
import { normalizeName, type IngredientIndex } from '../data/ingredientIndex';
import {
  CHELATING_FUNCTION, ENVIRONMENT_SCORES, EVIDENCE_SCORES, IRRITANT_DEDUCTION, IRRITANT_TAGS,
  LEVEL_THRESHOLDS, RANKED_CONCERN_WEIGHTS, RINSE_OFF_MULTIPLIER, SENSITIVE_MULTIPLIER,
  STRONG_CLEANSER_DEDUCTION, WEIGHTS, type BudgetCapUsd, type DimensionKey,
} from './config';
import { RISK_TAG_LABELS, TARGET_LABELS, ingredientName, joinNames, type Text } from './labels';
import { priceInfo, withinBudget, type PriceInfo } from './price';

/** 打分用到的数据 */
export interface ScoringData {
  index: IngredientIndex;
  exchangeRates: ExchangeRate[];
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
  /** 单件预算上限（USD），null 为不限 */
  budgetUsd: BudgetCapUsd;
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
  /** 在成分库但未核对的成分 */
  unverifiedIngredients: string[];
  /** 展示用当地价格；usd 用于预算比较 */
  price: { amount: number | null; currency: string; usd: number | null };
  transparency: Product['transparency'];
}

interface Resolved {
  raw: string;
  position: number;
  ingredient: Ingredient | null;
}

const isVerified = (r: Resolved): r is Resolved & { ingredient: Ingredient } =>
  r.ingredient?.reviewStatus === 'verified';
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
  return product.inciList.map((raw, i) => ({ raw, position: i + 1, ingredient: index.get(raw) ?? null }));
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
    unverified: hits.some((r) => r.ingredient.reviewStatus !== 'verified'),
  };
}

const unverifiedSuffix = (unverified: boolean): Text =>
  unverified ? { zh: '（成分数据未核对）', en: ' (ingredient data not yet verified)' } : { zh: '', en: '' };

function hardFilters(
  product: Product, items: Resolved[], profile: ScoringProfile, index: IngredientIndex, price: PriceInfo,
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
      out.push({
        code: 'special_status',
        unverified,
        text: {
          zh: `含${names.zh}，${s.zh}期间不建议使用${suf.zh}`,
          en: `Contains ${names.en}, not recommended during ${s.en}${suf.en}`,
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
  if (price.status === 'ok' && !withinBudget(price.usd, profile.budgetUsd)) {
    const local = `${product.price} ${product.currency}`;
    const usd = product.currency === 'USD' ? '' : `（约 ${price.usd.toFixed(2)} USD）`;
    const usdEn = product.currency === 'USD' ? '' : ` (about ${price.usd.toFixed(2)} USD)`;
    out.push({
      code: 'over_budget',
      unverified: false,
      text: {
        zh: `价格 ${local}${usd}，超出你的单件预算上限（${profile.budgetUsd} USD）`,
        en: `Price ${local}${usdEn} is over your per-item budget (${profile.budgetUsd} USD)`,
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
        const unverified = a.ingredient.reviewStatus !== 'verified' || b.ingredient.reviewStatus !== 'verified';
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

function scoreNeed(verified: (Resolved & { ingredient: Ingredient })[], weights: Map<Target, number>) {
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
      covered += w;
      const names = joinNames(hit.map((i) => ingredientName(i, i.inciName)));
      zh.push(`针对${label.zh}：含${names.zh}`);
      en.push(`for ${label.en}: contains ${names.en}`);
    } else {
      zh.push(`针对${label.zh}：未找到已核对的有效成分`);
      en.push(`for ${label.en}: no verified active ingredient found`);
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
      zh: '没有针对你困扰的已核对成分，无法评估证据强度',
      en: 'No verified ingredient targets your concerns, so evidence cannot be rated',
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
      zh: '已核对成分中没有常见刺激成分',
      en: 'No common irritants among verified ingredients',
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

export function scoreProduct(product: Product, profile: ScoringProfile, data: ScoringData): ProductScore {
  const { index } = data;
  const items = resolve(product, index);
  const price = priceInfo(product, data.exchangeRates);
  const verified = items.filter(isVerified);
  const unknownIngredients = items.filter((r) => !r.ingredient).map((r) => r.raw);
  const unverifiedIngredients = items.filter((r) => r.ingredient && !isVerified(r)).map((r) => r.raw);

  const exclusions = hardFilters(product, items, profile, index, price);
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
      text: { zh: `含${preg.names.zh}，孕期或哺乳期请注意${suf.zh}`, en: `Contains ${preg.names.en}; take care during pregnancy or breastfeeding${suf.en}` },
    });
  }
  const missing = unknownIngredients.length + unverifiedIngredients.length;
  if (missing > 0) {
    notices.push({
      code: 'missing_data',
      unverified: false,
      text: { zh: `有 ${missing} 个成分暂无数据，未参与打分`, en: `${missing} ingredient(s) have no data yet and were not scored` },
    });
  }
  if (profile.budgetUsd !== null && price.status !== 'ok') {
    const why: Record<Exclude<PriceInfo['status'], 'ok'>, Text> = {
      no_price: { zh: '价格未知', en: 'Price unknown' },
      no_rate: { zh: `汇率表中没有 ${product.currency}`, en: `No exchange rate for ${product.currency}` },
    };
    const w = why[price.status];
    notices.push({
      code: 'budget_unchecked',
      unverified: false,
      text: { zh: `${w.zh}，未做预算筛选`, en: `${w.en}; budget not checked` },
    });
  }

  const weights = concernWeights(profile.concerns, profile.concernsRanked);
  const noData: Text = { zh: '没有已核对的成分数据，无法评分', en: 'No verified ingredient data, cannot score' };
  let dimensions: Record<DimensionKey, Dimension>;
  if (verified.length === 0) {
    dimensions = {
      need: dimension('need', null, noData),
      irritation: dimension('irritation', null, noData),
      evidence: dimension('evidence', null, noData),
      environment: dimension('environment', null, noData),
    };
  } else {
    const need = scoreNeed(verified, weights);
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
    unverifiedIngredients,
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
