// 早晚流程（草案 3.3）：每个步骤的首选放在早上、晚上或早晚都用。
// - 洁面、保湿：早晚；防晒：早上；去角质：晚上（每周 1–2 次）；点涂：晚上。
// - 功效精华：品牌说明的使用时间（use_time）优先；未知时 A 醇类放晚上（AAD）、维生素 C 放早上（AAD）、
//   果酸 / 水杨酸类放晚上（行业惯例；FDA：果酸增加日晒敏感）；仍无法确定时放晚上。
// - 过氧化苯甲酰与 A 醇类：A 醇类在晚上时，含过氧化苯甲酰的产品放早上（品牌限定只能晚上用的除外；只含阿达帕林时不错开）。

import { bpoSensitiveRetinoids, type ActiveClass } from '../data/faceActives';
import type { FaceProductScore } from './faceScore';
import type { RoutineStep } from './faceRoutine';
import { FACE_STEP_ORDER, type FaceStepId } from './faceSteps';

export type TimeOfDay = 'am' | 'pm';

export interface ScheduledStep {
  step: RoutineStep;
  /** 这一时段用的产品（首选）；没有产品时为 null，页面仍显示这一步 */
  product: FaceProductScore | null;
  /** 去角质：每周 1–2 次 */
  weekly: boolean;
  /** 早晚都用的产品：在另一个时段也出现（价格只算一次） */
  bothTimes: boolean;
  /** 时段由规则调整过（如过氧化苯甲酰移到早上），页面写明原因 */
  movedReason: 'bpo_retinoid' | null;
}

export interface Schedule {
  am: ScheduledStep[];
  pm: ScheduledStep[];
}

const has = (p: FaceProductScore | null, c: ActiveClass) => !!p?.faceExtras.classes.has(c);

/** 按成分和品牌说明决定一个产品用在哪个时段 */
export function productTimes(stepId: FaceStepId, p: FaceProductScore | null): TimeOfDay[] {
  if (stepId === 'cleanser' || stepId === 'moisturizer') return ['am', 'pm'];
  if (stepId === 'sunscreen') return ['am'];
  if (stepId === 'exfoliator') return ['pm'];
  const useTime = p?.product.face?.useTime ?? 'unknown';
  if (useTime === 'am') return ['am'];
  if (useTime === 'pm') return ['pm'];
  if (useTime === 'both' && stepId === 'treatment') return ['am', 'pm'];
  if (stepId === 'spot') return ['pm'];
  if (has(p, 'retinoid')) return ['pm'];
  if (has(p, 'vitamin_c')) return ['am'];
  return ['pm'];
}

export function scheduleRoutine(steps: RoutineStep[]): Schedule {
  const times = new Map<RoutineStep, TimeOfDay[]>();
  const moved = new Set<RoutineStep>();
  for (const s of steps) times.set(s, productTimes(s.step.id, s.primary));

  // 过氧化苯甲酰与 A 醇类不在同一时段：A 醇类在晚上时，过氧化苯甲酰产品（未限定只能晚上用）放早上。
  // 只有阿达帕林时不用错开（阿达帕林与过氧化苯甲酰同用稳定）
  const retinoidAtNight = steps.some((s) => !!s.primary && bpoSensitiveRetinoids(s.primary.faceExtras.classes).length > 0 && times.get(s)!.includes('pm'));
  if (retinoidAtNight) {
    for (const s of steps) {
      if (!has(s.primary, 'benzoyl_peroxide') || has(s.primary, 'retinoid')) continue;
      if (s.step.id === 'cleanser' || s.step.id === 'moisturizer' || s.step.id === 'sunscreen') continue;
      if (s.primary!.product.face?.useTime === 'pm') continue;
      times.set(s, ['am']);
      moved.add(s);
    }
  }

  const order = (a: ScheduledStep, b: ScheduledStep) => FACE_STEP_ORDER.indexOf(a.step.step.id) - FACE_STEP_ORDER.indexOf(b.step.step.id);
  const build = (t: TimeOfDay) => steps
    .filter((s) => times.get(s)!.includes(t))
    .map((s): ScheduledStep => ({
      step: s,
      product: s.primary,
      weekly: s.step.weekly,
      bothTimes: times.get(s)!.length > 1,
      movedReason: moved.has(s) ? 'bpo_retinoid' : null,
    }))
    .sort(order);
  return { am: build('am'), pm: build('pm') };
}
