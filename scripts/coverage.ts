// npm run coverage：统计洗发水、护发素在各需求 × 预算档位下可推荐的产品数量（含无香数量），
// 以及有同系列护发素的洗发水数量，写入 docs/COVERAGE.md。每次数据更新后重新运行。
// 口径见 src/scoring/coverage.ts。

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadDataFromDisk } from '../src/data/node';
import { computeBudgetCaps, type BudgetChoice } from '../src/scoring/budget';
import { TEST_MODE_DRAFT_SCORING } from '../src/scoring/config';
import { COVERAGE_BUDGETS, coverageCell, coverageGroups, shampoosWithPairedConditioner } from '../src/scoring/coverage';
import type { ScoringData } from '../src/scoring/score';

/** 少于此数的格子标红 */
const MIN_PER_CELL = 3;
const CATEGORIES = [
  { key: 'shampoo', zh: '洗发水' },
  { key: 'conditioner', zh: '护发素' },
] as const;
const GROUP_LABELS = { scalp: '头皮困扰', goals: '期望效果' } as const;

const d = loadDataFromDisk();
const budgetCaps = computeBudgetCaps(d.products, d.exchangeRates);
const data: ScoringData = { index: d.ingredientIndex, exchangeRates: d.exchangeRates, budgetCaps, allowDraft: TEST_MODE_DRAFT_SCORING };

const usd = (n: number) => `$${n.toFixed(2)}`;
function budgetLabel(category: string, b: BudgetChoice) {
  const caps = budgetCaps[category];
  if (b === 'none') return '不限';
  if (!caps) return b;
  if (b === 'q1') return `≤ ${usd(caps.q1)}`;
  if (b === 'q2') return `${usd(caps.q1)}–${usd(caps.q2)}`;
  if (b === 'q3') return `${usd(caps.q2)}–${usd(caps.q3)}`;
  return `${usd(caps.q3)} 以上`;
}

const out: string[] = [];
const gaps: string[] = [];
out.push(
  '# 数据覆盖表',
  '',
  '> 本文件由 `npm run coverage` 自动生成，请勿手改。每次更新 `data/` 下的数据后重新运行。',
  '',
  `生成时的数据：产品 ${d.products.length} 款。` +
    `打分模式：${TEST_MODE_DRAFT_SCORING ? '测试模式（未核对的成分也参与需求匹配）' : '正式模式（只用已核对成分）'}。`,
  '',
  '## 口径',
  '',
  '- **行**：问卷里用户可以明确选择的需求（头皮困扰、期望效果），每个选项一行；发丝状态、出油时间、发红、造型产品频率等题目不推导需求，不统计。头皮困扰只统计洗发水（护发素不针对头皮）；护发素不统计"清爽洁净"；"香味好闻"不对应需求，不统计。一个选项对应多个效果时（如"柔顺"对应毛躁和打结），按其中依据最好的一个计。',
  '- **列**：问卷的四个价格区间。界线按各品类产品价格的 25% / 50% / 75% 分位数自动计算，每个区间不含下界、含上界；"不限"为全部。',
  '- **可推荐**：美国市场的产品，用只含这一个需求、只选这一个价格区间的最简档案打分，没有被硬性过滤排除，且需求匹配分大于 0（至少有一项依据：成品测试、资料分类、品牌宣称或成分功能）。',
  '- **无香**：有无香声明，或成分表中没有发现香精、香料致敏原、只登记香料功能的成分和精油。',
  `- 🔴 标出少于 ${MIN_PER_CELL} 款的格子。格子写法：可推荐数（其中无香数）。`,
  '',
);

for (const cat of CATEGORIES) {
  out.push(`## ${cat.zh}`, '');
  out.push(`| 需求 | ${COVERAGE_BUDGETS.map((b) => budgetLabel(cat.key, b)).join(' | ')} |`);
  out.push(`|---|${COVERAGE_BUDGETS.map(() => '---:').join('|')}|`);
  for (const g of coverageGroups(cat.key)) {
    out.push(`| **${GROUP_LABELS[g.key]}** |${COVERAGE_BUDGETS.map(() => ' ').join('|')}|`);
    for (const n of g.needs) {
      const cells = COVERAGE_BUDGETS.map((b) => {
        const c = coverageCell(d.products, cat.key, n, b, data);
        const low = c.count < MIN_PER_CELL;
        if (low) gaps.push(`${cat.zh} · ${n.label.zh} · ${budgetLabel(cat.key, b)}：${c.count} 款`);
        return `${low ? '🔴 ' : ''}${c.count}（${c.fragranceFree}）`;
      });
      out.push(`| ${n.label.zh} | ${cells.join(' | ')} |`);
    }
  }
  out.push('');
}

const pairs = shampoosWithPairedConditioner(d.products);
out.push(
  '## 同系列护发素',
  '',
  `美国市场的洗发水 ${pairs.total} 款，其中 **${pairs.paired} 款**有同系列护发素（products.csv 的 paired_product_ids 中有护发素）。`,
  '',
  `有同系列护发素的洗发水：${pairs.ids.join('、') || '无'}`,
  '',
  `## 少于 ${MIN_PER_CELL} 款的格子（共 ${gaps.length} 个）`,
  '',
  ...(gaps.length ? gaps.map((g) => `- ${g}`) : ['无']),
  '',
);

const target = fileURLToPath(new URL('../docs/COVERAGE.md', import.meta.url));
writeFileSync(target, out.join('\n'));
console.log(`已写入 docs/COVERAGE.md：少于 ${MIN_PER_CELL} 款的格子 ${gaps.length} 个；有同系列护发素的洗发水 ${pairs.paired}/${pairs.total}`);
