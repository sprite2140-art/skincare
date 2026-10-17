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
// 题目见 docs/QUIZ.md。严重程度不加权，只用于就医提示和判断是否属于敏感头皮。
// 旧档案中的取值（one_two_days、three_plus_days、redness、red_recurring、hairLossLevel）仍能读取。

export type ScalpOilTiming = 'same_day' | 'next_day' | 'three_four_days' | 'five_plus_days' | 'one_two_days' | 'three_plus_days';
export type ScalpConcern = 'dandruff' | 'itch' | 'dry_tight' | 'hair_loss' | 'redness';
/** 头皮屑是什么样的？（选了头皮屑才问）red_recurring 为旧选项 */
export type DandruffType = 'dry_fine' | 'oily_large' | 'thick_scaly' | 'red_recurring';
/** 洗头后第 2–3 天头皮屑大概有多少，1–4 级 */
export type DandruffAmount = 1 | 2 | 3 | 4;
/** 用洗发水或其他头皮产品后的不适 */
export type Discomfort = 'stinging' | 'burning' | 'tightness' | 'tingling';
export type DiscomfortFrequency = 'sometimes' | 'often';
/** 头皮会发红吗？ */
export type Redness = 'none' | 'occasional' | 'often' | 'spreading';
export type HairLength = 'short' | 'shoulder' | 'long';
/** 平常一天大概掉多少头发：1–6 级，或最近几周突然大量掉发 */
export type HairLossAmount = 1 | 2 | 3 | 4 | 5 | 6 | 'sudden';
/** 哪里的头发明显变稀 */
export type ThinningArea = 'part_widening' | 'hairline' | 'crown' | 'diffuse' | 'patches';
/** 干发喷雾、发胶、发蜡等造型产品 */
export type StylingUse = 'none' | 'weekly_1_2' | 'weekly_3_plus' | 'daily';
/** 旧版掉发追问 */
export type HairLossLevel = 'same_as_before' | 'more_than_before' | 'sudden_or_patchy';

/** 旧档案迁移：旧的"发红"困扰转到新的发红题（未回答时预填"偶尔，轻微发红"） */
export function migrateScalp(a: ScalpAnswers): ScalpAnswers {
  if (!a.concerns.includes('redness')) return a;
  return { ...a, concerns: a.concerns.filter((c) => c !== 'redness'), redness: a.redness ?? 'occasional' };
}

export interface ScalpAnswers {
  oilTiming: ScalpOilTiming | null;
  concerns: ScalpConcern[];
  /** 选了"没有明显困扰" */
  noConcerns?: boolean;
  dandruffType?: DandruffType | null;
  dandruffAmount?: DandruffAmount | null;
  /** 过去一周最痒时的程度，0–10（选了痒才问） */
  itchScore?: number | null;
  discomfort?: Discomfort[];
  discomfortNone?: boolean;
  discomfortFrequency?: DiscomfortFrequency | null;
  redness?: Redness | null;
  hairLength?: HairLength | null;
  hairLossAmount?: HairLossAmount | null;
  thinning?: ThinningArea[];
  thinningNone?: boolean;
  hairLossLevel?: HairLossLevel | null;
  washFrequency: WashFrequency | null;
  styling?: StylingUse | null;
}

/** 瘙痒 4 分及以上视为敏感头皮，7 分及以上建议就医 */
export const ITCH_SENSITIVE_MIN = 4;
export const ITCH_MEDICAL_MIN = 7;

/** 头皮困扰是多选不排序 */
const SCALP_CONCERN_TARGETS: Record<ScalpConcern, Target> = {
  dandruff: 'dandruff',
  itch: 'scalp_itch',
  dry_tight: 'dry_scalp',
  hair_loss: 'hair_loss',
  redness: 'scalp_redness',
};

/** 敏感头皮：瘙痒 4 分及以上（选了痒但没填分数时偏保守也算）、用产品后有不适、头皮经常发红 */
export function isSensitiveScalp(a: ScalpAnswers): boolean {
  const itch = a.concerns.includes('itch') && (a.itchScore == null || a.itchScore >= ITCH_SENSITIVE_MIN);
  const discomfort = (a.discomfort ?? []).length > 0;
  const redness = a.redness === 'often' || a.redness === 'spreading';
  return itch || discomfort || redness;
}

export function scalpTargets(a: ScalpAnswers): Target[] {
  const targets: Target[] = [];
  const add = (t: Target) => {
    if (!targets.includes(t)) targets.push(t);
  };
  for (const c of a.concerns) {
    // 旧档案的"发红"困扰：已回答新的发红题时以新答案为准
    if (c === 'redness' && a.redness != null) continue;
    add(SCALP_CONCERN_TARGETS[c]);
  }
  if (a.concerns.includes('dandruff') && a.dandruffType === 'oily_large') add('scalp_oil');
  if (a.redness && a.redness !== 'none') add('scalp_redness');
  if (a.oilTiming === 'same_day' || a.oilTiming === 'next_day') add('scalp_oil');
  if (a.oilTiming === 'five_plus_days') add('dry_scalp');
  if (isSensitiveScalp(a)) add('sensitive_scalp');
  return targets;
}

/** 常用造型产品（每周 3 次以上） */
export function frequentStyling(a: ScalpAnswers): boolean {
  return a.styling === 'weekly_3_plus' || a.styling === 'daily';
}

// ---------- 头发 ----------

