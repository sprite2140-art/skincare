// 2026-11-23 ChatGPT 数据包：SE-US-008 补 Ulta 链接；低价补缺 18 款；日韩版本 7 款补价格和链接。
import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from './node';
import { isRecommendable } from './types';

const real = loadDataFromDisk();
const byId = (id: string) => real.products.find((p) => p.productId === id)!;
const newIds = [
  ...[27, 28, 29, 30, 31].map((n) => `EX-US-0${n}`), 'CL-US-047', 'CL-US-048',
  ...[85, 86, 87, 88, 89, 90, 91, 92].map((n) => `SH-US-0${n}`), 'CO-US-058', 'CO-US-059', 'CO-US-060',
];

describe('ChatGPT 数据包（2026-11-23）', () => {
  it('新增 18 款都能推荐：入库依据齐全、有价格和购买链接', () => {
    expect(newIds).toHaveLength(18);
    for (const id of newIds) {
      const p = byId(id);
      expect(p, id).toBeDefined();
      expect(isRecommendable(p), id).toBe(true);
      expect(p.price, id).toBeGreaterThan(0);
    }
  });

  it('SE-US-008 用 Ulta 链接，打分用的成分表不变，品牌官网仍是 version_mismatch', () => {
    const p = byId('SE-US-008');
    expect(isRecommendable(p)).toBe(true);
    expect(p.purchaseUrl).toContain('ulta.com');
    expect(p.brandClaims.status).toBe('version_mismatch');
    expect(p.inciList[0]).toBe('Aqua/Water/Eau');
  });

  it('日韩版本 7 款有了购买链接；SH-KR-002、SH-CN-001、SH-CN-002 仍待补', () => {
    for (const id of ['SH-JP-001', 'SH-JP-002', 'SH-JP-003', 'SH-JP-004', 'SH-KR-001', 'SH-KR-003', 'SH-KR-004']) {
      expect(byId(id).purchasePending, id).toBeFalsy();
    }
    for (const id of ['SH-KR-002', 'SH-CN-001', 'SH-CN-002']) expect(byId(id).purchasePending, id).toBe(true);
    expect(byId('SH-KR-003').price).toBe(16000);
  });

  it('导入时的更正：color_care → color_fade；CL-US-048 合并被拆开的成分名；SH-US-092 拼写', () => {
    expect(byId('SH-US-091').claimedBenefits).toContain('color_fade');
    expect(byId('CL-US-048').inciList).toContain('Sodium Benzotriazolyl Butylphenol Sulfonate');
    expect(byId('SH-US-092').inciList).toContain('Polyquaternium-7');
  });
});
