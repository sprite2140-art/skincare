// npm run budget-gaps：低预算选择不足的清单（2026-11-03）。每个品类 × 每个单项需求（含"不选"），
// 在最低两档预算（q1、q2）下数可推荐的款数（与结果页相同的规则），少于 3 款的写入
// data/todo_hair.csv（洗发水、护发素）和 data/todo_skin.csv（护肤各步骤），供补充低价产品。
// 只看没有特殊状态、不常敏感、不避开任何成分的答案：这些情况下的不足只能靠补产品解决。
// 只读数据和打分代码；结果页不会因此自动放宽条件。

import { readFileSync, writeFileSync } from 'node:fs';
import { loadDataFromDisk } from '../src/data/node';
import { computeBudgetCaps } from '../src/scoring/budget';
import { buildFaceRoutine, isEligible } from '../src/scoring/faceRoutine';
import { FACE_NEED_LABELS } from '../src/scoring/faceScore';
import { rankProducts } from '../src/scoring/score';
import { filterByMarket } from '../src/scoring/market';
import { TEST_MODE_DRAFT_SCORING } from '../src/scoring/config';
import { EMPTY_FACE, FACE_CONCERNS, type FaceAnswers } from '../src/profile/faceQuestionnaire';
import { EMPTY_HAIR, toScoringProfile, type Answers, type HairGoal, type ScalpConcern } from '../src/profile/questionnaire';
import { newProfile } from '../src/profile/storage';

const FEW = 3;
const TIERS = ['q1', 'q2'] as const;
const d = loadDataFromDisk();
const budgetCaps = computeBudgetCaps(d.products, d.exchangeRates);
const data = { index: d.ingredientIndex, exchangeRates: d.exchangeRates, budgetCaps, allowDraft: TEST_MODE_DRAFT_SCORING };
const us = filterByMarket(d.products, 'US', false).shown;
const zh = JSON.parse(readFileSync('src/i18n/zh.json', 'utf8')) as Record<string, string>;
const HEADER = 'category,need,need_zh,budget_tier,budget_cap_usd,available,available_no_budget_limit,missing,note';
const csv = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const capText = (v: number | undefined) => (v === undefined ? '' : String(Math.round(v * 100) / 100));
const note = (n: number, unlimited: number) =>
  unlimited < FEW ? '不限预算也少于 3 款：缺这个需求的产品，不只是低价' : `需补 ${FEW - n} 款价格不超过上限的产品`;

// ---------- 洗护 ----------
const SCALP: ScalpConcern[] = ['dandruff', 'itch', 'dry_tight', 'hair_loss', 'oily', 'sensitive'];
const GOALS: HairGoal[] = ['smooth', 'moisture', 'less_frizz', 'clean', 'volume', 'shine', 'curl', 'tone_yellow', 'tone_orange', 'repair', 'color_care'];
const COLOR_GOALS: HairGoal[] = ['tone_yellow', 'tone_orange', 'repair', 'color_care'];
const base = newProfile('gaps', 'gaps').base;
const hairNeeds: { id: string; label: string; concerns: ScalpConcern[]; goals: HairGoal[] }[] = [
  { id: 'none', label: '不选需求', concerns: [], goals: [] },
  ...SCALP.map((c) => ({ id: `scalp:${c}`, label: zh[`quiz.concern.${c}`] ?? c, concerns: [c], goals: [] })),
  ...GOALS.map((g) => ({ id: `goal:${g}`, label: zh[`quiz.goal.${g}`] ?? g, concerns: [], goals: [g] })),
];
const hairRows: string[] = [];
for (const cat of ['shampoo', 'conditioner'] as const) {
  for (const need of hairNeeds) {
    const count = (budget: 'q1' | 'q2' | 'none') => {
      const answers: Answers = {
        base: { ...base, scope: 'set', specialStatus: 'none', specialStatuses: [], budgets: { shampoo: budget, conditioner: budget } },
        scalp: { oilTiming: null, concerns: need.concerns, noConcerns: need.concerns.length === 0, washFrequency: 'every_other_day', itchScore: need.concerns.includes('itch') ? 5 : null },
        hair: { ...EMPTY_HAIR, goals: need.goals, conditions: need.goals.some((g) => COLOR_GOALS.includes(g)) ? ['colored'] : [] },
      };
      const profile = toScoringProfile(answers, cat, { cities: d.cities, exchangeRates: d.exchangeRates, routine: false });
      // 这个品类不按该需求推荐（如护发素和"清爽洁净"）：不是缺产品，不列
      if (need.id !== 'none' && profile.concerns.length === 0) return null;
      return rankProducts(us, cat, profile, data).filter((r) => !r.excluded && !r.lowMatch && r.score !== null).length;
    };
    const unlimited = count('none');
    if (unlimited === null) continue;
    for (const tier of TIERS) {
      const n = count(tier)!;
      if (n < FEW) hairRows.push([cat, need.id, need.label, tier, capText(budgetCaps[cat]?.[tier]), n, unlimited, FEW - n, note(n, unlimited)].map(csv).join(','));
    }
  }
}

// ---------- 护肤 ----------
const face = us.filter((p) => p.zone === 'face');
const skinRows: string[] = [];
const faceNeeds = [{ id: 'none', label: '不选困扰', concerns: [] as typeof FACE_CONCERNS[number][] }, ...FACE_CONCERNS.map((c) => ({ id: c, label: FACE_NEED_LABELS[c].zh, concerns: [c] }))];
for (const need of faceNeeds) {
  const steps = (budget: 'q1' | 'q2' | 'none') => {
    const f: FaceAnswers = { ...EMPTY_FACE, skinType: 'unsure', sensitivity: 'rarely', concerns: need.concerns, noConcerns: need.concerns.length === 0, budget, acneSeverity: need.concerns.includes('acne') ? 'occasional' : null };
    const routine = buildFaceRoutine({ products: face, face: f, statuses: [], avoidIngredients: [], avoidTags: [], data, classes: d.faceActiveClasses });
    return new Map(routine.steps.filter((s) => s.status !== 'no_data').map((s) => [s.step.id, { category: s.step.category, n: s.ranked.filter(isEligible).length }]));
  };
  const unlimited = steps('none');
  for (const tier of TIERS) {
    for (const [stepId, { category, n }] of steps(tier)) {
      const u = unlimited.get(stepId)?.n ?? 0;
      if (n < FEW) skinRows.push([`${category}${stepId === category ? '' : `(${stepId})`}`, need.id, need.label, tier, capText(budgetCaps[category]?.[tier]), n, u, FEW - n, note(n, u)].map(csv).join(','));
    }
  }
}

writeFileSync('data/todo_hair.csv', [HEADER, ...hairRows].join('\n') + '\n');
writeFileSync('data/todo_skin.csv', [HEADER, ...skinRows].join('\n') + '\n');
console.log(`洗护 ${hairRows.length} 行、护肤 ${skinRows.length} 行（少于 ${FEW} 款）`);
