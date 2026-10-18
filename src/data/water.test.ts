import { describe, expect, it } from 'vitest';
import { formatPeriod, summarizeCityWater, usgsBand } from './water';
import { loadDataFromDisk } from './node';

const real = loadDataFromDisk();
const city = (name: string) => real.cities.find((c) => c.city === name)!;

describe('水硬度显示', () => {
  it('USGS 分级：0–60 软水、61–120 中等、121–180 硬水、>180 很硬', () => {
    expect([0, 60, 61, 120, 121, 180, 181].map(usgsBand)).toEqual(['soft', 'soft', 'moderate', 'moderate', 'hard', 'hard', 'very_hard']);
  });

  it('采样时期整理成可读文字，内部代码不显示', () => {
    expect(formatPeriod('2025-01-01/2025-12-31', 'zh')).toBe('2025 年全年');
    expect(formatPeriod('2024-04-01/2025-03-31', 'zh')).toBe('2024-04-01 至 2025-03-31');
    expect(formatPeriod('2025-Q4', 'zh')).toBe('2025 年第 4 季度');
    expect(formatPeriod('2024-10/2025-09', 'en')).toBe('Oct 2024 to Sep 2025');
    expect(formatPeriod('not_stated_in_FAQ', 'zh')).toBe('未注明');
    expect(formatPeriod('not_stated_in_summary', 'en')).toBe('Not stated');
    expect(formatPeriod('sample 2026-08-10; range preceding 12 months', 'zh')).toBe('2026-08-10');
    expect(formatPeriod('', 'zh')).toBeNull();
    // 数据里所有时期都能整理出文字，不会原样露出
    for (const r of real.water) {
      const text = formatPeriod(r.period, 'zh');
      if (text !== null) expect(text).not.toMatch(/_/);
    }
  });

  it('城市数值汇总：单值为一个点，多个分区为一段，只有范围时用范围', () => {
    expect(summarizeCityWater(city('Chicago'))).toMatchObject({ low: 143, high: 143, count: 1 });
    expect(summarizeCityWater(city('Los Angeles'))).toMatchObject({ low: 103, high: 236, count: 6 });
    expect(summarizeCityWater(city('Phoenix'))).toMatchObject({ low: 172, high: 302 });
    expect(summarizeCityWater(city('Miami'))).toBeNull();
  });

  it('参照城市：保留 "<5" 原文；伦敦未找到数值，不填第三方数据', () => {
    const hk = real.referenceWater.find((r) => r.city === 'Hong Kong')!;
    expect(hk).toMatchObject({ value: 38, minText: '<5', maxText: '72' });
    const london = real.referenceWater.find((r) => r.city === 'London')!;
    expect(london.value).toBeNull();
    expect(london.statisticType).toBe('not_found');
    expect(real.referenceWater.find((r) => r.city === 'Paris')).toMatchObject({ value: 297, minText: '', maxText: '365' });
  });
});
