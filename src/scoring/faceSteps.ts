// 护肤步骤：由用户选的困扰自动决定（草案第 3 节）。基础 3 步（洁面、保湿、早上防晒）始终出现；
// 可选步骤只在选了对应困扰时加入，每个可选步骤都写明因为哪个困扰。

import type { Category, FaceTarget } from '../data/types';
import type { FaceAnswers } from '../profile/faceQuestionnaire';
import { isFaceSensitive } from '../profile/faceQuestionnaire';
import type { SpecialStatus } from './score';

export type FaceStepId = 'cleanser' | 'treatment' | 'spot' | 'exfoliator' | 'moisturizer' | 'sunscreen';

/** 完整顺序（用于排序）：卸妆 → 洁面 → 化妆水 → 去角质 → 精华 / 功效 → 点涂 → 眼霜 → 保湿 → 面油 → 防晒；第一阶段只推荐其中 6 步 */
export const FACE_STEP_ORDER: FaceStepId[] = ['cleanser', 'exfoliator', 'treatment', 'spot', 'moisturizer', 'sunscreen'];

export const STEP_CATEGORY: Record<FaceStepId, Category> = {
  cleanser: 'cleanser',
  treatment: 'serum',
  spot: 'spot_treatment',
  exfoliator: 'exfoliator',
  moisturizer: 'moisturizer',
  sunscreen: 'sunscreen',
};

/** 每一步计分的需求（只算用户选了的）；可选步骤按加入它的困扰（草案 4.3） */
const BASIC_STEP_NEEDS: Partial<Record<FaceStepId, FaceTarget[]>> = {
  cleanser: ['acne', 'oil', 'dryness', 'redness'],
  moisturizer: ['dryness', 'redness', 'oil', 'aging'],
  sunscreen: ['oil', 'dryness', 'acne', 'pigmentation'],
};
const TREATMENT_CONCERNS: FaceTarget[] = ['redness', 'pigmentation', 'aging', 'pores'];
const EXFOLIATOR_CONCERNS: FaceTarget[] = ['pores', 'pigmentation', 'oil'];

export interface FaceStep {
  id: FaceStepId;
  category: Category;
  /** basic = 基础 3 步；optional = 页面标注"可选" */
  tier: 'basic' | 'optional';
  /** 这一步计分的需求，按用户的排序 */
  needs: FaceTarget[];
  /** 可选步骤：因为哪些困扰加入 */
  becauseOf: FaceTarget[];
  /** 去角质：每周 1–2 次 */
  weekly: boolean;
}

export interface FaceStepOptions {
  statuses: SpecialStatus[];
  /** 结果页"只看基础 3 步" */
  basicOnly?: boolean;
}

/** 在用处方外用药或口服异维 A 酸：不出现去角质（草案 4.5）；口服异维 A 酸时也不出现点涂（处方外用药时过氧化苯甲酰点涂不排除） */
export const onRxTreatment = (statuses: SpecialStatus[]) => statuses.includes('rx') || statuses.includes('isotretinoin');

export function buildFaceSteps(a: FaceAnswers, opts: FaceStepOptions): FaceStep[] {
  const chosen = a.noConcerns ? [] : a.concerns;
  const pick = (list: FaceTarget[]) => chosen.filter((c) => list.includes(c));
  const steps: FaceStep[] = [];
  const add = (id: FaceStepId, tier: FaceStep['tier'], needs: FaceTarget[], becauseOf: FaceTarget[] = [], weekly = false) =>
    steps.push({ id, category: STEP_CATEGORY[id], tier, needs, becauseOf, weekly });

  for (const id of ['cleanser', 'moisturizer', 'sunscreen'] as const) add(id, 'basic', pick(BASIC_STEP_NEEDS[id]!));
  if (!opts.basicOnly) {
    // 多个困扰对应同一步时合并为一个产品（同一款精华尽量覆盖多个困扰）
    const treatment = pick(TREATMENT_CONCERNS);
    if (treatment.length > 0) add('treatment', 'optional', treatment, treatment);
    const rx = onRxTreatment(opts.statuses);
    if (chosen.includes('acne') && !opts.statuses.includes('isotretinoin')) add('spot', 'optional', ['acne'], ['acne']);
    const exfoliate = pick(EXFOLIATOR_CONCERNS);
    if (exfoliate.length > 0 && !isFaceSensitive(a) && !rx) add('exfoliator', 'optional', exfoliate, exfoliate, true);
  }
  return steps.sort((x, y) => FACE_STEP_ORDER.indexOf(x.id) - FACE_STEP_ORDER.indexOf(y.id));
}
