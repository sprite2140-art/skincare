import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import { EMPTY_FACE, type FaceAnswers } from '../profile/faceQuestionnaire';
import { computeBudgetCaps } from './budget';
import { buildFaceRoutine } from './faceRoutine';

const real = loadDataFromDisk();
const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: true };
const routine = (face: Partial<FaceAnswers>, extra: Partial<Parameters<typeof buildFaceRoutine>[0]> = {}) =>
  buildFaceRoutine({
    products: real.products, face: { ...EMPTY_FACE, ...face }, statuses: [], avoidIngredients: [], avoidTags: [],
    data, classes: real.faceActiveClasses, ...extra,
  });

describe('护肤流程：每步 1 个首选 + 2 个备选', () => {
  it('有数据的步骤给出首选和 2 个备选；还没有数据的步骤标为 no_data', () => {
    const r = routine({ concerns: ['acne'] });
    const cleanser = r.steps.find((s) => s.step.id === 'cleanser')!;
    expect(cleanser.status).toBe('ok');
    expect(cleanser.primary).not.toBeNull();
    expect(cleanser.alternates).toHaveLength(2);
    expect(cleanser.alternates).not.toContain(cleanser.primary);
    // 点涂 2026-10-27 已导入；某个品类还没有产品时，该步骤标为 no_data
    expect(r.steps.find((s) => s.step.id === 'spot')!.status).toBe('ok');
    const noSpot = routine({ concerns: ['acne'] }, { products: real.products.filter((p) => p.category !== 'spot_treatment') });
    expect(noSpot.steps.find((s) => s.step.id === 'spot')!.status).toBe('no_data');
  });

  it('用户替换首选后，原首选进入备选', () => {
    const r0 = routine({ concerns: ['acne'] });
    const c0 = r0.steps.find((s) => s.step.id === 'cleanser')!;
    const alt = c0.alternates[0].product.productId;
    const r1 = routine({ concerns: ['acne'] }, { picks: { cleanser: alt } });
    const c1 = r1.steps.find((s) => s.step.id === 'cleanser')!;
    expect(c1.primary!.product.productId).toBe(alt);
    expect(c1.alternates.map((x) => x.product.productId)).toContain(c0.primary!.product.productId);
  });

  it('整套预算：在预算内选；预算太低时明确说明，不放宽条件', () => {
    // 洁面 + 点涂 + 保湿 + 防晒（点涂 2026-10-27 导入后，最便宜的组合约 43 美元）
    const r = routine({ concerns: ['acne'], budget: 'set' }, { setBudgetUsd: 50 });
    expect(r.overBudget).toBe(false);
    const c = r.steps.find((s) => s.step.id === 'cleanser')!;
    expect(c.primary!.price.usd!).toBeLessThanOrEqual(50);
    expect(r.totalUsd).toBeLessThanOrEqual(50);
    const none = routine({ concerns: ['acne'], budget: 'set' }, { setBudgetUsd: 1 });
    expect(none.overBudget).toBe(true);
    expect(none.steps.find((s) => s.step.id === 'cleanser')!.primary).toBeNull();
  });
});
