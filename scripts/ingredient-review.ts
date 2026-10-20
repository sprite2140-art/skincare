// npm run ingredient-review：生成 docs/INGREDIENT_REVIEW.md，上线前的成分核对表。
// 只列影响打分的成分：有效成分（targets）、风险成分（risk_tags）、螯合剂清单和加香清单上的成分；基础成分不列。
// 每行附声称的作用、证据等级、来源链接和"核对结果"栏，按影响的产品数排序。

import { writeFileSync } from 'node:fs';
import { loadDataFromDisk } from '../src/data/node';
import { normalizeName } from '../src/data/ingredientIndex';
import type { Ingredient } from '../src/data/types';
import { IRRITANT_TAGS } from '../src/scoring/config';
import { RISK_TAG_LABELS, TARGET_LABELS } from '../src/scoring/labels';

const { products, ingredientIndex, lists, explanations } = loadDataFromDisk();

/** 清单（螯合剂、加香）上的来源也列出 */
const listSources = new Map<string, string>();
for (const e of [...lists.chelators, ...lists.fragrances]) listSources.set(normalizeName(e.inciName), e.sourceUrl);
const sourcesOf = (i: Ingredient) => {
  const extra = [i.inciName, ...i.aliases].map((n) => listSources.get(normalizeName(n))).find(Boolean);
  return [...new Set([...(extra ? [extra] : []), ...i.sources])];
};

/** 每个成分条目影响的产品（同一产品只算一次） */
const affected = new Map<Ingredient, Set<string>>();
for (const p of products) {
  for (const raw of p.inciList) {
    const ing = ingredientIndex.get(raw);
    if (!ing) continue;
    if (!affected.has(ing)) affected.set(ing, new Set());
    affected.get(ing)!.add(p.productId);
  }
}

const scoresActive = (i: Ingredient) => i.category === 'active' && i.targets.length > 0;
const relevant = (i: Ingredient) => scoresActive(i) || i.riskTags.length > 0 || !!i.chelator || !!i.fragranceListed;

/** 影响哪些打分维度 / 判断 */
function impact(i: Ingredient): string {
  const out: string[] = [];
  if (scoresActive(i)) out.push('需求匹配、证据强度');
  if (i.riskTags.some((t) => IRRITANT_TAGS.includes(t) || t === 'strong_cleanser')) out.push('刺激风险');
  if (i.riskTags.includes('fragrance') || i.riskTags.includes('essential_oil')) out.push('香味层级');
  if (i.riskTags.some((t) => t === 'pregnancy_caution' || t === 'rx_caution')) out.push('孕期 / 处方药提示');
  if (i.chelator) out.push('环境适配、产品残留');
  return out.join('；');
}

/** 声称的作用：针对的需求 + 风险标签 + 螯合剂 */
function claimed(i: Ingredient): string {
  const out: string[] = [];
  if (scoresActive(i)) out.push(`针对${i.targets.map((t) => TARGET_LABELS[t].zh).join('、')}`);
  for (const t of i.riskTags) out.push(RISK_TAG_LABELS[t].zh);
  if (i.euAllergen) out.push('欧盟香料致敏原');
  if (i.chelator) out.push('螯合剂（清单）');
  if (i.fragranceListed) out.push('加香（清单）');
  return out.join('；');
}

const SEARCH = 'pubmed.ncbi.nlm.nih.gov/?term=';
function sourceLink(s: string): string {
  const pmid = s.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
  if (pmid) return s.endsWith('/12396676/') ? `[CIR：EDTA 及其盐类安全评估（PMID 12396676）](${s})` : `[PMID ${pmid[1]}](${s})`;
  if (s.includes(SEARCH)) return `⚠️ [仅检索入口](${s})`;
  if (s.includes('ec.europa.eu/growth/tools-databases/cosing')) return `[CosIng](${s})`;
  try {
    return `[${new URL(s).hostname.replace(/^www\./, '')}](${s})`;
  } catch {
    return s;
  }
}

