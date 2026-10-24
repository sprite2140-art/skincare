// npm run test-mode-impact：关闭测试模式（TEST_MODE_DRAFT_SCORING = false）后，有多少产品会因成分未核对而受影响。
// "受影响"指产品里至少有一个未核对、且会参与打分的成分（有效成分、风险成分，含 CosIng 识别出的加香成分）：
// 关闭测试模式后这些成分不再计分，卡片改为"有 N 个成分暂无数据"。基础成分不需要人工核对，不算。
// 另外按"没有选需求"的档案打分，统计温和度分数会变化的产品数。
// 加 --list 时逐个列出受影响的产品、涉及的成分，以及温和度分数是否会变化。

import { loadDataFromDisk } from '../src/data/node';
import { computeBudgetCaps } from '../src/scoring/budget';
import { scoreProduct, type ScoringProfile } from '../src/scoring/score';
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
