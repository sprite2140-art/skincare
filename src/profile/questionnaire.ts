// 问卷答案 → 打分输入。问卷题目见 docs/QUIZ.md。

import type { Category, City, ExchangeRate, Product, RiskTag, Target } from '../data/types';
import type { BudgetChoice } from '../scoring/budget';
import { SHAMPOO_SCALP_WEIGHT } from '../scoring/config';
import type { Text } from '../scoring/labels';
import { toUsd } from '../scoring/price';
import type { FragrancePref, ScoringProfile, SpecialStatus, WashFrequency } from '../scoring/score';

export type AvoidOption = 'fragrance' | 'alcohol' | 'essential_oil';

/** 购买范围：洗发水 / 护发素 / 洗护搭配 / 帮我判断 */
export type PurchaseScope = 'shampoo' | 'conditioner' | 'set' | 'help';

/** 自填金额（用户所在地货币） */
export interface Money {
  amount: number;
  currency: string;
}

/** 预算按单品还是按整套 */
export type BudgetMode = 'item' | 'set';

export interface BaseAnswers {
  cityKey: string | null; // "城市, 国家"，对应 cities.csv
  scope: PurchaseScope | null;
  budgetMode: BudgetMode;
  /** 各品类的预算档位，未选的品类视为不限 */
  budgets: Partial<Record<Category, BudgetChoice>>;
  /** 档位为 custom 时的自填上限 */
  customBudgets: Partial<Record<Category, Money>>;
  /** 按整套时的总预算；null 表示不限 */
  setBudget: Money | null;
  specialStatus: SpecialStatus;
  avoid: AvoidOption[];
  avoidIngredients: string[];
}

// ---------- 头皮 ----------

export type ScalpOilTiming = 'same_day' | 'one_two_days' | 'three_plus_days';
export type ScalpConcern = 'dandruff' | 'itch' | 'redness' | 'dry_tight' | 'hair_loss';
/** 头皮屑是什么样的？（选了头皮屑才问） */
export type DandruffType = 'dry_fine' | 'oily_large' | 'red_recurring';
/** 掉发情况？（选了掉发才问） */
export type HairLossLevel = 'same_as_before' | 'more_than_before' | 'sudden_or_patchy';

export interface ScalpAnswers {
  oilTiming: ScalpOilTiming | null;
  concerns: ScalpConcern[];
  /** 选了"没有明显困扰" */
  noConcerns?: boolean;
  dandruffType?: DandruffType | null;
  /** 过去一周最痒时的程度，0–10（选了痒才问） */
  itchScore?: number | null;
  hairLossLevel?: HairLossLevel | null;
  washFrequency: WashFrequency | null;
}

/** 瘙痒 4 分及以上视为敏感头皮，7 分及以上建议就医 */
export const ITCH_SENSITIVE_MIN = 4;
export const ITCH_MEDICAL_MIN = 7;

/** 头皮困扰是多选不排序 */
const SCALP_CONCERN_TARGETS: Record<ScalpConcern, Target> = {
  dandruff: 'dandruff',
  itch: 'scalp_itch',
  redness: 'scalp_redness',
  dry_tight: 'dry_scalp',
  hair_loss: 'hair_loss',
};

export function isSensitiveScalp(a: ScalpAnswers): boolean {
  // 选了痒但没填分数时按敏感处理，偏保守
  return a.concerns.includes('itch') && (a.itchScore == null || a.itchScore >= ITCH_SENSITIVE_MIN);
}

export function scalpTargets(a: ScalpAnswers): Target[] {
  const targets: Target[] = [];
  for (const c of a.concerns) {
    const t = SCALP_CONCERN_TARGETS[c];
    if (!targets.includes(t)) targets.push(t);
  }
  if (a.oilTiming === 'same_day') targets.push('scalp_oil');
  if (isSensitiveScalp(a)) targets.push('sensitive_scalp');
  return targets;
}

// ---------- 头发 ----------

export type HairThickness = 'fine' | 'medium' | 'coarse';
export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily';
export type HairCondition = 'dry' | 'tangling' | 'colored' | 'permed_bleached' | 'breakage' | 'heat';
/** 期望效果，最多选 3 项 */
export type HairGoal = 'smooth' | 'moisture' | 'less_frizz' | 'clean' | 'volume' | 'shine' | 'curl' | 'scent';
export const MAX_GOALS = 3;
/** 是否已有满意的护发素 */
export type ConditionerStatus = 'satisfied' | 'not_satisfied' | 'none';
/** 希望简单护理，还是接受额外步骤 */
export type CarePref = 'simple' | 'extra';

