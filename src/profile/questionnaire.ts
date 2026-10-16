// 问卷答案 → 打分输入。问卷见 docs/PRODUCT.md "问卷设计"。

import type { City, Product, RiskTag, Target } from '../data/types';
import type { BudgetTier } from '../scoring/config';
import type { Text } from '../scoring/labels';
import type { ScoringProfile, SpecialStatus, WashFrequency } from '../scoring/score';

export type AvoidOption = 'fragrance' | 'alcohol' | 'essential_oil';

export interface BaseAnswers {
  cityKey: string | null; // "城市, 国家"，对应 cities.csv
  budget: BudgetTier;
  specialStatus: SpecialStatus;
  avoid: AvoidOption[];
  avoidIngredients: string[];
}

// ---------- 头皮 ----------

export type ScalpOilTiming = 'same_day' | 'one_two_days' | 'three_plus_days';
export type ScalpConcern = 'dandruff' | 'itch' | 'redness' | 'hair_loss';
/** 头皮屑是什么样的？（选了头皮屑才问） */
export type DandruffType = 'dry_fine' | 'oily_large' | 'red_recurring';
/** 掉发情况？（选了掉发才问） */
export type HairLossLevel = 'same_as_before' | 'more_than_before' | 'sudden_or_patchy';

export interface ScalpAnswers {
  oilTiming: ScalpOilTiming | null;
  concerns: ScalpConcern[];
  dandruffType?: DandruffType | null;
  hairLossLevel?: HairLossLevel | null;
  washFrequency: WashFrequency | null;
}

/** 头皮困扰是多选不排序，平均加权 */
const SCALP_CONCERN_TARGETS: Record<ScalpConcern, Target> = {
  dandruff: 'dandruff',
  itch: 'scalp_itch',
  redness: 'scalp_redness',
  hair_loss: 'hair_loss',
};

export function scalpTargets(a: ScalpAnswers): Target[] {
  const targets: Target[] = [];
  for (const c of a.concerns) {
    const t = SCALP_CONCERN_TARGETS[c];
    if (!targets.includes(t)) targets.push(t);
  }
  if (a.oilTiming === 'same_day') targets.push('scalp_oil');
  return targets;
}

// ---------- 头发 ----------

export type HairTreatment = 'dye' | 'perm' | 'bleach' | 'heat_tools' | 'none';
export type HairConcern = 'frizz' | 'split_ends' | 'flat' | 'tangling' | 'color_fade';

export interface HairAnswers {
  treatments: HairTreatment[];
  concerns: HairConcern[];
}

const HAIR_CONCERN_TARGETS: Record<HairConcern, Target> = {
  frizz: 'frizz',
  split_ends: 'damage',
  flat: 'flat_hair',
  tangling: 'tangling',
  color_fade: 'color_fade',
};

/** 头发困扰多选不排序；染、烫、漂、常用热工具都视为有受损需求 */
export function hairTargets(a: HairAnswers): Target[] {
  const targets: Target[] = [];
  const add = (t: Target) => {
    if (!targets.includes(t)) targets.push(t);
  };
  for (const c of a.concerns) add(HAIR_CONCERN_TARGETS[c]);
  if (a.treatments.some((t) => t !== 'none')) add('damage');
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

// ---------- 转换为打分输入 ----------

export function cityKey(c: City): string {
  return `${c.city}, ${c.country}`;
}

export function toScalpScoringProfile(
  base: BaseAnswers,
  scalp: ScalpAnswers,
  cities: City[],
  inUseProducts: Product[],
): ScoringProfile {
  return {
    concerns: scalpTargets(scalp),
    concernsRanked: false,
    // 头皮易痒视为敏感
    sensitive: scalp.concerns.includes('itch'),
    specialStatus: base.specialStatus,
    // 用户填写的想避开的成分 / 成分类型在打分中走硬性过滤，直接排除
    avoidIngredients: base.avoidIngredients,
    avoidTags: base.avoid as RiskTag[],
    budget: base.budget,
    washFrequency: scalp.washFrequency,
    city: cities.find((c) => cityKey(c) === base.cityKey) ?? null,
    inUseProducts,
  };
}
