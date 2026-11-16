// 2026-11-15 护肤低价补缺：去角质 EX-US-021—026、洁面 CL-US-041—046、保湿 MO-US-041—046 追加。
import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from './node';
import { fragranceInfo } from '../scoring/fragrance';
import { isRecommendable } from './types';

const real = loadDataFromDisk();
const ids = [
  ...[21, 22, 23, 24, 25, 26].map((n) => `EX-US-0${n}`),
  ...[41, 42, 43, 44, 45, 46].map((n) => `CL-US-0${n}`),
  ...[41, 42, 43, 44, 45, 46].map((n) => `MO-US-0${n}`),
];
const byId = (id: string) => real.products.find((p) => p.productId === id)!;

describe('护肤低价补缺（2026-11-15）', () => {
  it('18 款都已导入，入库依据齐全，有价格和可用购买链接', () => {
    for (const id of ids) {
      const p = byId(id);
      expect(p, id).toBeDefined();
      expect(isRecommendable(p), id).toBe(true);
      expect(p.price, id).toBeGreaterThan(0);
    }
  });

  it('误填的 subtype（chemical / physical）清空，原值记入 formula_note', () => {
    for (const id of ids.slice(0, 6)) {
      expect(byId(id).subtype, id).toBeNull();
      expect(byId(id).formulaNote, id).toContain('原 subtype');
    }
  });

  it('官方拼写错误已更正，不再带 [待核对]', () => {
    expect(byId('EX-US-022').inciList).toContain('ethylhexylglycerin');
    expect(byId('EX-US-022').inciNameUnverified).toEqual([]);
    expect(byId('MO-US-044').inciList).toContain('Magnesium Aluminum Silicate');
    expect(byId('MO-US-044').inciNameUnverified).toEqual([]);
  });

  it('Masking Fragrance 按香精算（EX-US-024）', () => {
    expect(fragranceInfo(byId('EX-US-024'), real.ingredientIndex).status).toBe('contains');
  });
});
