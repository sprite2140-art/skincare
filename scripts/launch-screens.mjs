// 上线审计第 4 项：中英文界面各截 390px 宽度的首页、洗护问卷、护肤问卷、护肤结果页、洗护结果页、展开的产品卡、关于页，
// 并把每页的可见文字写到 <输出目录>/text-<语言>-<页面>.txt，供检查英文界面里的中文、中文界面里未翻译的英文和内部字段名。
// 用法：npm run build && npx vite preview --port 4185，再 node scripts/launch-screens.mjs docs/screenshots/launch
// 需要 playwright-core（npm i --no-save playwright-core）；浏览器路径用 CHROMIUM_PATH 指定。

import { mkdirSync, writeFileSync } from 'node:fs';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
const out = process.argv[2];
const base = process.argv[3] ?? 'http://localhost:4185';
mkdirSync(out, { recursive: true });

// 固定档案：纽约；洗护：洗护都买、头皮屑、期望柔顺；护肤：混合肌、偶尔敏感、痘痘 + 细纹
const profile = {
  id: 'audit', name: 'Audit',
  base: { cityKey: 'New York, US', scope: 'set', budgetMode: 'item', budgets: {}, customBudgets: {}, setBudget: null, specialStatus: 'none', specialStatuses: [], avoid: [], avoidIngredients: [] },
  scalp: { oilTiming: 'next_day', concerns: ['dandruff'], washFrequency: 'every_other_day', dandruffType: 'dry_fine', dandruffAmount: 2 },
  hair: { thickness: 'medium', texture: 'straight', conditions: [], goals: ['smooth'], fragrancePref: null, hasConditioner: 'none', carePref: 'simple' },
  face: { skinType: 'combination', sensitivity: 'sometimes', concerns: ['acne', 'aging'], noConcerns: false, acneSeverity: 'occasional', makeup: 'sometimes', outdoor: '30m_2h', sweat: 'rarely', budget: 'none', setBudget: null },
  inUseProductIds: [], updatedAt: '2026-10-29T00:00:00.000Z',
};
const store = { version: 1, activeId: 'audit', profiles: [profile] };

const pages = [
  ['home', '/'], ['hair-quiz', '/quiz'], ['skin-quiz', '/skin/quiz'], ['skin-results', '/skin'], ['hair-results', '/results'], ['card', '/results'], ['about', '/about'],
];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const lang of ['zh', 'en']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: lang === 'zh' ? 'zh-CN' : 'en-US' });
  const page = await ctx.newPage();
  await page.goto(base + '/');
  await page.evaluate(([l, s]) => { localStorage.setItem('skincare.lang', l); localStorage.setItem('skincare.profiles', s); }, [lang, JSON.stringify(store)]);
  for (const [name, path] of pages) {
    await page.goto(base + path);
    await page.waitForTimeout(400);
    let target = page;
    if (name === 'card') {
      // 展开结果页第一张产品卡；截单个元素时固定顶栏会盖住卡片，改为不固定
      await page.addStyleTag({ content: 'header, .topbar, nav { position: static !important; }' });
      const card = page.locator('article.product').first();
      await card.locator('button', { hasText: lang === 'zh' ? '详情' : 'Details' }).first().click();
      await page.waitForTimeout(300);
      await card.screenshot({ path: `${out}/${lang}-390-${name}.png` });
      writeFileSync(`${out}/text-${lang}-${name}.txt`, await card.innerText());
      continue;
    }
    await target.screenshot({ path: `${out}/${lang}-390-${name}.png`, fullPage: true });
    writeFileSync(`${out}/text-${lang}-${name}.txt`, await page.locator('body').innerText());
  }
  await ctx.close();
}
await browser.close();
console.log('截图和文字写入', out);
