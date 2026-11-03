// 2026-11-03 推荐不足的说明：中英文 390px 截图。
// 1) 只选"清爽洁净"时的护发素列表；2) 洗发水最低档预算 + 去橙（为空，列出原因，点开"稍高预算"）；
// 3) 护肤最低档预算 + 容易出油（去角质为空、洁面和保湿少于 3 款，点开"稍高预算"）。
// 用法：npm run build && npx vite preview --port 4185，再 node scripts/shortfall-screens.mjs <输出目录>
// 需要 playwright（或 PLAYWRIGHT_CORE 指定 playwright-core）。

import { mkdirSync, writeFileSync } from 'node:fs';

const pw = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright');
const { chromium } = pw.chromium ? pw : pw.default;
const out = process.argv[2];
const base = process.argv[3] ?? 'http://localhost:4185';
mkdirSync(out, { recursive: true });

const mk = (hair, budget, face) => ({
  id: 'qa', name: 'QA',
  base: { cityKey: 'New York, US', scope: 'set', budgetMode: 'item', budgets: { shampoo: budget, conditioner: budget }, customBudgets: {}, setBudget: null, specialStatus: 'none', specialStatuses: [], avoid: [], avoidIngredients: [] },
  scalp: { oilTiming: 'next_day', concerns: [], noConcerns: true, washFrequency: 'every_other_day' },
  hair: { thickness: 'medium', texture: 'straight', conditions: hair.conditions ?? [], goals: hair.goals, fragrancePref: null, hasConditioner: 'none', carePref: 'simple' },
  face: { skinType: 'combination', sensitivity: 'rarely', concerns: face, noConcerns: face.length === 0, acneSeverity: null, makeup: 'sometimes', outdoor: '30m_2h', sweat: 'rarely', budget, setBudget: null },
  inUseProductIds: [], updatedAt: '2026-11-03T00:00:00.000Z',
});
const cases = [
  { name: 'clean-conditioner', profile: mk({ goals: ['clean'] }, 'none', []), path: '/results', tab: 1, firstScreen: true },
  { name: 'tone-orange-q1', profile: mk({ goals: ['tone_orange'], conditions: ['colored'] }, 'q1', []), path: '/results', tab: 0, more: true },
  { name: 'skin-oil-q1', profile: mk({ goals: [] }, 'q1', ['oil']), path: '/skin', pm: true, more: true },
];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const lang of ['zh', 'en']) {
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: lang === 'zh' ? 'zh-CN' : 'en-US' });
    const page = await ctx.newPage();
    await page.goto(base + '/');
    await page.evaluate(([l, s]) => { localStorage.setItem('skincare.lang', l); localStorage.setItem('skincare.profiles', s); }, [lang, JSON.stringify({ version: 1, activeId: 'qa', profiles: [c.profile] })]);
    await page.goto(base + c.path);
    await page.waitForTimeout(400);
    if (c.tab !== undefined) await page.locator('[role=tab]').nth(c.tab).click();
    if (c.pm) await page.locator('[role=tab]').nth(1).click();
    await page.waitForTimeout(200);
    // 护发素列表很长，只截第一屏（说明在列表上方）
    await page.screenshot({ path: `${out}/${c.name}-390-${lang}.png`, fullPage: !c.firstScreen });
    if (c.more) {
      const buttons = page.locator('button[aria-expanded=false]', { hasText: lang === 'zh' ? '稍高预算' : 'higher budget' });
      const n = await buttons.count();
      for (let i = 0; i < n; i++) await buttons.first().click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/${c.name}-390-${lang}-more.png`, fullPage: true });
    }
    writeFileSync(`${out}/text-${c.name}-${lang}.txt`, await page.locator('main').innerText());
    await ctx.close();
  }
}
await browser.close();
console.log('截图写入', out);