const cell = (s: string) => s.replace(/\|/g, '／') || '—';
const rows = [...affected]
  .filter(([ing]) => relevant(ing))
  .map(([ing, ids]) => ({ ing, count: ids.size }))
  .sort((a, b) => b.count - a.count || a.ing.inciName.localeCompare(b.ing.inciName));
const pending = rows.filter((r) => r.ing.reviewStatus !== 'verified');
const noSource = rows.filter((r) => sourcesOf(r.ing).length === 0);

/** 出现某成分的产品数（按成分条目合并不同写法） */
const explainedCount = (name: string) => {
  const ing = ingredientIndex.get(name);
  return ing ? affected.get(ing)?.size ?? 0 : 0;
};
const draftExplanations = explanations
  .filter((e) => e.reviewStatus !== 'verified')
  .sort((a, b) => b.draftedOn.localeCompare(a.draftedOn) || explainedCount(b.inciName) - explainedCount(a.inciName) || a.inciName.localeCompare(b.inciName));

const lines = [
  '# 成分核对表',
  '',
  '由 `npm run ingredient-review` 生成，请勿手改；数据更新后重新运行。核对结果请记在 data/ingredients.csv（review_status 改为 verified，填写 reviewed_on），再重新生成本表。',
  '',
  `只列影响打分的成分：有效成分（针对需求，影响需求匹配和证据强度）、风险成分（影响刺激风险、香味层级、孕期 / 处方药提示和想避开的成分）、螯合剂清单和加香清单上的成分。基础成分不列。`,
  `共 ${rows.length} 个，出现在 ${products.length} 个产品中；其中未核对 ${pending.length} 个。按影响的产品数排序。`,
  '',
  '核对时请逐项确认：中文名、声称的作用（针对的需求 / 风险标签）、证据等级（A / B / C）、有效浓度与法规限量、来源是否支持这些结论。',
  '"核对结果"栏留给核对人填写：✅ 通过 / ✏️ 需修改（写明改什么）/ ❌ 删除。',
  ...(noSource.length ? ['', `⚠️ 没有任何来源链接的 ${noSource.length} 个：${noSource.map((r) => r.ing.inciName).join('、')}。`] : []),
  '',
  '| 产品数 | 成分 | 中文名 | 声称的作用 | 影响 | 证据等级 | 有效浓度 / 限量 | 来源 | 状态 | 核对结果 |',
  '|---:|---|---|---|---|---|---|---|---|---|',
  ...rows.map(({ ing, count }) => [
    count,
    cell(ing.inciName),
    cell(ing.nameZh),
    cell(claimed(ing)),
    cell(impact(ing)),
    ing.evidenceLevel ?? '—',
    cell([ing.effectiveRange, ing.maxLimit].filter(Boolean).join('；')),
    sourcesOf(ing).map(sourceLink).join('<br>') || '—',
    ing.reviewStatus === 'verified' ? '已核对' : '未核对',
    ' ',
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
  '',
  '## 通俗解释待核对',
  '',
  `data/ingredient_explanations.csv 中起草、尚未核对的通俗解释共 ${draftExplanations.length} 条（卡片上只在 CosIng 成分的说明里显示，标为未核对）。按起草日期从新到旧、再按出现的产品数排序。核对后把 review_status 改为 verified。`,
  '',
  '| 起草日期 | 产品数 | 成分 | 中文解释 | 英文解释 | 核对结果 |',
  '|---|---:|---|---|---|---|',
  ...draftExplanations.map((e) => `| ${e.draftedOn || '—'} | ${explainedCount(e.inciName)} | ${cell(e.inciName)} | ${cell(e.explainZh)} | ${cell(e.explainEn)} |   |`),
  '',
];
writeFileSync(new URL('../docs/INGREDIENT_REVIEW.md', import.meta.url), lines.join('\n'));
console.log(`已写入 docs/INGREDIENT_REVIEW.md（${rows.length} 个影响打分的成分，未核对 ${pending.length} 个）`);
