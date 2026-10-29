// npm run test-mode-impact：关闭测试模式（TEST_MODE_DRAFT_SCORING = false）后，有多少产品会因成分未核对而受影响。
// "受影响"指产品里至少有一个未核对、且会参与打分的成分（有效成分、风险成分，含 CosIng 识别出的加香成分）：
// 关闭测试模式后，未核对的有效成分不加分，卡片显示"有 N 个成分暂无数据"；未核对的风险成分照常扣分，卡片注明"成分数据未核对"。
// 基础成分不需要人工核对，不算。
// 另外按"没有选需求"的档案打分，统计温和度分数会变化的产品数。
// 加 --list 时逐个列出受影响的产品、涉及的成分，以及温和度分数是否会变化。
// 最后列出各品类可推荐的数量（测试模式开 / 关）：美国市场、入库依据齐全、不是儿童产品，
// 按"没有选需求"的档案打分后没有被排除、能打分（防晒另外要求 SPF 和广谱信息齐全），与结果页的"可推荐"一组相同。

import { loadDataFromDisk } from '../src/data/node';
import { computeBudgetCaps } from '../src/scoring/budget';
import { rankProducts, scoreProduct, type ScoringProfile } from '../src/scoring/score';
import { faceScoringProfile, rankFaceStep } from '../src/scoring/faceScore';
import { STEP_CATEGORY, type FaceStep, type FaceStepId } from '../src/scoring/faceSteps';
import { EMPTY_FACE } from '../src/profile/faceQuestionnaire';
import { filterByMarket } from '../src/scoring/market';
import type { Ingredient } from '../src/data/types';

const real = loadDataFromDisk();
const list = process.argv.includes('--list');
const caps = computeBudgetCaps(real.products, real.exchangeRates);
const data = (allowDraft: boolean) => ({ index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: caps, allowDraft });
const neutral: ScoringProfile = {
  concerns: [], concernsRanked: false, sensitive: false, specialStatus: 'none', avoidIngredients: [], avoidTags: [],
  budget: 'none', fragrancePref: null, washFrequency: null, city: null, inUseProducts: [],
};

/** 会参与打分、但还没核对的成分 */
const pending = (i: Ingredient | undefined): i is Ingredient => !!i && i.category !== 'base' && i.reviewStatus !== 'verified';

for (const [label, zone] of [['洗护', (z: string) => z !== 'face'], ['护肤', (z: string) => z === 'face']] as const) {
  const products = real.products.filter((p) => zone(p.zone));
  const byIngredient = new Map<string, Set<string>>();
  let affected = 0;
  let gentleChanged = 0;
  const lines: string[] = [];
  for (const p of products) {
    const hits = p.inciList.filter((raw) => !p.inciNameUnverified.includes(raw)).map((raw) => real.ingredientIndex.get(raw)).filter(pending);
    if (hits.length > 0) affected++;
    for (const i of hits) byIngredient.set(i.inciName, (byIngredient.get(i.inciName) ?? new Set()).add(p.productId));
    const on = scoreProduct(p, neutral, data(true)).dimensions.irritation.score;
    const off = scoreProduct(p, neutral, data(false)).dimensions.irritation.score;
    if (on !== off) gentleChanged++;
    if (hits.length > 0) {
      const names = [...new Set(hits.map((i) => i.inciName))].join('、');
      lines.push(`  ${p.productId} ${p.brand} ${p.nameEn}：${names}${on !== off ? `（温和度 ${on} → ${off}）` : ''}`);
    }
  }
  console.log(`${label}：共 ${products.length} 款，受影响 ${affected} 款（${Math.round((affected / Math.max(products.length, 1)) * 100)}%），其中温和度分数会变化 ${gentleChanged} 款`);
  const top = [...byIngredient].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));
  console.log(`  涉及未核对成分 ${top.length} 个：${top.map(([n, s]) => `${n}（${s.size}）`).join('、')}`);
  if (list) console.log(lines.join('\n'));
}

console.log('各品类可推荐数量（美国市场；测试模式开 → 关）：');
const us = filterByMarket(real.products, 'US', false).shown;
for (const [label, cat] of [['洗发水', 'shampoo'], ['护发素', 'conditioner']] as const) {
  const ok = (draft: boolean) => rankProducts(us, cat, neutral, data(draft)).filter((s) => !s.excluded && s.score !== null).length;
  console.log(`  ${label}：共 ${us.filter((p) => p.category === cat).length} 款，可推荐 ${ok(true)} → ${ok(false)}`);
}
const FACE_LABELS: Record<FaceStepId, string> = {
  cleanser: '洁面', treatment: '精华', spot: '点涂', exfoliator: '去角质', moisturizer: '保湿', sunscreen: '防晒',
};
for (const id of Object.keys(STEP_CATEGORY) as FaceStepId[]) {
  const step: FaceStep = { id, category: STEP_CATEGORY[id], tier: 'optional', needs: [], becauseOf: [], weekly: false };
  const profile = faceScoringProfile(EMPTY_FACE, step, { specialStatus: 'none', avoidIngredients: [], avoidTags: [] });
  const ok = (draft: boolean) => rankFaceStep(us, profile, data(draft), { face: EMPTY_FACE, step, classes: real.faceActiveClasses }).ranked
    .filter((s) => !s.excluded && s.score !== null && s.faceExtras.sunscreen !== 'incomplete').length;
  console.log(`  ${FACE_LABELS[id]}：共 ${us.filter((p) => p.category === step.category).length} 款，可推荐 ${ok(true)} → ${ok(false)}`);
}
