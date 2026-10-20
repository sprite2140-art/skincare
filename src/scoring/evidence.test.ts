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

  it('没有证据的三个成分已删除功效目标', () => {
    for (const name of ['Sodium Salicylate', 'Tussilago Farfara Leaf Extract', 'Biotin']) {
      expect(ing(name).targets).toEqual([]);
      expect(ing(name).evidenceLevel).toBeNull();
    }
  });

  it('30 个成分已核对，日期 2026-10-20', () => {
    expect(real.ingredients.filter((i) => i.reviewStatus === 'verified' && i.reviewedOn === '2026-10-20')).toHaveLength(30);
  });
});
