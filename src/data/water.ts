// 水硬度显示用的纯函数：USGS 分级、城市数值汇总、采样时期格式化。
// 原则：数据表里的内部取值（如 not_stated_in_FAQ、statistic_type 代码）不直接显示给用户。

import type { City, WaterRecord } from './types';

/** USGS 分级（mg/L，以 CaCO3 计）：0–60 软水、61–120 中等、121–180 硬水、>180 很硬 */
export const USGS_BANDS = [
  { key: 'soft', min: 0, max: 60 },
  { key: 'moderate', min: 61, max: 120 },
  { key: 'hard', min: 121, max: 180 },
  { key: 'very_hard', min: 181, max: Infinity },
] as const;
export type UsgsBand = (typeof USGS_BANDS)[number]['key'];

export function usgsBand(value: number): UsgsBand {
  if (value <= 60) return 'soft';
  if (value <= 120) return 'moderate';
  if (value <= 180) return 'hard';
  return 'very_hard';
}

/** 城市各条记录的数值汇总：有均值 / 单次值时取这些值的最小和最大；只有范围时取范围 */
export interface CityWaterSummary {
  low: number;
  high: number;
  /** 有数值的记录条数 */
  count: number;
  /** 不重复的来源链接 */
  sources: string[];
}

export function summarizeCityWater(city: City): CityWaterSummary | null {
  const values = city.water.map((r) => r.value).filter((v): v is number => v !== null);
  const sources = [...new Set(city.water.flatMap((r) => r.sources))];
  if (values.length > 0) return { low: Math.min(...values), high: Math.max(...values), count: values.length, sources };
  const ranged = city.water.filter((r) => r.min !== null && r.max !== null);
  if (ranged.length === 0) return null;
  return {
    low: Math.min(...ranged.map((r) => r.min!)),
    high: Math.max(...ranged.map((r) => r.max!)),
    count: ranged.length,
    sources,
  };
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * 把采样时期整理成用户能读的文字；认不出的写法返回 null（不显示），
 * 写明"未注明 / 未取得"的返回 "未注明"。
 */
export function formatPeriod(period: string, lang: 'zh' | 'en'): string | null {
  const p = period.trim();
  if (!p) return null;
  const zh = lang === 'zh';
  let m: RegExpMatchArray | null;
  if ((m = p.match(/^(\d{4})-01-01\/\1-12-31$/))) return zh ? `${m[1]} 年全年` : `Full year ${m[1]}`;
  if ((m = p.match(/^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/))) {
    if (m[1] === m[2]) return m[1];
    return zh ? `${m[1]} 至 ${m[2]}` : `${m[1]} to ${m[2]}`;
  }
  if ((m = p.match(/^(\d{4})-(\d{2})\/(\d{4})-(\d{2})$/))) {
    return zh ? `${m[1]} 年 ${+m[2]} 月至 ${m[3]} 年 ${+m[4]} 月` : `${MONTHS_EN[+m[2] - 1]} ${m[1]} to ${MONTHS_EN[+m[4] - 1]} ${m[3]}`;
  }
  if ((m = p.match(/^(\d{4})-Q([1-4])$/))) return zh ? `${m[1]} 年第 ${m[2]} 季度` : `Q${m[2]} ${m[1]}`;
  if ((m = p.match(/^(\d{4})$/))) return zh ? `${m[1]} 年` : m[1];
  if ((m = p.match(/^(\d{4})-(\d{2})$/))) return zh ? `${m[1]} 年 ${+m[2]} 月` : `${MONTHS_EN[+m[2] - 1]} ${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
  if (/not[_ ]stated|unavailable|not[_ ]available/i.test(p)) return zh ? '未注明' : 'Not stated';
  // 其他自由文字（如 "sample 2026-08-10; range preceding 12 months"）：只取其中的日期
  const dates = p.match(/\d{4}-\d{2}-\d{2}/g);
  if (dates) return dates.join(zh ? '、' : ', ');
  return null;
}

/** 记录的适用范围；像代码一样的取值（小写加下划线）不显示 */
export function displayScope(r: Pick<WaterRecord, 'scope'>): string {
  return /^[a-z0-9_]+$/.test(r.scope) ? '' : r.scope;
}
