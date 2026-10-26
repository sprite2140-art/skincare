// npm run verify-list-ingredients [-- --apply]
// 规则清单类成分（香精、精油、酒精、强清洁力表活、致敏防腐剂、螯合剂、欧盟香料致敏原）的自动核对。
//
// 做法：对照官方原文确认每个成分确实在对应清单里。
// - 欧盟香料致敏原：按本地官方原文逐条核对的记录 data/eu_allergen_checks.csv
//   （修订法规 (EU) 2023/1545 原文 PDF 在 docs/sources/eu_2023_1545.pdf；法规 1223/2009 合并版在 docs/sources/eu_1223_2009_consolidated.pdf，均为作者提供）。
//   PDF 表格各列在文本提取时会交错，自动查找容易误判（如"6-Methyl Coumarin"含"Coumarin"），
//   所以按 PDF 的附录表格逐条记下条目号和"Common Ingredients Glossary"名称。
//   2023/1545 只替换了附录 III 的部分条目并新增了一批；没有替换的原条目要用法规 1223/2009 附录 III 合并版原文核对，
//   在那之前记为"无法核对"，不用本项目自己的清单代替。
// - 其余各类：欧盟委员会 CosIng 官方导出 data/cosing_export_2026-10-17.csv（作者 2026-10-17 获取；
//   CosIng 网站本身是网页应用，没有固定的 CSV 下载地址，更新时用 npm run import-cosing 换新的导出），按登记功能核对。
// - 强清洁力表活、致敏防腐剂、酒精：CosIng 只能确认是表活 / 防腐剂 / 溶剂，"强清洁力""致敏""会让皮肤变干"是本项目的判断，
//   还要有 CosIng 以外的文献出处（sources）才算通过；没有时记为"无法核对"，保持未核对。
// 通过的成分写入 docs/LIST_VERIFICATION.md；加 --apply 时，在 data/ingredients.csv 中标为已核对，
// notes 写明核对依据。对不上的只列出，不改数据。

import { readFileSync, writeFileSync } from 'node:fs';
import Papa from 'papaparse';
import { loadDataFromDisk } from '../src/data/node';
import { parseCosingExport, type CosingEntry } from '../src/data/cosing';
import { normalizeName } from '../src/data/ingredientIndex';
import type { Ingredient } from '../src/data/types';

const APPLY = process.argv.includes('--apply');
const TODAY = new Date().toISOString().slice(0, 10);
const LOCAL_COSING = 'data/cosing_export_2026-10-17.csv';
const LOCAL_COSING_DATE = '2026-10-17';

/** 欧盟香料致敏原的逐条核对记录（data/eu_allergen_checks.csv） */
interface AllergenCheck {
  inciName: string;
  status: 'found' | 'not_in_document';
  document: string;
  entry: string;
  glossaryName: string;
  note: string;
}

function readAllergenChecks(): Map<string, AllergenCheck> {
  const rows = Papa.parse<Record<string, string>>(readFileSync('data/eu_allergen_checks.csv', 'utf8'), { header: true, skipEmptyLines: true }).data;
  return new Map(rows.map((r) => [normalizeName(r.inci_name), {
    inciName: r.inci_name, status: r.status as AllergenCheck['status'], document: r.document, entry: r.entry, glossaryName: r.glossary_name, note: r.note,
  }]));
}

type ListKind = 'fragrance' | 'eu_allergen' | 'essential_oil' | 'alcohol' | 'strong_cleanser' | 'preservative' | 'chelator';

const KIND_LABEL: Record<ListKind, string> = {
  fragrance: '加香成分',
  eu_allergen: '欧盟香料致敏原',
  essential_oil: '精油',
  alcohol: '酒精',
  strong_cleanser: '强清洁力表活',
  preservative: '致敏防腐剂',
  chelator: '螯合剂',
};

/** 每类的核对规则：CosIng 登记功能里要有其中一项 */
const COSING_RULE: Partial<Record<ListKind, { functions: string[]; extra?: (ing: Ingredient) => boolean; describe: string }>> = {
  fragrance: { functions: ['perfuming', 'fragrance'], describe: 'CosIng 登记功能含香料（PERFUMING）' },
  essential_oil: { functions: ['perfuming', 'fragrance'], extra: (i) => /\boil\b/i.test(i.inciName), describe: 'CosIng 登记功能含香料（PERFUMING），INCI 名为植物油' },
  alcohol: { functions: ['solvent', 'antimicrobial', 'antifoaming'], describe: 'CosIng 收录该 INCI，登记功能含溶剂（SOLVENT），"会让皮肤变干"有文献出处（见 sources）' },
  strong_cleanser: { functions: ['surfactant - cleansing', 'cleansing'], describe: 'CosIng 登记功能含清洁型表活（SURFACTANT - CLEANSING），"强清洁力"有文献出处（见 sources）' },
  preservative: { functions: ['preservative'], describe: 'CosIng 登记功能含防腐（PRESERVATIVE），"致敏"有文献出处（见 sources）' },
  chelator: { functions: ['chelating'], describe: 'CosIng 登记功能含螯合（CHELATING）' },
};