export interface HairAnswers {
  thickness: HairThickness | null;
  texture: HairTexture | null;
  conditions: HairCondition[];
  goals: HairGoal[];
  fragrancePref: FragrancePref | null;
  hasConditioner: ConditionerStatus | null;
  carePref: CarePref | null;
}

export const EMPTY_HAIR: HairAnswers = {
  thickness: null, texture: null, conditions: [], goals: [], fragrancePref: null, hasConditioner: null, carePref: null,
};

const CONDITION_TARGETS: Record<HairCondition, Target[]> = {
  dry: ['dryness'],
  tangling: ['tangling'],
  colored: ['color_fade', 'damage'],
  permed_bleached: ['damage'],
  breakage: ['damage'],
  heat: ['damage'],
};

/** "香味好闻"没有对应的困扰：不按成分推断气味和留香，只在理由中说明是否含香精 */
const GOAL_TARGETS: Record<HairGoal, Target[]> = {
  smooth: ['frizz', 'tangling'],
  moisture: ['dryness'],
  less_frizz: ['frizz'],
  clean: ['clarifying'],
  volume: ['flat_hair'],
  shine: ['shine'],
  curl: ['curl_definition'],
  scent: [],
};

export function hairTargets(a: HairAnswers): Target[] {
  const targets: Target[] = [];
  const add = (t: Target) => {
    if (!targets.includes(t)) targets.push(t);
  };
  for (const c of a.conditions) CONDITION_TARGETS[c].forEach(add);
  for (const g of a.goals.slice(0, MAX_GOALS)) GOAL_TARGETS[g].forEach(add);
  return targets;
}

// ---------- 就医提示 ----------

export interface MedicalAlert {
  code: string;
  text: Text;
}

/** 问卷中标"就医提示"的选项被选中时，结果页顶部建议看皮肤科医生 */
export function scalpMedicalAlerts(a: ScalpAnswers): MedicalAlert[] {
  const alerts: MedicalAlert[] = [];
  if (a.concerns.includes('dandruff') && a.dandruffType === 'red_recurring') {
    alerts.push({
      code: 'dandruff_red_recurring',
      text: {
        zh: '头皮屑伴红斑、反复不好，可能是脂溢性皮炎等需要治疗的情况，建议先看皮肤科医生。',
        en: 'Dandruff with redness that keeps coming back may be seborrheic dermatitis or another condition that needs treatment. Consider seeing a dermatologist.',
      },
    });
  }
  if (a.concerns.includes('itch') && a.itchScore != null && a.itchScore >= ITCH_MEDICAL_MIN) {
    alerts.push({
      code: 'itch_severe',
      text: {
        zh: '头皮瘙痒程度较重（7 分及以上），持续剧烈瘙痒需要查明原因，建议看皮肤科医生。',
        en: 'Your scalp itch is severe (7 or higher). Persistent intense itch needs a diagnosis; consider seeing a dermatologist.',
      },
    });
  }
  if (a.concerns.includes('hair_loss') && a.hairLossLevel === 'sudden_or_patchy') {
    alerts.push({
      code: 'hair_loss_sudden',
      text: {
        zh: '短期大量或成片脱发，建议尽快看皮肤科医生，洗发产品无法解决。',
        en: 'Sudden heavy or patchy hair loss should be checked by a dermatologist; shampoo cannot fix it.',
      },
    });
  }
  return alerts;
}

// ---------- "帮我判断" ----------

export interface CareAdvice {
  /** 建议购买的品类 */
  categories: Category[];
  /** 接受额外步骤且受损时，建议加发膜（数据整理中） */
  suggestMask: boolean;
  reasons: Text[];
}

