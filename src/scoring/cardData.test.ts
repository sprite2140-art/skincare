import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import type { Product } from '../data/types';
import { hasAntiDandruffActive, irritantKinds, keyIngredients, platformOf, primaryStore, storeRows, topRating } from './cardData';

const real = loadDataFromDisk();
const index = real.ingredientIndex;
const byId = (id: string) => real.products.find((p) => p.productId === id)!;

describe('卡片：评分行与购买渠道', () => {
  it('评分行只取评价数最多的平台（不跨平台平均），低于门槛的不算', () => {
    // SH-US-002：Ulta 11 条（不显示）、Target 1,554、Amazon 6,395 → Amazon
    expect(topRating(byId('SH-US-002'))?.platform).toBe('amazon');
    // SH-US-001：Ulta 19 条不显示 → Target
    expect(topRating(byId('SH-US-001'))?.platform).toBe('target');
    expect(topRating(byId('SH-US-048'))).toBeNull();
  });

  it('其他网站显示站名', () => {
    expect(platformOf('https://www.walgreens.com/store/c/x')).toEqual({ platform: 'other', host: 'Walgreens' });
    expect(platformOf('https://www.amazon.com/dp/X').platform).toBe('amazon');
    expect(platformOf('not a url')).toEqual({ platform: 'other', host: '' });
  });

  it('在哪买：每个平台一行，按固定顺序；评价少于门槛的标为 lowCount，不显示分数', () => {
    const rows = storeRows(byId('SH-US-001'));
    expect(rows.map((r) => r.platform)).toEqual(['brand', 'ulta', 'target', 'amazon']);
    const ulta = rows.find((r) => r.platform === 'ulta')!;
    expect(ulta.rating).toBeNull();
    expect(ulta.lowCount).toBe(true);
    expect(rows.find((r) => r.platform === 'target')!.rating?.rating).toBeCloseTo(4.55);
    const amazon = rows.find((r) => r.platform === 'amazon')!;
    expect(amazon.rating).toBeNull();
    expect(amazon.lowCount).toBe(false);
  });

  it('主购买按钮默认指向评价数最多的平台；没有评分时用产品表的 purchase_url', () => {
    expect(primaryStore(byId('SH-US-002'))?.platform).toBe('amazon');
    const sparse = byId('SH-US-048');
    const primary = primaryStore(sparse)!;
    expect(primary.url).toBe(sparse.purchaseUrl);
    expect(primary.host).toBe('Walgreens');
  });

  it('产品表的 purchase_url 不在购买链接里时补成一行，其他网站排在最后', () => {
    const p: Product = { ...byId('SH-US-001'), purchaseUrl: 'https://www.walgreens.com/x' };
    const rows = storeRows(p);
    expect(rows.at(-1)).toMatchObject({ platform: 'other', host: 'Walgreens', url: 'https://www.walgreens.com/x' });
  });
});

describe('卡片：关键成分与温和度', () => {
  it('最多 5 个；顺序为针对需求的有效成分 → 螯合剂 → 需要注意的成分；香精不写成"香精 · 香精"', () => {
    const k = keyIngredients(byId('SH-US-048'), index, ['dandruff']);
    expect(k.length).toBeLessThanOrEqual(5);
    expect(k[0]).toMatchObject({ kind: 'active', role: { zh: '去屑' } });
    const kinds = k.map((x) => x.kind);
    expect(kinds).toEqual([...kinds].sort((a, b) => ['active', 'chelator', 'caution'].indexOf(a) - ['active', 'chelator', 'caution'].indexOf(b)));
    expect(kinds).toContain('chelator');
    const frag = k.find((x) => x.ingredient.riskTags.includes('fragrance') && !x.ingredient.euAllergen);
    expect(frag?.role.zh).toBe('加香');
    expect(keyIngredients(byId('SH-US-048'), index, ['dandruff'], 2)).toHaveLength(2);
  });

  it('只有含去屑有效成分的产品才显示去屑用法', () => {
    expect(hasAntiDandruffActive(byId('SH-US-048'), index)).toBe(true);
    const plain = real.products.find((p) => p.category === 'conditioner' && !hasAntiDandruffActive(p, index));
    expect(plain).toBeDefined();
  });

  it('强清洁力表活只在计入温和度时列出', () => {
    const p = byId('SH-US-048');
    expect(irritantKinds(p, index, false).map((x) => x.zh)).not.toContain('强清洁力表活');
    expect(irritantKinds(p, index, true).map((x) => x.zh)).toContain('强清洁力表活');
  });
});
