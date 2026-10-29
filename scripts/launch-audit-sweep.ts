// npm run launch-audit-sweep：上线审计第 1 项。遍历问卷主要答案组合，统计每一步"可推荐"（结果页主列表）的款数，
// 列出少于 3 款或为空的组合。只读数据和打分代码，不改任何东西。结果写入 docs/launch_audit_sweep.json（供 LAUNCH_AUDIT.md 引用）。
//
// 护肤：困扰（无 / 1—3 项组合，64 种）× 敏感 3 × 特殊状态 6 × 预算 4（q1—q3、不限），用 buildScheduledRoutine（与结果页相同），
//       肤质只影响同等级内的排序（标注适合该肤质的排前），不影响能否推荐，所以固定为"不确定"；
//       每步的可推荐 = eligible（不含排除、无法评分、防晒信息不全、不太匹配）。
// 洗护：头皮困扰（无 / 1—2 项）× 期望效果（无 / 1 项；去黄、去橙、修护、护色带上"染发"）× 特殊状态 6 × 预算 4，
//       洗发水、护发素分别用 rankProducts（与结果页单品列表相同），可推荐 = 不被排除、能打分、不是"不太匹配"。
// 市场：美国（默认市场）。

import { writeFileSync } from 'node:fs';
import { loadDataFromDisk } from '../src/data/node';
import { computeBudgetCaps } from '../src/scoring/budget';
import { buildScheduledRoutine } from '../src/scoring/faceRoutine';
import { rankProducts } from '../src/scoring/score';
import { filterByMarket } from '../src/scoring/market';
import { TEST_MODE_DRAFT_SCORING } from '../src/scoring/config';
import { EMPTY_FACE, FACE_CONCERNS, type FaceAnswers, type FaceBudget, type Sensitivity, type SkinType } from '../src/profile/faceQuestionnaire';
import { EMPTY_HAIR, toScoringProfile, type Answers, type HairGoal, type ScalpAnswers, type ScalpConcern } from '../src/profile/questionnaire';

const EMPTY_SCALP: ScalpAnswers = { oilTiming: null, concerns: [], washFrequency: null };
import { newProfile } from '../src/profile/storage';
import type { SpecialStatus } from '../src/scoring/score';
import type { FaceTarget } from '../src/data/types';

const d = loadDataFromDisk();
const budgetCaps = computeBudgetCaps(d.products, d.exchangeRates);
const data = { index: d.ingredientIndex, exchangeRates: d.exchangeRates, budgetCaps, allowDraft: TEST_MODE_DRAFT_SCORING };
const us = filterByMarket(d.products, 'US', false).shown;
const face = us.filter((p) => p.zone === 'face');

const STATUSES: SpecialStatus[] = ['none', 'pregnant', 'trying', 'breastfeeding', 'rx', 'isotretinoin'];
const statusList = (s: SpecialStatus) => (s === 'none' ? [] : [s]);
function combos<T>(items: readonly T[], max: number): T[][] {
  const out: T[][] = [[]];
  const rec = (start: number, cur: T[]) => {
    for (let i = start; i < items.length; i++) {
      const next = [...cur, items[i]];
      out.push(next);
      if (next.length < max) rec(i + 1, next);
    }
  };
  rec(0, []);
  return out;
}

type Row = { zone: 'face' | 'hair'; step: string; count: number; answers: Record<string, unknown> };
const short: Row[] = [];
let faceRuns = 0;
let hairRuns = 0;
const t0 = Date.now();

// ---------- 护肤 ----------
// 肤质只影响排序，不影响可推荐的款数（faceScore.ts 的 preferred.skinType）
const SKIN: SkinType[] = ['unsure'];
const SENS: Sensitivity[] = ['rarely', 'sometimes', 'often'];
const FACE_BUDGETS: FaceBudget[] = ['q1', 'q2', 'q3', 'none'];
for (const concerns of combos<FaceTarget>(FACE_CONCERNS, 3)) {
  for (const skinType of SKIN) for (const sensitivity of SENS) for (const status of STATUSES) for (const budget of FACE_BUDGETS) {
    const f: FaceAnswers = { ...EMPTY_FACE, skinType, sensitivity, concerns, noConcerns: concerns.length === 0, budget, acneSeverity: concerns.includes('acne') ? 'occasional' : null };
    const { routine } = buildScheduledRoutine({
      products: face, face: f, statuses: statusList(status), avoidIngredients: [], avoidTags: [], data, classes: d.faceActiveClasses, conflictNotes: d.faceConflictNotes,
    });
    faceRuns++;
    if (faceRuns % 500 === 0) console.log(`护肤 ${faceRuns} 个流程…`);
    for (const s of routine.steps) {
      if (s.eligible.length < 3) short.push({ zone: 'face', step: s.step.id, count: s.eligible.length, answers: { skinType, sensitivity, concerns, status, budget } });
    }
  }
}

// ---------- 洗护 ----------
const SCALP: ScalpConcern[] = ['dandruff', 'itch', 'dry_tight', 'hair_loss', 'oily', 'sensitive'];
const GOALS: HairGoal[] = ['smooth', 'moisture', 'less_frizz', 'clean', 'volume', 'shine', 'curl', 'scent', 'tone_yellow', 'tone_orange', 'repair', 'color_care'];
const COLOR_GOALS: HairGoal[] = ['tone_yellow', 'tone_orange', 'repair', 'color_care'];
const HAIR_BUDGETS = ['q1', 'q2', 'q3', 'none'] as const;
const base = newProfile('audit', 'audit').base;
for (const concerns of combos(SCALP, 2)) {
  for (const goal of [null, ...GOALS]) for (const status of STATUSES) for (const budget of HAIR_BUDGETS) {
    const goals = goal ? [goal] : [];
    const answers: Answers = {
      base: { ...base, scope: 'set', specialStatus: status, specialStatuses: statusList(status), budgets: { shampoo: budget, conditioner: budget } },
      scalp: { ...EMPTY_SCALP, concerns, noConcerns: concerns.length === 0, washFrequency: 'every_other_day', itchScore: concerns.includes('itch') ? 5 : null },
      hair: { ...EMPTY_HAIR, goals, conditions: goal && COLOR_GOALS.includes(goal) ? ['colored'] : [] },
    };
    for (const cat of ['shampoo', 'conditioner'] as const) {
      const profile = toScoringProfile(answers, cat, { cities: d.cities, exchangeRates: d.exchangeRates });
      const ranked = rankProducts(us, cat, profile, data);
      const n = ranked.filter((r) => !r.excluded && !r.lowMatch && r.score !== null).length;
      hairRuns++;
      if (n < 3) short.push({ zone: 'hair', step: cat, count: n, answers: { concerns, goal, status, budget } });
    }
  }
}

writeFileSync('docs/launch_audit_sweep.json', JSON.stringify({ generatedBy: 'npm run launch-audit-sweep', faceRoutines: faceRuns, hairLists: hairRuns, short }, null, 1));
console.log(`护肤流程 ${faceRuns} 个、洗护列表 ${hairRuns} 个，少于 3 款的步骤 ${short.length} 个（为空 ${short.filter((r) => r.count === 0).length} 个），用时 ${Math.round((Date.now() - t0) / 1000)} 秒`);
