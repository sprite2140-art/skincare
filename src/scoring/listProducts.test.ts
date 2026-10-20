import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import { isFaceCategory } from '../data/face';
import { LIST_CATEGORIES, productsForList } from './listProducts';

const real = loadDataFromDisk();
const face = real.products.filter((p) => p.zone === 'face');

describe('护肤产品不进入洗护结果页', () => {
  it('产品库里已有面部产品（首批洁面 40 款）', () => {
    expect(face.filter((p) => p.category === 'cleanser').length).toBeGreaterThanOrEqual(40);
  });

  it('洗发水、护发素列表里没有面部产品', () => {
    expect(LIST_CATEGORIES.some(isFaceCategory)).toBe(false);
    for (const cat of LIST_CATEGORIES) {
      const ids = productsForList(real.products, cat).map((p) => p.productId);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.filter((id) => face.some((p) => p.productId === id))).toEqual([]);
    }
  });

  it('即使面部产品的品类填错，也不进入洗护列表', () => {
    const wrong = { ...face[0], category: 'shampoo' };
    expect(productsForList([wrong], 'shampoo')).toEqual([]);
  });

  it('结果页用 productsForList 取产品，洗护产品的"同系列"不指向面部产品', () => {
    expect(readFileSync(new URL('../pages/Results.tsx', import.meta.url), 'utf8')).toContain('productsForList(products, cat)');
    const faceIds = new Set(face.map((p) => p.productId));
    for (const p of real.products.filter((x) => x.zone !== 'face')) {
      expect(p.pairedProductIds.filter((id) => faceIds.has(id))).toEqual([]);
    }
  });
});
