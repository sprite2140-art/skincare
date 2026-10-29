// 2026-10-29：key_actives 只保留能对应到成分表的 INCI 成分（及品牌公开浓度）；
// 品牌技术 / 配方名称移到 formula_note。MO-US-034 的 Linaloo 改为 Linalool。
import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from './node';
import { unmatchedKeyActives } from './keyActives';
import { fragranceInfo } from '../scoring/fragrance';

const real = loadDataFromDisk();
const byId = (id: string) => real.products.find((p) => p.productId === id)!;

describe('key_actives 清理（2026-10-29）', () => {
  it('除痘痘贴的材料名外，key_actives 都能对应到成分表', () => {
    const left = real.products
      .map((p) => [p.productId, unmatchedKeyActives(p, (n) => real.ingredientIndex.get(n))] as const)
      .filter(([, u]) => u.length > 0);
    expect(left).toEqual([['ST-US-002', ['Hydrocolloid']]]);
  });

  it('技术名称移到 formula_note；全部移走时填 Not separately disclosed（有效成分按非主打计，不变成"还没填写"）', () => {
    expect(byId('MO-US-024').keyActives).toEqual(['Avene Thermal Spring Water']);
    expect(byId('MO-US-024').formulaNote).toContain('C+ - RESTORE');
    expect(byId('MO-US-035').formulaNote).toContain('Pro-Collagen Technology');
    expect(byId('SH-US-005')).toMatchObject({ keyActives: [], keyActivesDisclosed: false });
    expect(byId('SH-US-005').formulaNote).toContain('OLAPLEX Bond Building Technology');
  });

  it('MO-US-034：Linaloo 改为 Linalool，识别为欧盟香料致敏原', () => {
    const p = byId('MO-US-034');
    expect(p.inciList).toContain('Linalool');
    expect(p.inciNameUnverified).toEqual([]);
    expect(p.formulaNote).toContain('Linaloo');
    const f = fragranceInfo(p, real.ingredientIndex);
    expect(f.status).toBe('contains');
    expect(f.allergens).toContain('Linalool');
  });
});
