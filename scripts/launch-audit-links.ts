// npm run launch-audit-links：上线审计第 3 项。逐个请求 purchase_links.csv 和 products.csv 的购买链接，
// 记录状态码，写入 docs/launch_audit_links.json。只读，不改数据。
// 分类：ok（2xx / 3xx）、not_found（404 / 410）、blocked（401 / 403 / 405 / 429 / 503，零售商常拦截脚本，
// 不能据此判断链接失效）、env_blocked（本环境的网络代理不允许访问这个网站，没有发出请求）、error（超时、连接失败等）。用 curl（经过环境代理），GET 请求，跟随跳转，单个 20 秒超时。

import { execFile } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { loadDataFromDisk } from '../src/data/node';

const d = loadDataFromDisk();
const byUrl = new Map<string, Set<string>>();
for (const p of d.products) {
  for (const u of [...p.purchaseLinks.map((l) => l.url), p.purchaseUrl].filter(Boolean)) {
    (byUrl.get(u) ?? byUrl.set(u, new Set()).get(u)!).add(p.productId);
  }
}
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const check = (url: string) => new Promise<{ code: number; error: string }>((resolve) => {
  execFile('curl', ['-sS', '-L', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '20', '-A', UA, url], { timeout: 30000 }, (err, stdout, stderr) => {
    const code = Number(stdout.trim()) || 0;
    resolve({ code, error: code ? '' : (stderr || String(err ?? '')).trim().split('\n')[0] });
  });
});
const classify = (code: number, error: string) =>
  /CONNECT tunnel failed/.test(error) ? 'env_blocked'
    : code >= 200 && code < 400 ? 'ok' : code === 404 || code === 410 ? 'not_found' : [401, 403, 405, 429, 503].includes(code) ? 'blocked' : 'error';

const urls = [...byUrl.keys()];
const results: { url: string; host: string; products: string[]; code: number; result: string; error: string }[] = [];
let next = 0;
await Promise.all(Array.from({ length: 12 }, async () => {
  while (next < urls.length) {
    const url = urls[next++];
    const { code, error } = await check(url);
    results.push({ url, host: new URL(url).hostname, products: [...byUrl.get(url)!].sort(), code, result: classify(code, error), error });
  }
}));
results.sort((a, b) => a.url.localeCompare(b.url));
writeFileSync('docs/launch_audit_links.json', JSON.stringify({ generatedBy: 'npm run launch-audit-links', checkedOn: new Date().toISOString().slice(0, 10), results }, null, 1));
const count = (r: string) => results.filter((x) => x.result === r).length;
console.log(`共 ${results.length} 个链接：正常 ${count('ok')}，404 / 410 ${count('not_found')}，被网站拦截 ${count('blocked')}，本环境代理不允许 ${count('env_blocked')}，其他错误 ${count('error')}`);