/** 根据发丝状态、期望效果、已有产品和护理意愿给出搭配建议，用户可以在结果页修改 */
export function adviseCare(hair: HairAnswers): CareAdvice {
  const reasons: Text[] = [];
  const damaged = hair.conditions.some((c) => c === 'colored' || c === 'permed_bleached' || c === 'breakage' || c === 'heat');
  const needsConditioning =
    damaged ||
    hair.conditions.includes('dry') ||
    hair.conditions.includes('tangling') ||
    hair.texture === 'curly' || hair.texture === 'coily' ||
    hair.thickness === 'coarse' ||
    hair.goals.some((g) => g === 'smooth' || g === 'moisture' || g === 'less_frizz' || g === 'shine' || g === 'curl');

  if (hair.hasConditioner === 'satisfied') {
    reasons.push({ zh: '你已有满意的护发素，先只换洗发水。', en: 'You already have a conditioner you like, so just change the shampoo.' });
    return { categories: ['shampoo'], suggestMask: false, reasons };
  }
  if (!needsConditioning) {
    if (hair.thickness === 'fine' || hair.goals.includes('volume')) {
      reasons.push({
        zh: '头发偏细或想要蓬松，没有干涩、打结等问题，可以只用洗发水；需要时选轻盈型护发素，只涂发尾。',
        en: 'Fine hair or a volume goal without dryness or tangling: shampoo alone is fine; if needed, use a lightweight conditioner on the ends only.',
      });
    } else {
      reasons.push({ zh: '没有干涩、打结或受损问题，只用洗发水即可。', en: 'No dryness, tangling or damage, so shampoo alone is enough.' });
    }
    return { categories: ['shampoo'], suggestMask: false, reasons };
  }
  reasons.push({
    zh: '你的头发有干涩、打结、受损或卷发等情况，或想要柔顺、滋润，建议洗发水搭配护发素。',
    en: 'Your hair is dry, tangles, is damaged or curly, or you want it smoother or more moisturized, so pair shampoo with conditioner.',
  });
  const suggestMask = damaged && hair.carePref === 'extra';
  if (suggestMask) {
    reasons.push({ zh: '你接受额外步骤，受损发可以每周加一次发膜。', en: 'You are open to extra steps, so a weekly hair mask can help damaged hair.' });
  } else if (hair.carePref === 'simple') {
    reasons.push({ zh: '你希望简单护理，只保留洗发水和护发素两步。', en: 'You prefer a simple routine, so just shampoo and conditioner.' });
  }
  return { categories: ['shampoo', 'conditioner'], suggestMask, reasons };
}

// ---------- 转换为打分输入 ----------

export function cityKey(c: City): string {
  return `${c.city}, ${c.country}`;
}

export function moneyToUsd(m: Money | null | undefined, rates: ExchangeRate[]): number | null {
  if (!m || !(m.amount > 0)) return null;
  return toUsd(m.amount, m.currency, rates);
}

export interface Answers {
  base: BaseAnswers;
  scalp: ScalpAnswers;
  hair: HairAnswers;
}

/**
 * 某个品类的打分输入：
 * - 洗发水侧重头皮与清洁：头皮困扰权重 SHAMPOO_SCALP_WEIGHT，发丝状态和期望效果权重 1；
 * - 护发素等发丝产品只看发丝状态和期望效果；
 * - 两者都遵守想避开的成分（硬性过滤）。
 * 按整套设预算时，单品不按档位筛选（总价在搭配时检查）。
 */
export function toScoringProfile(
  answers: Answers,
  category: Category,
  ctx: { cities: City[]; exchangeRates: ExchangeRate[]; inUseProducts?: Product[] },
): ScoringProfile {
  const { base, scalp, hair } = answers;
  const forScalp = category === 'shampoo' || category === 'scalp_care';
  const scalpT = forScalp ? scalpTargets(scalp) : [];
  const hairT = hairTargets(hair);
  const targetWeights: Partial<Record<Target, number>> = {};
  for (const t of hairT) targetWeights[t] = 1;
  for (const t of scalpT) targetWeights[t] = SHAMPOO_SCALP_WEIGHT;
  const itemBudget = base.budgetMode === 'item';
  const budget = itemBudget ? base.budgets[category] ?? 'none' : 'none';
  return {
    concerns: [...scalpT, ...hairT.filter((t) => !scalpT.includes(t))],
    concernsRanked: false,
    targetWeights,
    sensitive: forScalp && isSensitiveScalp(scalp),
    specialStatus: base.specialStatus,
    // 用户填写的想避开的成分 / 成分类型在打分中走硬性过滤，直接排除
    avoidIngredients: base.avoidIngredients,
    avoidTags: base.avoid as RiskTag[],
    budget,
    customBudgetUsd: budget === 'custom' ? moneyToUsd(base.customBudgets[category], ctx.exchangeRates) : null,
    fragrancePref: hair.fragrancePref,
    washFrequency: scalp.washFrequency,
    city: ctx.cities.find((c) => cityKey(c) === base.cityKey) ?? null,
    inUseProducts: ctx.inUseProducts ?? [],
  };
}

/** 结果页要展示的品类：按购买范围；"帮我判断"按建议 */
export function scopeCategories(scope: PurchaseScope | null, hair: HairAnswers): Category[] {
  if (scope === 'conditioner') return ['conditioner'];
  if (scope === 'set') return ['shampoo', 'conditioner'];
  if (scope === 'help') return adviseCare(hair).categories;
  return ['shampoo'];
}
