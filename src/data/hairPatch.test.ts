// 2026-10-29 洗护补丁：成人无香头皮类 SH-US-081—084 补位，SH-US-076、078、CO-US-055、056、057 按 product_id 覆盖；
// "品牌标注无香，但含植物精油 / 芳香植物成分"（所有品类）。
import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from './node';
import { aromaticEntry, parseAromaticBotanicals } from './cosing';
import { fragranceInfo, fragranceTier, plantKind } from '../scoring/fragrance';
import { labeledWithPlants } from '../scoring/reasons';

const real = loadDataFromDisk();
const byId = (id: string) => real.products.find((p) => p.productId === id)!;

describe('洗护补丁（2026-10-29）', () => {
  it('新增 4 款成人头皮类洗发水，不是儿童产品', () => {
    for (const id of ['SH-US-081', 'SH-US-082', 'SH-US-083', 'SH-US-084']) {
      expect(byId(id)).toMatchObject({ zone: 'scalp', category: 'shampoo', region: 'US', fragranceFreeClaim: 'yes' });
      expect(byId(id).subtype).not.toBe('kids');
      expect(byId(id).inclusionPending).toBeFalsy();
    }
    // DHS 的入库依据是 Amazon 评价数 1,382 条，自动记为 review_count
    expect(byId('SH-US-081')).toMatchObject({ inclusionBasisType: 'review_count' });
    expect(byId('SH-US-081').inclusionBasis).toContain('Amazon 评价数 1,382');
  });

  it('SH-US-084 是洗护二合一的清洁霜（co-wash），formula_note 注明', () => {
    expect(byId('SH-US-084')).toMatchObject({ subtype: 'co_wash', category: 'shampoo' });
    expect(byId('SH-US-084').formulaNote).toMatch(/^洗护二合一的清洁霜（co-wash）/);
  });

  it('5 个修正编号：主记录覆盖，购买链接和评分整组替换', () => {
    expect(byId('SH-US-076')).toMatchObject({ price: 38, sizeMl: 251 });
    expect(byId('CO-US-055')).toMatchObject({ price: 38, sizeMl: 198 });
    for (const id of ['SH-US-076', 'SH-US-078', 'CO-US-055', 'CO-US-056', 'CO-US-057']) {
      const p = byId(id);
      // 旧的 Ulta 链接和评分已删除，只剩补丁里的 Nordstrom / 品牌官网
      expect(p.purchaseLinks.map((l) => l.platform).filter((x) => x === 'ulta')).toEqual([]);
      expect(p.ratings.every((r) => r.platform === 'nordstrom')).toBe(true);
    }
    // CO-US-056 改用 Oribe 自己的 Nordstrom 商品页（2,970 条评价）
    expect(byId('CO-US-056')).toMatchObject({ inclusionBasisType: 'review_count' });
    expect(byId('CO-US-056').inclusionBasis).toContain('Nordstrom 评价数 2,970');
  });
});

describe('芳香植物成分（(EU) 2023/1545）', () => {
  const list = parseAromaticBotanicals('species,parts,forms,entry\nLavandula Angustifolia,,oil;extract,360\nRosa Damascena,flower,oil;extract,366\nMentha Viridis,leaf,oil,362\nCitrus Limon,peel,oil,353\n');

  it('按物种 + 部位 + 形态匹配；括号里的俗名不影响', () => {
    expect(aromaticEntry('Lavandula Angustifolia Flower Extract', list)).toBe('360');
    expect(aromaticEntry('Lavandula Angustifolia (Lavender) Flower Extract', list)).toBe('360');
    expect(aromaticEntry('Rosa Damascena Flower Oil', list)).toBe('366');
    // 条目只列了精油 / 提取物，花水、果实提取物、只列精油的叶提取物都不算
    expect(aromaticEntry('Rosa Damascena Flower Water', list)).toBeNull();
    expect(aromaticEntry('Citrus Limon Fruit Extract', list)).toBeNull();
    expect(aromaticEntry('Mentha Viridis Leaf Extract', list)).toBeNull();
  });

  it('品牌标注无香但含精油：不显示"无香"，写明"品牌标注无香，但含植物精油"', () => {
    const f = fragranceInfo(byId('SH-US-084'), real.ingredientIndex);
    expect(f.status).toBe('contains');
    expect(f.labeledFreeWithPlants).toBe(true);
    expect(f.essentialOils).toContain('Mentha Piperita Oil');
    expect(f.botanicals).toContain('Lavandula Angustifolia Flower Extract');
    expect(plantKind(f)).toBe('oil');
    expect(labeledWithPlants(f).zh).toBe('品牌标注无香，但含植物精油');
  });

  it('只含芳香植物提取物时写"芳香植物成分"，同样不算无香（防晒等所有品类）', () => {
    const f = fragranceInfo(byId('SU-US-005'), real.ingredientIndex);
    expect(f.botanicals).toEqual(['Cedrus Atlantica Bark Extract']);
    expect(f.labeledFreeWithPlants).toBe(true);
    expect(plantKind(f)).toBe('botanical');
    expect(labeledWithPlants(f).zh).toBe('品牌标注无香，但含芳香植物成分');
    expect(fragranceTier(f)).toBe(1);
  });

  it('没有标注无香的产品含芳香植物成分时也不再算"成分表没有加香成分"', () => {
    const f = fragranceInfo(byId('CL-US-009'), real.ingredientIndex);
    expect(f.status).toBe('contains');
    expect(f.labeledFreeWithPlants).toBe(false);
  });
});
