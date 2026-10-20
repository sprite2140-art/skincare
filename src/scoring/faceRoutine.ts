// 护肤流程：按步骤给出 1 个首选和 2 个备选（草案 7.2）。设了整套总预算时，沿用洗护搭配的组合规则
// （先比适合等级，再比总分，同分取总价低的）。没有符合条件的产品时明确说明，不放宽条件。

import type { Product } from '../data/types';
import type { ActiveClassIndex } from '../data/faceActives';
import type { FaceAnswers } from '../profile/faceQuestionnaire';
import { buildRoutine } from './routine';
import { buildFaceSteps, type FaceStep, type FaceStepId } from './faceSteps';
import { faceScoringProfile, rankFaceStep, type FaceProductScore } from './faceScore';
import type { RiskTag } from '../data/types';
import type { ScoringData, ScoringProfile, SpecialStatus } from './score';
import { scheduleRoutine, type Schedule } from './faceSchedule';
import { checkRoutineConflicts, type RoutineConflict } from './faceConflicts';

/** 整套预算组合时每步最多看前几款，避免组合数过多 */
const SET_BUDGET_POOL = 8;
export const ALTERNATES = 2;

export interface RoutineStep {
  step: FaceStep;
  profile: ScoringProfile;
  ranked: FaceProductScore[];
  /** 可推荐的产品（不含排除、无法评分、防晒信息不全、不太匹配） */
  eligible: FaceProductScore[];
  primary: FaceProductScore | null;
  alternates: FaceProductScore[];
  /** 被"隐藏未调色物理防晒"开关隐藏的款数 */
  hidden: number;
  /** no_data = 这个品类还没有产品数据；no_match = 有数据但没有符合条件的产品 */
  status: 'ok' | 'no_data' | 'no_match';
}

export interface FaceRoutineInput {
  products: Product[];
  face: FaceAnswers;
  statuses: SpecialStatus[];
  avoidIngredients: string[];
  avoidTags: RiskTag[];
  data: ScoringData;
  classes: ActiveClassIndex;
  basicOnly?: boolean;
  hideUntintedMineral?: boolean;
  /** 整套总预算（USD）；null = 不限 */
  setBudgetUsd?: number | null;
  /** 用户替换的首选：步骤 → product_id */
  picks?: Partial<Record<FaceStepId, string>>;
}

export interface FaceRoutine {
  steps: RoutineStep[];
  /** 首选的总价（USD），每样产品只算一次；有价格未知的产品时为 null */
  totalUsd: number | null;
  /** 设了整套预算但在预算内找不到组合 */
  overBudget: boolean;
}

const isEligible = (r: FaceProductScore) => !r.excluded && r.score !== null && !r.lowMatch && r.faceExtras.sunscreen !== 'incomplete';

export function buildFaceRoutine(input: FaceRoutineInput): FaceRoutine {
  const steps = buildFaceSteps(input.face, { statuses: input.statuses, basicOnly: input.basicOnly });
  const base = { specialStatus: 'none' as const, specialStatuses: input.statuses, avoidIngredients: input.avoidIngredients, avoidTags: input.avoidTags };
  const rs: RoutineStep[] = steps.map((step) => {
    const profile = faceScoringProfile(input.face, step, base);
    const { ranked, hidden } = rankFaceStep(input.products, profile, input.data, { face: input.face, step, classes: input.classes }, { hideUntintedMineral: input.hideUntintedMineral });
    const eligible = ranked.filter(isEligible);
    const hasData = input.products.some((p) => p.category === step.category);
    return { step, profile, ranked, eligible, primary: eligible[0] ?? null, alternates: [], hidden, status: !hasData ? 'no_data' : eligible.length > 0 ? 'ok' : 'no_match' };
  });

  // 整套预算：在预算内选组合（每步只看前几款）
  let overBudget = false;
  const cap = input.setBudgetUsd ?? null;
  if (cap !== null) {
    const lists = Object.fromEntries(rs.map((s) => [s.step.category, s.eligible.slice(0, SET_BUDGET_POOL)]));
    const combo = buildRoutine(rs.map((s) => s.step.category), lists, cap);
    overBudget = combo.noMatch;
    for (const s of rs) s.primary = (combo.slots.find((x) => x.category === s.step.category)?.chosen as FaceProductScore | null) ?? null;
  }

  // 用户替换的首选
  for (const s of rs) {
    const id = input.picks?.[s.step.id];
    const picked = id ? s.eligible.find((r) => r.product.productId === id) : undefined;
    if (picked) s.primary = picked;
    s.alternates = s.eligible.filter((r) => r !== s.primary).slice(0, ALTERNATES);
  }

  return { steps: rs, totalUsd: routineTotalUsd(rs), overBudget };
}

/** 首选的总价，每样产品只算一次（早晚都用的产品不重复计） */
export function routineTotalUsd(steps: RoutineStep[]): number | null {
  let sum = 0;
  for (const s of steps) {
    if (!s.primary) continue;
    if (s.primary.price.usd === null) return null;
    sum += s.primary.price.usd;
  }
  return sum;
}

/**
 * 流程 + 早晚安排 + 搭配检查。首选组合有冲突时，在不改变适合等级的前提下换成同一步里下一款没有冲突的产品
 * （先换可选步骤，再换基础步骤；用户自己选的不换）；换不了时保留首选，冲突写在页面顶部（草案 7.2）。
 */
export function buildScheduledRoutine(input: FaceRoutineInput): { routine: FaceRoutine; schedule: Schedule; conflicts: RoutineConflict[] } {
  const routine = buildFaceRoutine(input);
  const evaluate = () => {
    const schedule = scheduleRoutine(routine.steps);
    return { schedule, conflicts: checkRoutineConflicts(schedule, input.data.index) };
  };
  let current = evaluate();
  const involved = (s: RoutineStep, list: RoutineConflict[]) =>
    !!s.primary && list.some((c) => c.rule !== 'photosensitive_no_sunscreen' && c.products.includes(s.primary!));
  const order = [...routine.steps].sort((a, b) => Number(a.step.tier === 'basic') - Number(b.step.tier === 'basic'));
  for (const s of order) {
    if (input.picks?.[s.step.id] || !involved(s, current.conflicts)) continue;
    const original = s.primary!;
    for (const cand of s.eligible) {
      if (cand === original || cand.fitLevel !== original.fitLevel) continue;
      s.primary = cand;
      // 设了整套预算时，换了之后不能超出预算
      if (input.setBudgetUsd != null && (routineTotalUsd(routine.steps) ?? Infinity) > input.setBudgetUsd) {
        s.primary = original;
        continue;
      }
      const trial = evaluate();
      if (trial.conflicts.length < current.conflicts.length) {
        current = trial;
        break;
      }
      s.primary = original;
    }
  }
  for (const s of routine.steps) s.alternates = s.eligible.filter((r) => r !== s.primary).slice(0, ALTERNATES);
  routine.totalUsd = routineTotalUsd(routine.steps);
  return { routine, ...current };
}
