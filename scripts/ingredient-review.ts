// npm run ingredient-review：生成 docs/INGREDIENT_REVIEW.md，列出待人工核对的有效成分和风险成分（按出现频率排序）。
// 基础成分不需要人工核对，不列入。

import { writeFileSync } from 'node:fs';
import { buildIngredientIndex } from '../src/data/ingredientIndex';
import { ingredientFrequency } from '../src/data/frequency';
import { loadDataFromDisk } from '../src/data/node';

const { ingredients, products } = loadDataFromDisk();
const index = buildIngredientIndex(ingredients);
const counts = new Map(ingredientFrequency(products, index).map((r) => [r.name, r.productCount]));
const pending = ingredients
  .filter((i) => i.category !== 'base' && i.reviewStatus !== 'verified')
  .map((i) => ({ ing: i, count: counts.get(i.inciName) ?? 0 }))
  .sort((a, b) => b.count - a.count || a.ing.inciName.localeCompare(b.ing.inciName));

const cell = (s: string) => s.replace(/\|/g, '／') || '—';
const lines = [
  '# 成分核对清单',
  '',
  '由 `npm run ingredient-review` 生成，请勿手改；数据更新后重新运行。',
  '',
  `待核对的有效成分和风险成分共 ${pending.length} 个（基础成分不需要人工核对）。按在 ${products.length} 个产品中出现的次数排序。`,
  '核对时请逐项确认：中文名、针对的困扰（targets）、证据等级、风险标签、有效浓度与法规限量，以及来源链接。sources 中的 PubMed 链接是检索入口，需要找到具体文献替换。',
  '核对通过后，在 data/ingredients.csv 中把 review_status 改为 verified，并填写 reviewed_on。',
  '',
  '| 产品数 | 成分 | 中文名 | 类别 | 针对 | 证据 | 风险标签 | 有效浓度 / 限量 |',
  '|---|---|---|---|---|---|---|---|',
  ...pending.map(({ ing, count }) =>
    `| ${count} | ${cell(ing.inciName)} | ${cell(ing.nameZh)} | ${ing.category} | ${cell(ing.targets.join(', '))} | ${ing.evidenceLevel ?? '—'} | ${cell(ing.riskTags.join(', '))} | ${cell([ing.effectiveRange, ing.maxLimit].filter(Boolean).join('；'))} |`,
  ),
  '',
];
writeFileSync(new URL('../docs/INGREDIENT_REVIEW.md', import.meta.url), lines.join('\n'));
console.log(`已写入 docs/INGREDIENT_REVIEW.md（${pending.length} 个待核对成分）`);