export type HairThickness = 'fine' | 'medium' | 'coarse';
export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily';
export type HairCondition = 'dry' | 'tangling' | 'colored' | 'permed_bleached' | 'breakage' | 'heat';
/** 期望效果，最多选 3 项 */
/** tone 为旧选项（去黄 / 去橙合在一起），新档案分为 tone_yellow 和 tone_orange */
export type HairGoal = 'smooth' | 'moisture' | 'less_frizz' | 'clean' | 'volume' | 'shine' | 'curl' | 'scent' | 'tone_yellow' | 'tone_orange' | 'tone';
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
  tone_yellow: ['tone_yellow'],
  tone_orange: ['tone_orange'],
  tone: ['tone_yellow', 'tone_orange'],
};

export const TONE_GOALS: HairGoal[] = ['tone_yellow', 'tone_orange', 'tone'];

/** "去黄""去橙"只在发丝状态选了染或烫漂时出现 */
export function toneGoalAvailable(hair: Pick<HairAnswers, 'conditions'>): boolean {
  return hair.conditions.includes('colored') || hair.conditions.includes('permed_bleached');
}

export function hairTargets(a: HairAnswers): Target[] {
  const targets: Target[] = [];
  const add = (t: Target) => {
    if (!targets.includes(t)) targets.push(t);
  };
  for (const c of a.conditions) CONDITION_TARGETS[c].forEach(add);
  for (const g of a.goals.slice(0, MAX_GOALS)) {
    if (TONE_GOALS.includes(g) && !toneGoalAvailable(a)) continue;
    GOAL_TARGETS[g].forEach(add);
  }
  return targets;
}

// ---------- 就医提示 ----------

export interface MedicalAlert {
  code: string;
  text: Text;
}

const SEE_DOCTOR = { zh: '建议找皮肤科医生看看。', en: 'Consider seeing a dermatologist.' };
const alert = (code: string, zh: string, en: string): MedicalAlert => ({
  code,
  text: { zh: `${zh}，${SEE_DOCTOR.zh}`, en: `${en}. ${SEE_DOCTOR.en}` },
});

/**
 * 问卷中标"就医提示"的情况：结果页顶部建议找皮肤科医生看看，统一措辞，不出现具体病名。
 * 只有选了对应困扰时，追问的答案才生效。有提示时仍然给出产品推荐。
 */
export function scalpMedicalAlerts(a: ScalpAnswers): MedicalAlert[] {
  const alerts: MedicalAlert[] = [];
  const dandruff = a.concerns.includes('dandruff');
  const rednessOften = a.redness === 'often';
  if (dandruff && a.dandruffType === 'thick_scaly') {
    alerts.push(alert('dandruff_thick', '你提到头皮上有厚痂，或银白色、成片的鳞屑', 'You mentioned thick crusts or silvery patches of scale'));
  }
  if (dandruff && a.dandruffType === 'red_recurring') {
    alerts.push(alert('dandruff_red_recurring', '你提到头皮屑伴红斑、反复不好', 'You mentioned flakes with redness that keep coming back'));
  }
  if (dandruff && a.dandruffType === 'oily_large' && rednessOften) {
    alerts.push(alert('dandruff_oily_red', '你提到头皮屑油腻偏黄、成片，而且头皮经常发红', 'You mentioned greasy yellowish flakes and frequent scalp redness'));
  }
  if (dandruff && a.dandruffAmount === 4 && rednessOften) {
    alerts.push(alert('dandruff_heavy_red', '你提到头皮屑很多，而且头皮经常发红', 'You mentioned heavy flaking and frequent scalp redness'));
  }
  if (a.concerns.includes('itch') && a.itchScore != null && a.itchScore >= ITCH_MEDICAL_MIN) {
    alerts.push(alert('itch_severe', '你提到头皮瘙痒较重（7 分及以上）', 'You rated your scalp itch 7 or higher'));
  }
  if (a.redness === 'spreading') {
    alerts.push(alert('redness_spreading', '你提到头皮发红并伴有渗液、结痂，或蔓延到发际线以外', 'You mentioned redness with oozing or crusting, or spreading beyond the hairline'));
  }
  if (a.discomfortFrequency === 'often' && (a.discomfort ?? []).length > 0 && rednessOften) {
    alerts.push(alert('discomfort_red', '你提到用产品后经常不适，而且头皮经常发红', 'You mentioned frequent discomfort after products and frequent scalp redness'));
  }
  if (a.concerns.includes('hair_loss')) {
    // 旧档案的掉发追问只在还没回答新的掉发量题时生效
    const legacy = a.hairLossAmount == null && a.hairLossLevel === 'sudden_or_patchy';
    if (a.hairLossAmount === 6 || a.hairLossAmount === 'sudden' || legacy) {
      alerts.push(alert('hair_loss_heavy', '你提到掉发很多，或最近突然大量掉发', 'You mentioned heavy hair shedding or a sudden increase'));
    }
    if ((a.thinning ?? []).includes('patches')) {
      alerts.push(alert('hair_loss_patches', '你提到出现圆形或成片的秃斑', 'You mentioned round or patchy bald spots'));
    }
  }
  return alerts;
}

/** 结果页的说明（不是就医提示）：头顶、发际线或整体变稀 */
export function scalpInfoNotes(a: ScalpAnswers): MedicalAlert[] {
  if (!a.concerns.includes('hair_loss')) return [];
  const pattern = (a.thinning ?? []).some((t) => t !== 'patches');
  return pattern
    ? [{
        code: 'thinning_pattern',
        text: {
          zh: '分线变宽、发际线后移、头顶或整体变稀，多与遗传和激素有关，洗发水无法逆转；想了解原因可以找皮肤科医生看看。',
          en: 'A widening part, receding hairline, or thinning at the crown or overall is often linked to genetics and hormones; shampoo cannot reverse it. A dermatologist can help explain it.',
        },
      }]
    : [];
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
    frequentStyling: frequentStyling(scalp),
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
