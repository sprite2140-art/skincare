// 2026-10-29 保湿第 2 批（MO-US-021—040）追加；SU-US-048 按 product_id 替换（原 Erborian SPF 25 撤掉）。
import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from './node';

const real = loadDataFromDisk();
const byId = (id: string) => real.products.find((p) => p.productId === id)!;

describe('保湿第 2 批、SU-US-048 替换（2026-10-29）', () => {
  it('保湿共 40 款；第 2 批入库依据：Ulta 畅销榜 2 款，其余 18 款按评价数', () => {
    expect(real.products.filter((p) => p.category === 'moisturizer')).toHaveLength(40);
    const batch = real.products.filter((p) => /^MO-US-0(2[1-9]|3\d|40)$/.test(p.productId));
    expect(batch).toHaveLength(20);
    expect(batch.filter((p) => p.inclusionBasisType === 'retailer_bestseller').map((p) => p.productId)).toEqual(['MO-US-030', 'MO-US-038']);
    expect(batch.filter((p) => p.inclusionBasisType === 'review_count')).toHaveLength(18);
    // MO-US-022（Walmart）、MO-US-027（Kohl's）用认可平台的评价数
    expect(byId('MO-US-022').inclusionBasis).toContain('Walmart 评价数 5,684');
    expect(byId('MO-US-027').inclusionBasis).toContain("Kohl's 评价数 1,723");
  });

  it('SU-US-048 换成 SPF 50 广谱，Cerasun Technology 从 key_actives 移到 formula_note', () => {
    const p = byId('SU-US-048');
    expect(p.face).toMatchObject({ spf: 50, broadSpectrum: 'yes' });
    expect(p.inclusionBasisType).toBe('retailer_bestseller');
    expect(p.keyActives).not.toContain('Cerasun Technology');
    expect(p.keyActives).toContain('Hyaluronic Acid');
    expect(p.formulaNote).toContain('Cerasun Technology');
    // 原有购买链接和评分整组替换为新文件里的 2 条、1 条
    expect(p.purchaseLinks).toHaveLength(2);
    expect(p.ratings).toHaveLength(1);
  });
});
