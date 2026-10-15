import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import { buildIngredientIndex } from '../data/ingredientIndex';
import { validateData } from '../data/validate';
import type { City, Ingredient, Product } from '../data/types';
import { concernWeights, rankProducts, scoreProduct, weightedTotal, type ScoringProfile } from './score';

const real = loadDataFromDisk();

const baseProfile: ScoringProfile = {
  concerns: [],
  concernsRanked: false,
  sensitive: false,
  specialStatus: 'none',
  avoidIngredients: [],
  avoidTags: [],
  budget: 'unlimited',
  washFrequency: null,
  city: null,
  inUseProducts: [],
};
const profile = (p: Partial<ScoringProfile>): ScoringProfile => ({ ...baseProfile, ...p });

// ---------- 用 data/ 里的真实示例数据 ----------

describe('data/ 示例数据', () => {
  const index = buildIngredientIndex(real.ingredients);
  const sample = real.products.find((p) => p.productId === 'SH-US-000')!;

  it('CSV 能正确解析', () => {
    expect(sample).toBeDefined();
    expect(sample.inciList).toEqual(['Aqua', 'Sodium Laureth Sulfate', 'Glycerin', 'Piroctone Olamine', 'Parfum']);
    expect(sample.price).toBe(12);
    const piroctone = index.get('octopirox');
    expect(piroctone?.inciName).toBe('Piroctone Olamine');
    expect(piroctone?.targets).toEqual(['dandruff', 'scalp_itch']);
  });

  it('数据校验没有格式错误', () => {
    expect(validateData(real.ingredients, real.products, real.cities).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('draft 成分不参与打分：示例产品无法评分', () => {
    const r = scoreProduct(sample, profile({ concerns: ['dandruff'] }), index);
    expect(r.score).toBeNull();
    expect(Object.values(r.dimensions).every((d) => d.score === null)).toBe(true);
    // 区分"不在成分库"和"在库但未核对"
    expect(r.unknownIngredients).toEqual(['Aqua', 'Sodium Laureth Sulfate']);
    expect(r.unverifiedIngredients).toEqual(['Glycerin', 'Piroctone Olamine', 'Parfum']);
    expect(r.notices.find((n) => n.code === 'missing_data')?.text.zh).toBe('有 5 个成分暂无数据，未参与打分');
  });

  it('安全相关的过滤也看 draft 成分，并标注未核对', () => {
    const r = scoreProduct(sample, profile({ avoidTags: ['fragrance'] }), index);
    expect(r.excluded).toBe(true);
    expect(r.exclusions[0]).toMatchObject({ code: 'avoid_tag', unverified: true });
    expect(r.exclusions[0].text.zh).toContain('未核对');
  });
});

// ---------- 测试专用数据：以示例数据为基础，改为 verified；Test 开头的成分是虚构的 ----------

const verify = (ing: Ingredient, extra: Partial<Ingredient> = {}): Ingredient => ({
  ...ing,
  reviewStatus: 'verified',
  reviewedOn: '2026-10-15',
  sources: ['https://example.org/test-only'],
  ...extra,
});
const realIng = (name: string) => real.ingredients.find((i) => i.inciName === name)!;
const fake = (inciName: string, extra: Partial<Ingredient>): Ingredient => verify({
  inciName, nameZh: inciName, aliases: [], category: 'base', functions: [], targets: [], effectiveRange: '',
  maxLimit: '', evidenceLevel: null, riskTags: [], conflictsWith: [], explainZh: '', explainEn: '', sources: [],
  reviewStatus: 'draft', reviewedOn: '',
}, extra);

const fixtureIngredients: Ingredient[] = [
  verify(realIng('Piroctone Olamine'), { evidenceLevel: 'A' }),
  verify(realIng('Parfum')),
  verify(realIng('Glycerin')),
  fake('Aqua', { aliases: ['Water'] }),
  fake('Test Chelator', { functions: ['chelating'] }),
  fake('Test Itch Relief', { category: 'active', targets: ['scalp_itch'], evidenceLevel: 'C' }),
  fake('Test Oil Control', { category: 'active', targets: ['scalp_oil'], evidenceLevel: 'B' }),
  fake('Test Essential Oil', { category: 'risk', riskTags: ['essential_oil'] }),
  fake('Test Strong Surfactant', { riskTags: ['strong_cleanser'] }),
  fake('Test Pregnancy Caution', { category: 'active', riskTags: ['pregnancy_caution'] }),
  fake('Test Rx Caution', { riskTags: ['rx_caution'] }),
  fake('Test Retinoid', { conflictsWith: [{ inci: 'Test Acid', severity: 'mild' }] }),
  fake('Test Acid', { riskTags: ['strong_acid'] }),
  fake('Test Severe A', { conflictsWith: [{ inci: 'Test Severe B', severity: 'severe' }] }),
  fake('Test Severe B', {}),
  { ...fake('Test Draft Active', { category: 'active', targets: ['dandruff'], evidenceLevel: 'A' }), reviewStatus: 'draft' },
];
const index = buildIngredientIndex(fixtureIngredients);

const sample = real.products.find((p) => p.productId === 'SH-US-000')!;
const product = (id: string, inciList: string[], extra: Partial<Product> = {}): Product => ({
  ...sample, productId: id, nameZh: id, nameEn: id, inciList, ...extra,
});
const city = (waterHardness: City['waterHardness'], reviewStatus: City['reviewStatus'] = 'verified'): City => ({
  city: 'Testville', country: 'US', waterHardness, source: '', reviewStatus,
});

describe('需求匹配', () => {
  it('示例产品（成分改为已核对）针对头皮屑满分', () => {
    const r = scoreProduct(sample, profile({ concerns: ['dandruff'] }), index);
    expect(r.dimensions.need.score).toBe(100);
    expect(r.dimensions.need.reason.zh).toBe('针对头皮屑：含吡罗克酮乙醇胺盐');
  });

  it('多选困扰平均加权，按覆盖比例得分', () => {
    const p = product('P1', ['Aqua', 'Test Oil Control']);
    const r = scoreProduct(p, profile({ concerns: ['dandruff', 'scalp_oil'] }), index);
    expect(r.dimensions.need.score).toBe(50);
    expect(r.dimensions.need.reason.zh).toContain('针对头皮屑：未找到已核对的有效成分');
  });

  it('排序困扰按 3/2/1 加权', () => {
    expect([...concernWeights(['dandruff', 'scalp_oil', 'scalp_itch'], true).values()]).toEqual([3, 2, 1]);
    const p = product('P2', ['Aqua', 'Test Oil Control']);
    // 第二困扰覆盖：2 / (3+2+1)
    const r = scoreProduct(p, profile({ concerns: ['dandruff', 'scalp_oil', 'scalp_itch'], concernsRanked: true }), index);
    expect(r.dimensions.need.score).toBe(33);
  });

  it('成分位置不影响得分（去屑成分通常排在后面）', () => {
    const late = product('P3', ['Aqua', 'Glycerin', 'Test Chelator', 'Parfum', 'Test Essential Oil', 'Piroctone Olamine']);
    expect(scoreProduct(late, profile({ concerns: ['dandruff'] }), index).dimensions.need.score).toBe(100);
  });

  it('draft 有效成分不计入需求匹配', () => {
    const p = product('P4', ['Aqua', 'Test Draft Active']);
    const r = scoreProduct(p, profile({ concerns: ['dandruff'] }), index);
    expect(r.dimensions.need.score).toBe(0);
    expect(r.unverifiedIngredients).toEqual(['Test Draft Active']);
  });

  it('没有选择困扰时不计分', () => {
    const r = scoreProduct(sample, profile({}), index);
    expect(r.dimensions.need.score).toBeNull();
    expect(r.dimensions.evidence.score).toBeNull();
  });

  it('名称匹配忽略大小写和别名', () => {
    const p = product('P5', ['WATER', 'piroctone  olamine']);
    const r = scoreProduct(p, profile({ concerns: ['dandruff'] }), index);
    expect(r.unknownIngredients).toEqual([]);
    expect(r.dimensions.need.score).toBe(100);
  });
});

describe('刺激风险', () => {
  it('每个刺激标签扣 15 分', () => {
    const r = scoreProduct(sample, profile({}), index);
    expect(r.dimensions.irritation.score).toBe(85);
    expect(r.dimensions.irritation.reason.zh).toBe('含香精（香精）');
  });

  it('敏感用户扣分加倍', () => {
    const r = scoreProduct(sample, profile({ sensitive: true }), index);
    expect(r.dimensions.irritation.score).toBe(70);
    expect(r.dimensions.irritation.reason.zh).toContain('扣分加倍');
  });

  it('同一标签只扣一次，多个标签叠加', () => {
    const p = product('P6', ['Aqua', 'Parfum', 'Test Essential Oil', 'Test Acid']);
    expect(scoreProduct(p, profile({}), index).dimensions.irritation.score).toBe(55);
  });

  it('孕期标签不算刺激风险', () => {
    const p = product('P7', ['Aqua', 'Test Pregnancy Caution']);
    expect(scoreProduct(p, profile({}), index).dimensions.irritation.score).toBe(100);
  });

  it('强清洁力只在每天洗头时扣分', () => {
    const p = product('P8', ['Aqua', 'Test Strong Surfactant']);
    expect(scoreProduct(p, profile({ washFrequency: 'every_other_day' }), index).dimensions.irritation.score).toBe(100);
    const daily = scoreProduct(p, profile({ washFrequency: 'daily' }), index);
    expect(daily.dimensions.irritation.score).toBe(85);
    expect(daily.dimensions.irritation.reason.zh).toContain('你每天洗头');
  });

  it('最低 0 分', () => {
    const p = product('P9', ['Parfum', 'Test Essential Oil', 'Test Acid', 'Test Strong Surfactant']);
    expect(scoreProduct(p, profile({ sensitive: true, washFrequency: 'daily' }), index).dimensions.irritation.score).toBe(0);
  });
});

describe('证据强度', () => {
  it('取匹配成分的证据等级，按困扰权重平均', () => {
    const p = product('P10', ['Aqua', 'Piroctone Olamine', 'Test Itch Relief']);
    // 头皮屑：吡罗克酮 A=100；头皮痒：吡罗克酮 A 与 Test C 中取最强 = 100
    expect(scoreProduct(p, profile({ concerns: ['dandruff', 'scalp_itch'] }), index).dimensions.evidence.score).toBe(100);
    const q = product('P11', ['Aqua', 'Piroctone Olamine', 'Test Oil Control']);
    // 头皮屑 A=100、头皮油 B=70，平均加权 = 85
    const r = scoreProduct(q, profile({ concerns: ['dandruff', 'scalp_oil'] }), index);
    expect(r.dimensions.evidence.score).toBe(85);
    expect(r.dimensions.evidence.reason.zh).toBe('证据等级：吡罗克酮乙醇胺盐 A 级、Test Oil Control B 级');
  });

  it('没有匹配成分时不计分', () => {
    const r = scoreProduct(sample, profile({ concerns: ['scalp_oil'] }), index);
    expect(r.dimensions.evidence.score).toBeNull();
  });
});

describe('环境适配', () => {
  const withChelator = product('P12', ['Aqua', 'Test Chelator']);
  it('硬水 + 螯合剂 = 100，硬水无螯合剂 = 50', () => {
    expect(scoreProduct(withChelator, profile({ city: city('hard') }), index).dimensions.environment.score).toBe(100);
    expect(scoreProduct(sample, profile({ city: city('hard') }), index).dimensions.environment.score).toBe(50);
  });
  it('未设城市、水硬度未知、城市数据未核对、软水：中性 50 并说明原因', () => {
    for (const c of [null, city('unknown'), city('hard', 'draft'), city('soft')]) {
      const d = scoreProduct(withChelator, profile({ city: c }), index).dimensions.environment;
      expect(d.score).toBe(50);
      expect(d.reason.zh.length).toBeGreaterThan(0);
    }
    expect(scoreProduct(withChelator, profile({ city: city('hard', 'draft') }), index).dimensions.environment.reason.zh).toContain('未核对');
  });
});

describe('综合分', () => {
  it('四个维度加权：需求 50% + 刺激 25% + 证据 15% + 环境 10%', () => {
    const r = scoreProduct(sample, profile({ concerns: ['dandruff'], city: city('hard') }), index);
    // 100*0.5 + 85*0.25 + 100*0.15 + 50*0.1 = 91.25
    expect(r.score).toBe(91);
    expect(r.dimensions.need.level).toBe('high');
    expect(r.dimensions.environment.level).toBe('medium');
  });

  it('数据不足的维度不计入，其余权重重新归一化', () => {
    const r = scoreProduct(sample, profile({}), index);
    // 只有刺激 85 (0.25) 和环境 50 (0.1)：(85*0.25 + 50*0.1) / 0.35 = 75
    expect(r.score).toBe(75);
    expect(weightedTotal(r.dimensions)).toBe(75);
  });

  it('高 / 中 / 低分界为 70 / 40', () => {
    const p = product('P13', ['Aqua', 'Parfum', 'Test Essential Oil', 'Test Acid', 'Test Strong Surfactant']);
    const r = scoreProduct(p, profile({ washFrequency: 'daily' }), index);
    expect(r.dimensions.irritation.score).toBe(40);
    expect(r.dimensions.irritation.level).toBe('medium');
    const s = scoreProduct(p, profile({ washFrequency: 'daily', sensitive: true }), index);
    expect(s.dimensions.irritation.level).toBe('low');
  });
});

describe('硬性过滤', () => {
  const preg = product('P14', ['Aqua', 'Test Pregnancy Caution']);

  it('怀孕 / 备孕 / 哺乳排除含孕期需注意成分的产品', () => {
    for (const s of ['pregnant', 'trying', 'breastfeeding'] as const) {
      const r = scoreProduct(preg, profile({ specialStatus: s }), index);
      expect(r.excluded).toBe(true);
      expect(r.exclusions[0].code).toBe('special_status');
    }
    expect(scoreProduct(preg, profile({}), index).excluded).toBe(false);
  });

  it('孕期提示对所有人被动显示', () => {
    const r = scoreProduct(preg, profile({}), index);
    expect(r.notices.find((n) => n.code === 'pregnancy_notice')?.text.zh).toBe('含Test Pregnancy Caution，孕期或哺乳期请注意');
  });

  it('处方药用 rx_caution 标签，不用孕期标签', () => {
    expect(scoreProduct(preg, profile({ specialStatus: 'rx' }), index).excluded).toBe(false);
    const rx = product('P15', ['Aqua', 'Test Rx Caution']);
    expect(scoreProduct(rx, profile({ specialStatus: 'rx' }), index).excluded).toBe(true);
  });

  it('想避开的成分按名称匹配，库里没有的成分也能避开', () => {
    expect(scoreProduct(sample, profile({ avoidIngredients: ['fragrance'] }), index).exclusions[0].code).toBe('avoid_ingredient');
    expect(scoreProduct(sample, profile({ avoidIngredients: ['sodium laureth sulfate'] }), index).excluded).toBe(true);
  });

  it('超出预算排除；同币种比较；不支持的币种只提示', () => {
    const pricey = product('P16', ['Aqua'], { price: 40, currency: 'USD' });
    expect(scoreProduct(pricey, profile({ budget: 'mid' }), index).exclusions[0].code).toBe('over_budget');
    expect(scoreProduct(pricey, profile({ budget: 'premium' }), index).excluded).toBe(false);
    const eur = product('P17', ['Aqua'], { price: 999, currency: 'EUR' });
    const r = scoreProduct(eur, profile({ budget: 'economy' }), index);
    expect(r.excluded).toBe(false);
    expect(r.notices.some((n) => n.code === 'currency_unsupported')).toBe(true);
  });
});

describe('搭配冲突', () => {
  const inUse = product('IN-USE', ['Aqua', 'Test Retinoid', 'Test Severe B'], { nameZh: '晚霜' });

  it('一般冲突不扣分，给出提醒和用法建议', () => {
    const p = product('P18', ['Aqua', 'Test Acid']);
    const before = scoreProduct(p, profile({}), index);
    const r = scoreProduct(p, profile({ inUseProducts: [inUse] }), index);
    expect(r.excluded).toBe(false);
    expect(r.score).toBe(before.score);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatchObject({ severity: 'mild', ingredient: 'Test Acid', inUseIngredient: 'Test Retinoid' });
    expect(r.conflicts[0].text.zh).toContain('建议分开早晚使用');
  });

  it('严重冲突不推荐（双向识别）', () => {
    const p = product('P19', ['Aqua', 'Test Severe A']);
    const r = scoreProduct(p, profile({ inUseProducts: [inUse] }), index);
    expect(r.excluded).toBe(true);
    expect(r.exclusions[0].code).toBe('severe_conflict');
  });
});

describe('排序', () => {
  it('可推荐的按分数降序，无法评分的其次，被排除的最后', () => {
    const products = [
      product('A-excluded', ['Aqua', 'Piroctone Olamine', 'Test Pregnancy Caution']),
      product('B-noscore', ['Unknown Thing']),
      product('C-low', ['Aqua', 'Parfum']),
      product('D-high', ['Aqua', 'Piroctone Olamine']),
      product('E-other-category', ['Aqua'], { category: 'conditioner' }),
    ];
    const ranked = rankProducts(products, 'shampoo', profile({ concerns: ['dandruff'], specialStatus: 'pregnant' }), index);
    expect(ranked.map((r) => r.product.productId)).toEqual(['D-high', 'C-low', 'B-noscore', 'A-excluded']);
  });
});
