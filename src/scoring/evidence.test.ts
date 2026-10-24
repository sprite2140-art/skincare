import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import type { Ingredient } from '../data/types';
import { evidenceFor, highestLevel } from './evidence';

const real = loadDataFromDisk();
const ing = (name: string) => real.ingredients.find((i) => i.inciName === name)!;

describe('按需求读取证据等级（evidence_by_target）', () => {
  it('同一成分对不同需求的等级不同；evidence_level 只是其中最高的一级', () => {
    const sa = ing('Salicylic Acid');
    expect(evidenceFor(sa, 'dandruff', 'rinse_off')?.level).toBe('A');
    expect(evidenceFor(sa, 'scalp_oil', 'rinse_off')?.level).toBe('C');
    expect(sa.evidenceLevel).toBe('A');
    expect(highestLevel(sa.evidenceByTarget!)).toBe('A');
  });

  it('evidence_by_target 里没写的需求为暂无证据；整列为空的旧条目沿用 evidence_level', () => {
    expect(evidenceFor(ing('Piroctone Olamine'), 'scalp_itch', 'rinse_off')).toBeNull();
    const legacy: Ingredient = { ...ing('Piroctone Olamine'), evidenceByTarget: {}, evidenceLevel: 'B' };
    expect(evidenceFor(legacy, 'scalp_itch', 'rinse_off')?.level).toBe('B');
  });

  it('咖啡因的证据来自免洗液：冲洗型产品降一级，免洗型不降', () => {
    const caffeine = ing('Caffeine');
    expect(evidenceFor(caffeine, 'hair_loss', 'leave_on')).toEqual({ level: 'B', downgraded: false });
    expect(evidenceFor(caffeine, 'hair_loss', 'rinse_off')).toEqual({ level: 'C', downgraded: true });
  });

  it('证据只来自免洗产品的成分（烟酰胺、透明质酸、泛醇等）同样降级；both 不降', () => {
    expect(evidenceFor(ing('Niacinamide'), 'oil', 'rinse_off')).toEqual({ level: 'C', downgraded: true });
    expect(evidenceFor(ing('Sodium Hyaluronate'), 'dryness', 'rinse_off')).toEqual({ level: 'C', downgraded: true });
    expect(evidenceFor(ing('Panthenol'), 'dryness', 'leave_on')).toEqual({ level: 'B', downgraded: false });
    expect(ing('Pyrithione Zinc').evidenceUsage).toBe('both');
    expect(evidenceFor(ing('Pyrithione Zinc'), 'dandruff', 'leave_on')).toEqual({ level: 'A', downgraded: false });
    expect(evidenceFor(ing('Pyrithione Zinc'), 'dandruff', 'rinse_off')).toEqual({ level: 'A', downgraded: false });
  });

  it('没有证据的三个成分已删除功效目标', () => {
    for (const name of ['Sodium Salicylate', 'Tussilago Farfara Leaf Extract', 'Biotin']) {
      expect(ing(name).targets).toEqual([]);
      expect(ing(name).evidenceLevel).toBeNull();
    }
  });

  it('30 个洗护成分已核对（其中 9 个在 2026-10-24 面部有效成分导入时重新核对）', () => {
    const HAIR_30 = [
      'Piroctone Olamine', 'Pyrithione Zinc', 'Salicylic Acid', 'Sodium Salicylate', 'Tussilago Farfara Leaf Extract', 'Menthol',
      'Menthyl Lactate', 'Dipotassium Glycyrrhizate', 'Caffeine', 'Biotin', 'Acetyl Tetrapeptide-3', 'Copper Tripeptide-1',
      'Serenoa Serrulata Fruit Extract', 'Rosmarinus Officinalis Leaf Oil', 'Niacinamide', 'Panthenol', 'Ceramide NP', 'Ceramide AP',
      'Ceramide EOP', 'Ceramide NG', 'Ceramide AG', 'Sodium Hyaluronate', 'Hydrolyzed Keratin', 'Hydrolyzed Collagen',
      'Bis-Aminopropyl Diglycol Dimaleate', 'sh-Oligopeptide-78', 'Ketoconazole', 'Selenium Sulfide', 'Hydrolyzed Hyaluronic Acid', 'Hyaluronic Acid',
    ];
    const rows = HAIR_30.map(ing);
    expect(rows.every((i) => i.reviewStatus === 'verified')).toBe(true);
    expect(rows.filter((i) => i.reviewedOn === '2026-10-24').map((i) => i.inciName).sort()).toEqual([
      'Ceramide AP', 'Ceramide EOP', 'Ceramide NP', 'Hyaluronic Acid', 'Hydrolyzed Hyaluronic Acid', 'Niacinamide', 'Panthenol', 'Salicylic Acid', 'Sodium Hyaluronate',
    ]);
  });
});