/** 这几类是本项目的判断，除了 CosIng 功能，还要有 CosIng 以外的文献出处 */
const NEEDS_LITERATURE: ListKind[] = ['strong_cleanser', 'preservative', 'alcohol'];
const hasLiterature = (i: Ingredient) => i.sources.some((s) => /^https?:\/\//.test(s) && !s.includes('tools-databases/cosing'));

interface Check {
  ing: Ingredient;
  kind: ListKind;
  ok: boolean | null;
  detail: string;
}

async function main() {
  const real = loadDataFromDisk();

  // CosIng：本地官方导出（CosIng 网站没有固定的 CSV 下载地址）
  const cosingSource = `CosIng 官方导出（${LOCAL_COSING_DATE}，${LOCAL_COSING}）`;
  const cosing: CosingEntry[] = parseCosingExport(readFileSync(LOCAL_COSING, 'utf8'));
  if (cosing.length < 10000) throw new Error(`CosIng 导出只解析出 ${cosing.length} 条，文件可能不完整`);
  const cosingBy = new Map(cosing.map((c) => [normalizeName(c.inciName), c]));

  // 欧盟香料致敏原：本地官方原文的逐条核对记录
  const allergenChecks = readAllergenChecks();

  const allergenNames = new Set(real.allergens.map((a) => normalizeName(a.inciName)));
  const chelatorNames = new Set(real.lists.chelators.map((c) => normalizeName(c.inciName)));
  const names = (i: Ingredient) => [i.inciName, ...i.aliases];
  const kindsOf = (i: Ingredient): ListKind[] => {
    const out: ListKind[] = [];
    if (i.riskTags.includes('fragrance')) out.push('fragrance');
    if (names(i).some((n) => allergenNames.has(normalizeName(n)))) out.push('eu_allergen');
    if (i.riskTags.includes('essential_oil')) out.push('essential_oil');
    if (i.riskTags.includes('alcohol')) out.push('alcohol');
    if (i.riskTags.includes('strong_cleanser')) out.push('strong_cleanser');
    if (i.riskTags.includes('sensitizer') && i.functions.includes('preservative')) out.push('preservative');
    if (i.functions.includes('chelating') || names(i).some((n) => chelatorNames.has(normalizeName(n)))) out.push('chelator');
    return out;
  };

  const checks: Check[] = [];
  for (const ing of real.ingredients) {
    for (const kind of kindsOf(ing)) {
      if (kind === 'eu_allergen') {
        const rec = names(ing).map((n) => allergenChecks.get(normalizeName(n))).find(Boolean);
        if (!rec || rec.status !== 'found') {
          checks.push({ ing, kind, ok: null, detail: rec ? `法规原文（${rec.document}）中没有这一条目：${rec.note}；未核对` : '没有核对记录（data/eu_allergen_checks.csv），未核对' });
          continue;
        }
        checks.push({ ing, kind, ok: true, detail: `${rec.document.includes('1223') ? '法规 1223/2009 合并版附录 III' : '法规 2023/1545 附录'}（${rec.document}）条目 ${rec.entry}，Common Ingredients Glossary 名称为 ${rec.glossaryName}` });
        continue;
      }
      const rule = COSING_RULE[kind]!;
      const entry = names(ing).map((n) => cosingBy.get(normalizeName(n))).find(Boolean);
      if (!entry) {
        checks.push({ ing, kind, ok: false, detail: 'CosIng 中没有这个 INCI 名' });
        continue;
      }
      const fnOk = rule.functions.some((f) => entry.functions.includes(f));
      const extraOk = rule.extra ? rule.extra(ing) : true;
      if (fnOk && extraOk && NEEDS_LITERATURE.includes(kind) && !hasLiterature(ing)) {
        checks.push({ ing, kind, ok: null, detail: `CosIng 登记功能相符（CosIng ${entry.ref}），但"${KIND_LABEL[kind]}"是本项目的判断，sources 里没有 CosIng 以外的文献出处，未核对` });
        continue;
      }
      checks.push({
        ing, kind, ok: fnOk && extraOk,
        detail: fnOk && extraOk
          ? `${rule.describe}（CosIng ${entry.ref}）`
          : `CosIng 登记功能为：${entry.functions.join('、') || '（空）'}${extraOk ? '' : '；INCI 名不是植物油'}`,
      });
    }
  }

  // 一个成分的所有核对都通过才算通过；有一项无法核对就不标
  const byIng = new Map<Ingredient, Check[]>();
  for (const c of checks) byIng.set(c.ing, [...(byIng.get(c.ing) ?? []), c]);
  const passed = [...byIng].filter(([, cs]) => cs.every((c) => c.ok === true)).map(([i]) => i);
  const failed = [...byIng].filter(([, cs]) => cs.some((c) => c.ok === false));
  const pending = [...byIng].filter(([, cs]) => !cs.some((c) => c.ok === false) && cs.some((c) => c.ok === null));

  const cell = (s: string) => s.replace(/\|/g, '／');
  const lines = [
    '# 规则清单类成分核对',
    '',
    `由 \`npm run verify-list-ingredients\` 生成（${TODAY}），请勿手改。`,
    '',
    `核对依据：${cosingSource}；欧盟香料致敏原：法规 2023/1545 官方原文（docs/sources/eu_2023_1545.pdf）和 1223/2009 合并版（docs/sources/eu_1223_2009_consolidated.pdf）的逐条记录 data/eu_allergen_checks.csv。`,
    '',
    `共 ${byIng.size} 个成分：通过 ${passed.length} 个，对不上 ${failed.length} 个，无法核对 ${pending.length} 个。`,
    '一个成分属于多个清单时，每项都通过才算通过。',
    '',
    '| 成分 | 清单 | 结果 | 依据 / 说明 | 原状态 |',
    '|---|---|---|---|---|',
    ...checks
      .sort((a, b) => Number(a.ok === true) - Number(b.ok === true) || a.ing.inciName.localeCompare(b.ing.inciName))
      .map((c) => `| ${cell(c.ing.inciName)} | ${KIND_LABEL[c.kind]} | ${c.ok === true ? '✅ 通过' : c.ok === false ? '❌ 对不上' : '⏸ 无法核对'} | ${cell(c.detail)} | ${c.ing.reviewStatus === 'verified' ? '已核对' : '未核对'} |`),
    '',
  ];
  writeFileSync('docs/LIST_VERIFICATION.md', lines.join('\n'));
  console.log(`通过 ${passed.length}，对不上 ${failed.length}，无法核对 ${pending.length}；已写入 docs/LIST_VERIFICATION.md`);
  for (const [i, cs] of failed) console.log(`  对不上：${i.inciName}：${cs.filter((c) => c.ok === false).map((c) => `${KIND_LABEL[c.kind]}（${c.detail}）`).join('；')}`);

  if (!APPLY) return;
  // 只改通过的、原来未核对的行；逐行改写，其他行保持原样
  const toVerify = new Map(passed.filter((i) => i.reviewStatus !== 'verified').map((i) => [i.inciName, byIng.get(i)!]));
  const text = readFileSync('data/ingredients.csv', 'utf8');
  const rows = text.split('\n');
  const header = Papa.parse<string[]>(rows[0]).data[0];
  const col = (n: string) => header.indexOf(n);
  let changed = 0;
  for (let k = 1; k < rows.length; k++) {
    if (!rows[k]) continue;
    const cells = Papa.parse<string[]>(rows[k]).data[0];
    const cs = toVerify.get(cells[col('inci_name')]);
    if (!cs) continue;
    cells[col('review_status')] = 'verified';
    cells[col('reviewed_on')] = TODAY;
    const why = `规则清单自动核对（${TODAY}，scripts/verify-list-ingredients.ts）：${cs.map((c) => `${KIND_LABEL[c.kind]}，${c.detail}`).join('；')}`;
    cells[col('notes')] = cells[col('notes')] ? `${cells[col('notes')]} ${why}` : why;
    rows[k] = Papa.unparse([cells], { newline: '' });
    changed++;
  }
  writeFileSync('data/ingredients.csv', rows.join('\n'));
  console.log(`已在 data/ingredients.csv 中标为已核对：${changed} 个`);
}

main().catch((e) => { console.error(e); process.exit(1); });
