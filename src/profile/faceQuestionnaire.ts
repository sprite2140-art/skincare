// 护肤（面部）问卷答案 → 打分输入。题目和规则见 docs/SKIN_QUIZ_DRAFT.md。
// 需求只来自 F2 的明确选择（最多 3 项，按顺序加权）；肤质、敏感、习惯不产生需求。

import type { FaceTarget } from '../data/types';
import type { Text } from '../scoring/labels';
import type { Money } from './questionnaire';

export type SkinType = 'dry' | 'normal' | 'combination' | 'oily' | 'unsure';
/** 容易敏感吗：很少 / 换季或换产品时偶尔 / 经常（刺痛、发红、发痒） */
export type Sensitivity = 'rarely' | 'sometimes' | 'often';
/** 痘痘情况（选了痘痘才问）；severe 给就医提示 */
export type AcneSeverity = 'occasional' | 'recurring' | 'severe';
export type MakeupUse = 'none' | 'sometimes' | 'daily';
export type OutdoorTime = 'under_30m' | '30m_2h' | 'over_2h';
export type SweatLevel = 'rarely' | 'sometimes' | 'often';
/** 预算：一档对所有品类（各品类按自己的价格分位数）/ 不限 / 自填整套总预算 */
export type FaceBudget = 'q1' | 'q2' | 'q3' | 'none' | 'set';

export const FACE_CONCERNS: readonly FaceTarget[] = ['acne', 'oil', 'dryness', 'redness', 'pigmentation', 'aging', 'pores'];
export const MAX_FACE_CONCERNS = 3;

export interface FaceAnswers {
  skinType: SkinType | null;
  sensitivity: Sensitivity | null;
  /** 按重要程度排序，最多 3 项 */
  concerns: FaceTarget[];
  /** 选了"没有明显困扰" */
  noConcerns: boolean;
  acneSeverity: AcneSeverity | null;
  makeup: MakeupUse | null;
  outdoor: OutdoorTime | null;
  sweat: SweatLevel | null;
  budget: FaceBudget | null;
  /** budget = set 时的整套总预算；金额为 0 表示还没填写，按不限处理 */
  setBudget: Money | null;
}

export const EMPTY_FACE: FaceAnswers = {
  skinType: null, sensitivity: null, concerns: [], noConcerns: false, acneSeverity: null,
  makeup: null, outdoor: null, sweat: null, budget: null, setBudget: null,
};

/** 旧档案补齐字段；去掉不再有效的困扰，最多 3 项 */
export function migrateFace(a: Partial<FaceAnswers> | null | undefined): FaceAnswers {
  const f = { ...EMPTY_FACE, ...(a ?? {}) };
  const concerns = (f.concerns ?? []).filter((c, i, arr) => FACE_CONCERNS.includes(c) && arr.indexOf(c) === i).slice(0, MAX_FACE_CONCERNS);
  return { ...f, concerns, acneSeverity: concerns.includes('acne') ? f.acneSeverity : null };
}

/** 经常敏感：刺激风险扣分加倍，功效成分计入刺激，不出现去角质步骤 */
export const isFaceSensitive = (a: Pick<FaceAnswers, 'sensitivity'>) => a.sensitivity === 'often';

/** 户外 2 小时以上，或会运动出汗 / 游泳：防晒同等级内优先防水款 */
export const prefersWaterResistant = (a: Pick<FaceAnswers, 'outdoor' | 'sweat'>) =>
  a.outdoor === 'over_2h' || a.sweat === 'sometimes' || a.sweat === 'often';

/** 化妆（偶尔或几乎每天）：晚上流程开头提示卸妆 */
export const wearsMakeup = (a: Pick<FaceAnswers, 'makeup'>) => a.makeup === 'sometimes' || a.makeup === 'daily';

/** 就医提示：只按 F2a 的最后一档，措辞与洗护统一，不出现病名 */
export function faceMedicalAlerts(a: FaceAnswers): Text[] {
  if (a.concerns.includes('acne') && a.acneSeverity === 'severe') {
    return [{
      zh: '痘痘面积大，或有疼痛的大包，建议找皮肤科医生看看。',
      en: 'For widespread breakouts or painful deep bumps, it is worth seeing a dermatologist.',
    }];
  }
  return [];
}
