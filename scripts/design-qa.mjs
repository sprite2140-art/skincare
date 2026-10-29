// 设计自查截图 + 自动检查（见 docs/DESIGN_QA.md）。
// 用法：先 npm run build && npx vite preview --port 4185，再
//   node scripts/design-qa.mjs docs/screenshots/<日期>-qa [http://localhost:4185]
// 需要 playwright-core（项目不依赖它，请临时安装：npm i --no-save playwright-core）。
// 浏览器路径用环境变量 CHROMIUM_PATH 指定，不指定时用 Playwright 默认浏览器。
// 截图为 2 倍分辨率；提交前可用 ImageMagick 压缩：convert in.png -strip -colors 256 PNG8:out.png

import { mkdirSync } from 'node:fs';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
const out = process.argv[2];
const base = process.argv[3] ?? 'http://localhost:4185';
if (!out) {
  console.error('用法：node scripts/design-qa.mjs <输出目录> [网址]');
  process.exit(1);
}
mkdirSync(out, { recursive: true });

// 与 src/pages/DesignQA.tsx 的 QA_CASES 一致
const allIds = ['all-met', 'partial', 'none', 'no-evidence', 'no-rating', 'long-name', 'unverified', 'routine', 'labeled-plants', 'skin-minimal', 'skin-full', 'skin-sensitive', 'skin-rx', 'skin-sunscreen-missing', 'skin-sunscreen-stock'];
// QA_IDS=skin-minimal,skin-full 只截指定案例
const ids = process.env.QA_IDS ? process.env.QA_IDS.split(',') : allIds;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const report = [];
for (const lang of ['zh', 'en']) {
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, locale: lang === 'zh' ? 'zh-CN' : 'en-US' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(base + '/');
    await page.evaluate((l) => localStorage.setItem('skincare.lang', l), lang);
    for (const state of ['collapsed', 'expanded']) {
      await page.goto(base + '/qa' + (state === 'expanded' ? '?open=1' : ''));
      await page.addStyleTag({ content: 'header, .topbar, nav { position: static !important; }' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      for (const id of ids) {
        await page.locator(`#case-${id}`).screenshot({ path: `${out}/${id}-${width}-${lang}-${state}.png` });
      }
      // 自动检查：最小字号、连续两个冒号、中文界面的中英文空格、内部字段名、表格维度名折行
      const check = await page.evaluate((lang) => {
        const text = [...document.querySelectorAll('.qa-case article')].map((e) => e.innerText).join('\n');
        const fonts = [...document.querySelectorAll('.qa-case article *')]
          .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
          .map((e) => parseFloat(getComputedStyle(e).fontSize));
        const wrapped = [...document.querySelectorAll('.qa-case .tbl.bd .tbl-name')].filter((e) => {
          const rg = document.createRange();
          rg.selectNodeContents(e);
          return new Set([...rg.getClientRects()].map((r) => Math.round(r.top))).size > 1;
        });
        return {
          minFont: Math.min(...fonts),
          doubleColon: (text.match(/[：:][^\n]{0,12}[：:]/g) || []).filter((s) => !/https?:/.test(s)).slice(0, 5),
          noSpace: lang === 'zh' ? (text.match(/[㐀-鿿][A-Za-z0-9]|[A-Za-z0-9][㐀-鿿]/g) || []).slice(0, 10) : [],
          fieldNames: (text.match(/\b[a-z]+_[a-z_]+\b/g) || []).slice(0, 5),
          wrappedNames: wrapped.map((e) => e.innerText).slice(0, 5),
        };
      }, lang);
      report.push({ lang, width, state, overflow, ...check });
    }
    await ctx.close();
  }
}
await browser.close();

const problems = report.filter((r) => r.overflow || r.minFont < 13 || r.doubleColon.length || r.noSpace.length || r.fieldNames.length || r.wrappedNames.length);
console.log(JSON.stringify(problems.length ? problems : report.map(({ lang, width, state, minFont }) => ({ lang, width, state, minFont })), null, 1));
if (errors.length) console.log('页面错误：', errors);
console.log(problems.length || errors.length ? '有问题，见上' : `通过：${report.length} 组 × ${ids.length} 个案例，截图在 ${out}`);
process.exit(problems.length || errors.length ? 1 : 0);
