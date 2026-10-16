import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import { buildIngredientIndex } from '../data/ingredientIndex';
import { validateData } from '../data/validate';
import type { City, Ingredient, Product } from '../data/types';
import { concernWeights, ingredientStatuses, rankProducts, scoreProduct, weightedTotal, type ScoringProfile } from './score';
import { currencyForCountry } from './price';
import { budgetOptions, computeBudgetCaps, formatMoney, percentile } from './budget';

const real = loadDataFromDisk();

const baseProfile: ScoringProfile = {
  concerns: [],
  concernsRanked: false,
  sensitive: false,
  specialStatus: 'none',
  avoidIngredients: [],
  avoidTags: [],
  budget: 'none',
  washFrequency: null,
  city: null,
  inUseProducts: [],
};
const profile = (p: Partial<ScoringProfile>): ScoringProfile => ({ ...baseProfile, ...p });

// ---------- 用 data/ 里的真实示例数据 ----------

describe('data/ 示例数据', () => {
  const index = buildIngredientIndex(real.ingredients);
  const data = { index, exchangeRates: real.exchangeRates, budgetCaps: {} };
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
    expect(validateData(real.ingredients, real.products, real.cities, real.exchangeRates).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('数据校验能发现未知品类和汇率表缺少的币种', () => {
    const bad = { ...sample, productId: 'BAD-1', category: 'shampooo', currency: 'EUR' };
    const errors = validateData(real.ingredients, [bad], real.cities, real.exchangeRates).filter((i) => i.level === 'error');
    expect(errors.map((e) => e.message)).toEqual([
      expect.stringContaining('category 取值 "shampooo"'),
      expect.stringContaining('currency "EUR" 不在 exchange_rates.csv'),
    ]);
  });

  it('draft 成分不参与打分：示例产品无法评分', () => {
    const r = scoreProduct(sample, profile({ concerns: ['dandruff'] }), data);
    expect(r.score).toBeNull();
    expect(Object.values(r.dimensions).every((d) => d.score === null)).toBe(true);
    // 区分"不在成分库"和"在库但未核对"
    expect(r.unknownIngredients).toEqual(['Sodium Laureth Sulfate']);
    expect(r.unverifiedIngredients).toEqual(['Aqua', 'Glycerin', 'Piroctone Olamine', 'Parfum']);
    expect(r.notices.find((n) => n.code === 'missing_data')?.text.zh).toBe('有 5 个成分暂无数据，未参与打分');
  });

  it('安全相关的过滤也看 draft 成分，并标注未核对', () => {
    const r = scoreProduct(sample, profile({ avoidTags: ['fragrance'] }), data);
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
const data = { index, exchangeRates: real.exchangeRates, budgetCaps: {} };

const sample = real.products.find((p) => p.productId === 'SH-US-000')!;
// 默认用免洗型品类，刺激风险不减半；需要冲洗型时显式传 category: 'shampoo'
const product = (id: string, inciList: string[], extra: Partial<Product> = {}): Product => ({
  ...sample, productId: id, nameZh: id, nameEn: id, category: 'scalp_care', inciList, ...extra,
});
const leaveOnSample = product('LEAVE-ON', sample.inciList);
const city = (waterHardness: City['waterHardness'], reviewStatus: City['reviewStatus'] = 'verified'): City => ({
  city: 'Testville', country: 'US', waterHardness, source: '', reviewStatus,
});

describe('需求匹配', () => {
  it('示例产品（成分改为已核对）针对头皮屑满分', () => {
    const r = scoreProduct(sample, profile({ concerns: ['dandruff'] }), data);
    expect(r.dimensions.need.score).toBe(100);
    expect(r.dimensions.need.reason.zh).toBe('针对头皮屑：含吡罗克酮乙醇胺盐');
  });

  it('多选困扰平均加权，按覆盖比例得分', () => {
    const p = product('P1', ['Aqua', 'Test Oil Control']);
    const r = scoreProduct(p, profile({ concerns: ['dandruff', 'scalp_oil'] }), data);
    expect(r.dimensions.need.score).toBe(50);
    expect(r.dimensions.need.reason.zh).toContain('针对头皮屑：未找到已核对的有效成分');
  });

  it('排序困扰按 3/2/1 加权', () => {
    expect([...concernWeights(['dandruff', 'scalp_oil', 'scalp_itch'], true).values()]).toEqual([3, 2, 1]);
    const p = product('P2', ['Aqua', 'Test Oil Control']);
    // 第二困扰覆盖：2 / (3+2+1)
    const r = scoreProduct(p, profile({ concerns: ['dandruff', 'scalp_oil', 'scalp_itch'], concernsRanked: true }), data);
    expect(r.dimensions.need.score).toBe(33);
  });

  it('成分位置不影响得分（去屑成分通常排在后面）', () => {
    const late = product('P3', ['Aqua', 'Glycerin', 'Test Chelator', 'Parfum', 'Test Essential Oil', 'Piroctone Olamine']);
    expect(scoreProduct(late, profile({ concerns: ['dandruff'] }), data).dimensions.need.score).toBe(100);
  });

  it('draft 有效成分不计入需求匹配', () => {
    const p = product('P4', ['Aqua', 'Test Draft Active']);
    const r = scoreProduct(p, profile({ concerns: ['dandruff'] }), data);
    expect(r.dimensions.need.score).toBe(0);
    expect(r.unverifiedIngredients).toEqual(['Test Draft Active']);
  });

  it('没有选择困扰时不计分', () => {
    const r = scoreProduct(sample, profile({}), data);
    expect(r.dimensions.need.score).toBeNull();
    expect(r.dimensions.evidence.score).toBeNull();
  });

  it('名称匹配忽略大小写和别名', () => {
    const p = product('P5', ['WATER', 'piroctone  olamine']);
    const r = scoreProduct(p, profile({ concerns: ['dandruff'] }), data);
    expect(r.unknownIngredients).toEqual([]);
    expect(r.dimensions.need.score).toBe(100);
  });
});

describe('成分名称统一与 [待核对]', () => {
  it('括号俗名去掉后可匹配；[待核对] 的成分不参与打分，显示为暂无数据', () => {
    const p = product('N1', ['Aqua (Water)', 'Piroctone Olamine'], { inciNameUnverified: ['Piroctone Olamine'] });
    const r = scoreProduct(p, profile({ concerns: ['dandruff'] }), data);
    // 吡罗克酮名称未核对，不计入需求匹配
    expect(r.dimensions.need.score).toBe(0);
    expect(r.nameUnverifiedIngredients).toEqual(['Piroctone Olamine']);
    expect(r.unknownIngredients).toEqual([]);
    expect(r.notices.find((n) => n.code === 'missing_data')?.text.zh).toBe('有 1 个成分暂无数据，未参与打分');
    expect(ingredientStatuses(p, index).map((s) => s.status)).toEqual(['verified', 'name_unverified']);
  });

  it('名称未核对的成分仍参与安全检查，并标注未核对', () => {
    const p = product('N2', ['Aqua', 'Test Pregnancy Caution'], { inciNameUnverified: ['Test Pregnancy Caution'] });
    const r = scoreProduct(p, profile({ specialStatus: 'pregnant' }), data);
    expect(r.excluded).toBe(true);
    expect(r.exclusions[0]).toMatchObject({ code: 'special_status', unverified: true });
  });
});

describe('刺激风险', () => {
  it('每个刺激标签扣 15 分', () => {
    const r = scoreProduct(leaveOnSample, profile({}), data);
    expect(r.dimensions.irritation.score).toBe(85);
    expect(r.dimensions.irritation.reason.zh).toBe('含香精（香精）');
  });

  it('敏感用户扣分加倍', () => {
    const r = scoreProduct(leaveOnSample, profile({ sensitive: true }), data);
    expect(r.dimensions.irritation.score).toBe(70);
    expect(r.dimensions.irritation.reason.zh).toContain('扣分加倍');
  });

  it('同一标签只扣一次，多个标签叠加', () => {
    const p = product('P6', ['Aqua', 'Parfum', 'Test Essential Oil', 'Test Acid']);
    expect(scoreProduct(p, profile({}), data).dimensions.irritation.score).toBe(55);
  });

  it('孕期标签不算刺激风险', () => {
    const p = product('P7', ['Aqua', 'Test Pregnancy Caution']);
    expect(scoreProduct(p, profile({}), data).dimensions.irritation.score).toBe(100);
  });

  it('强清洁力只在每天洗头时扣分', () => {
    const p = product('P8', ['Aqua', 'Test Strong Surfactant']);
    expect(scoreProduct(p, profile({ washFrequency: 'every_other_day' }), data).dimensions.irritation.score).toBe(100);
    const daily = scoreProduct(p, profile({ washFrequency: 'daily' }), data);
    expect(daily.dimensions.irritation.score).toBe(85);
    expect(daily.dimensions.irritation.reason.zh).toContain('你每天洗头');
  });

  it('冲洗型产品（洗发水）扣分减半，敏感用户加倍仍然生效', () => {
    // sample 是洗发水：香精 15 × 0.5 = 7.5
    const r = scoreProduct(sample, profile({}), data);
    expect(r.dimensions.irritation.score).toBe(93);
    expect(r.dimensions.irritation.reason.zh).toBe('含香精（香精）；冲洗型产品停留时间短，扣分减半');
    // 敏感：15 × 2 × 0.5 = 15
    expect(scoreProduct(sample, profile({ sensitive: true }), data).dimensions.irritation.score).toBe(85);
    // 同样成分的免洗型产品不减半
    expect(scoreProduct(leaveOnSample, profile({}), data).dimensions.irritation.score).toBe(85);
  });

  it('最低 0 分', () => {
    const p = product('P9', ['Parfum', 'Test Essential Oil', 'Test Acid', 'Test Strong Surfactant']);
    expect(scoreProduct(p, profile({ sensitive: true, washFrequency: 'daily' }), data).dimensions.irritation.score).toBe(0);
  });
});

describe('证据强度', () => {
  it('取匹配成分的证据等级，按困扰权重平均', () => {
    const p = product('P10', ['Aqua', 'Piroctone Olamine', 'Test Itch Relief']);
    // 头皮屑：吡罗克酮 A=100；头皮痒：吡罗克酮 A 与 Test C 中取最强 = 100
    expect(scoreProduct(p, profile({ concerns: ['dandruff', 'scalp_itch'] }), data).dimensions.evidence.score).toBe(100);
    const q = product('P11', ['Aqua', 'Piroctone Olamine', 'Test Oil Control']);
    // 头皮屑 A=100、头皮油 B=70，平均加权 = 85
    const r = scoreProduct(q, profile({ concerns: ['dandruff', 'scalp_oil'] }), data);
    expect(r.dimensions.evidence.score).toBe(85);
    expect(r.dimensions.evidence.reason.zh).toBe('证据等级：吡罗克酮乙醇胺盐 A 级、Test Oil Control B 级');
  });

  it('没有匹配成分时不计分', () => {
    const r = scoreProduct(sample, profile({ concerns: ['scalp_oil'] }), data);
    expect(r.dimensions.evidence.score).toBeNull();
  });
});

describe('环境适配', () => {
  const withChelator = product('P12', ['Aqua', 'Test Chelator']);
  it('硬水 + 螯合剂 = 100，硬水无螯合剂 = 50', () => {
    expect(scoreProduct(withChelator, profile({ city: city('hard') }), data).dimensions.environment.score).toBe(100);
    expect(scoreProduct(sample, profile({ city: city('hard') }), data).dimensions.environment.score).toBe(50);
  });
  it('未设城市、水硬度未知、城市数据未核对、软水：中性 50 并说明原因', () => {
    for (const c of [null, city('unknown'), city('hard', 'draft'), city('soft')]) {
      const d = scoreProduct(withChelator, profile({ city: c }), data).dimensions.environment;
      expect(d.score).toBe(50);
      expect(d.reason.zh.length).toBeGreaterThan(0);
    }
    expect(scoreProduct(withChelator, profile({ city: city('hard', 'draft') }), data).dimensions.environment.reason.zh).toContain('未核对');
  });
});

describe('综合分', () => {
  it('四个维度加权：需求 50% + 刺激 25% + 证据 15% + 环境 10%', () => {
    const r = scoreProduct(sample, profile({ concerns: ['dandruff'], city: city('hard') }), data);
    // 洗发水刺激风险 93（香精扣分减半）：100*0.5 + 93*0.25 + 100*0.15 + 50*0.1 = 93.25
    expect(r.score).toBe(93);
    expect(r.dimensions.need.level).toBe('high');
    expect(r.dimensions.environment.level).toBe('medium');
  });

  it('数据不足的维度不计入，其余权重重新归一化', () => {
    const r = scoreProduct(leaveOnSample, profile({}), data);
    // 只有刺激 85 (0.25) 和环境 50 (0.1)：(85*0.25 + 50*0.1) / 0.35 = 75
    expect(r.score).toBe(75);
    expect(weightedTotal(r.dimensions)).toBe(75);
  });

  it('高 / 中 / 低分界为 70 / 40', () => {
    const p = product('P13', ['Aqua', 'Parfum', 'Test Essential Oil', 'Test Acid', 'Test Strong Surfactant']);
    const r = scoreProduct(p, profile({ washFrequency: 'daily' }), data);
    expect(r.dimensions.irritation.score).toBe(40);
    expect(r.dimensions.irritation.level).toBe('medium');
    const s = scoreProduct(p, profile({ washFrequency: 'daily', sensitive: true }), data);
    expect(s.dimensions.irritation.level).toBe('low');
  });
});

describe('硬性过滤', () => {
  const preg = product('P14', ['Aqua', 'Test Pregnancy Caution']);

  it('怀孕 / 备孕 / 哺乳排除含孕期需注意成分的产品', () => {
    for (const s of ['pregnant', 'trying', 'breastfeeding'] as const) {
      const r = scoreProduct(preg, profile({ specialStatus: s }), data);
      expect(r.excluded).toBe(true);
      expect(r.exclusions[0].code).toBe('special_status');
    }
    expect(scoreProduct(preg, profile({}), data).excluded).toBe(false);
  });

  it('孕期提示对所有人被动显示', () => {
    const r = scoreProduct(preg, profile({}), data);
    expect(r.notices.find((n) => n.code === 'pregnancy_notice')?.text.zh).toBe('含Test Pregnancy Caution，孕期或哺乳期请注意');
  });

  it('处方药用 rx_caution 标签，不用孕期标签', () => {
    expect(scoreProduct(preg, profile({ specialStatus: 'rx' }), data).excluded).toBe(false);
    const rx = product('P15', ['Aqua', 'Test Rx Caution']);
    expect(scoreProduct(rx, profile({ specialStatus: 'rx' }), data).excluded).toBe(true);
  });

  it('想避开的成分按名称匹配，库里没有的成分也能避开', () => {
    expect(scoreProduct(sample, profile({ avoidIngredients: ['fragrance'] }), data).exclusions[0].code).toBe('avoid_ingredient');
    expect(scoreProduct(sample, profile({ avoidIngredients: ['sodium laureth sulfate'] }), data).excluded).toBe(true);
  });

  it('想避开的成分类型直接排除', () => {
    const r = scoreProduct(product('P16', ['Aqua', 'Test Essential Oil']), profile({ avoidTags: ['essential_oil'] }), data);
    expect(r.exclusions.map((e) => e.code)).toEqual(['avoid_tag']);
  });
});

describe('预算（按品类三分位，USD）', () => {
  const item = (id: string, price: number, currency = 'USD', category = 'shampoo') =>
    product(id, ['Aqua'], { category, price, currency });
  // 洗发水 USD 价格 10 / 20 / 30 / 40：33% 分位 = 19.9，67% 分位 = 30.1
  const catalog = [item('A', 10), item('B', 20), item('C', 30), item('D', 40)];
  const caps = computeBudgetCaps(catalog, real.exchangeRates);
  const withCaps = { ...data, budgetCaps: caps };

  it('分位数用线性插值', () => {
    expect(percentile([10, 20, 30, 40], 0.33)).toBeCloseTo(19.9, 10);
    expect(percentile([10, 20, 30, 40], 0.67)).toBeCloseTo(30.1, 10);
    expect(percentile([5], 0.67)).toBe(5);
  });

  it('按品类计算界线，其他币种先换算成 USD', () => {
    expect(caps.shampoo).toEqual({ p33: expect.closeTo(19.9, 10), p67: expect.closeTo(30.1, 10), sampleSize: 4 });
    // 1583.40 JPY = 10 USD，与 10 USD 同价
    const mixed = computeBudgetCaps([item('J', 1583.4, 'JPY'), item('B', 20), item('C', 30), item('D', 40)], real.exchangeRates);
    expect(mixed.shampoo!.p33).toBeCloseTo(19.9, 6);
    // 不同品类分开算；有价格的产品少于 3 个时不提供档位
    const other = computeBudgetCaps([...catalog, item('X', 5, 'USD', 'conditioner')], real.exchangeRates);
    expect(other.conditioner).toBeUndefined();
    // 没有价格或币种不在汇率表的产品不参与计算
    expect(computeBudgetCaps([...catalog, item('E', 999, 'EUR')], real.exchangeRates).shampoo!.sampleSize).toBe(4);
  });

  it('第一档 / 第二档排除超过上限的产品，上限含等于；不限不排除', () => {
    const ok = (p: Product, budget: 'p33' | 'p67' | 'none') => !scoreProduct(p, profile({ budget }), withCaps).excluded;
    expect(ok(item('A', 10), 'p33')).toBe(true);
    expect(ok(item('B', 20), 'p33')).toBe(false);
    expect(ok(item('B', 20), 'p67')).toBe(true);
    expect(ok(item('E', 30.1), 'p67')).toBe(true);
    expect(ok(item('D', 40), 'p67')).toBe(false);
    expect(ok(item('D', 40), 'none')).toBe(true);
    const r = scoreProduct(item('B', 20), profile({ budget: 'p33' }), withCaps);
    expect(r.exclusions[0].text.zh).toBe('价格 20 USD，超出你选的预算上限（约 19.90 USD）');
    const jp = scoreProduct(item('J', 4000, 'JPY'), profile({ budget: 'p33' }), withCaps);
    expect(jp.price).toEqual({ amount: 4000, currency: 'JPY', usd: expect.closeTo(4000 / 158.34, 6) });
    expect(jp.exclusions[0].text.zh).toBe('价格 4000 JPY（约 25.26 USD），超出你选的预算上限（约 19.90 USD）');
  });

  it('品类没有档位、价格未知、汇率表没有该币种：不排除，只提示', () => {
    const cases = [
      item('C1', 999, 'USD', 'conditioner'),
      product('C2', ['Aqua'], { category: 'shampoo', price: null }),
      item('C3', 999, 'EUR'),
    ];
    for (const p of cases) {
      const r = scoreProduct(p, profile({ budget: 'p33' }), withCaps);
      expect(r.excluded).toBe(false);
      expect(r.notices.some((n) => n.code === 'budget_unchecked')).toBe(true);
    }
  });

  it('问卷选项显示算出的上限，换算成用户当地货币', () => {
    const rates = real.exchangeRates;
    const labels = (currency: string) => budgetOptions(caps.shampoo, currency, rates).map((o) => o.label.zh);
    expect(labels('USD')).toEqual(['≤ $20', '≤ $30', '不限']);
    // 19.9 × 6.692 ≈ 133，30.1 × 6.692 ≈ 201
    expect(labels('CNY')).toEqual(['≤ ¥133', '≤ ¥201', '不限']);
    expect(labels('JPY')).toEqual(['≤ ¥3,200', '≤ ¥4,800', '不限']);
    expect(labels('EUR')).toEqual(['≤ $20', '≤ $30', '不限']);
    expect(budgetOptions(undefined, 'CNY', rates).map((o) => o.choice)).toEqual(['none']);
    expect(budgetOptions(caps.shampoo, 'CNY', rates).map((o) => o.choice)).toEqual(['p33', 'p67', 'none']);
    expect(formatMoney(1650, 'JPY', false)).toBe('¥1,650');
    expect(formatMoney(12.5, 'USD', false)).toBe('$12.5');
    expect(formatMoney(1650, 'JPY')).toBe('¥1,700');
    expect(currencyForCountry('JP')).toBe('JPY');
    expect(currencyForCountry('FR')).toBe('USD');
  });
});

describe('使用方式 usage_type', () => {
  const irritation = (p: Product) => scoreProduct(p, profile({}), data).dimensions.irritation.score;

  it('按品类默认值：洗发水、洁面为冲洗型，精华、面霜、护发油为免洗型', () => {
    for (const category of ['shampoo', 'cleanser']) {
      expect(irritation(product(category, ['Parfum'], { category }))).toBe(93);
    }
    for (const category of ['serum', 'moisturizer', 'hair_oil']) {
      expect(irritation(product(category, ['Parfum'], { category }))).toBe(85);
    }
  });

  it('产品填写的值覆盖品类默认值', () => {
    expect(irritation(product('SH-LEAVE', ['Parfum'], { category: 'shampoo', usageType: 'leave_on' }))).toBe(85);
    expect(irritation(product('SERUM-RINSE', ['Parfum'], { category: 'serum', usageType: 'rinse_off' }))).toBe(93);
  });

  it('卸妆、去角质按单个产品填写', () => {
    expect(irritation(product('OIL', ['Parfum'], { category: 'makeup_remover', usageType: 'rinse_off' }))).toBe(93);
    expect(irritation(product('MICELLAR', ['Parfum'], { category: 'makeup_remover', usageType: 'leave_on' }))).toBe(85);
    expect(irritation(product('SCRUB', ['Parfum'], { category: 'exfoliator', usageType: 'rinse_off' }))).toBe(93);
    expect(irritation(product('ACID-TONER', ['Parfum'], { category: 'exfoliator', usageType: 'leave_on' }))).toBe(85);
    // 未填写时按免洗处理（不减半）
    expect(irritation(product('UNSET', ['Parfum'], { category: 'exfoliator' }))).toBe(85);
  });

  it('数据校验：卸妆、去角质未填 usage_type 报错，取值非法报错', () => {
    const msgs = (p: Product) =>
      validateData(real.ingredients, [p], real.cities, real.exchangeRates).filter((i) => i.level === 'error').map((i) => i.message);
    expect(msgs({ ...sample, category: 'exfoliator', usageType: null })).toEqual([
      expect.stringContaining('品类 exfoliator 没有默认使用方式'),
    ]);
    expect(msgs({ ...sample, category: 'makeup_remover', usageType: 'rinse_off' })).toEqual([]);
    expect(msgs({ ...sample, usageType: 'wash' as Product['usageType'] })).toEqual([expect.stringContaining('usage_type 取值 "wash"')]);
    expect(msgs({ ...sample, usageType: null })).toEqual([]);
  });
});

describe('搭配冲突', () => {
  const inUse = product('IN-USE', ['Aqua', 'Test Retinoid', 'Test Severe B'], { nameZh: '晚霜' });

  it('一般冲突不扣分，给出提醒和用法建议', () => {
    const p = product('P18', ['Aqua', 'Test Acid']);
    const before = scoreProduct(p, profile({}), data);
    const r = scoreProduct(p, profile({ inUseProducts: [inUse] }), data);
    expect(r.excluded).toBe(false);
    expect(r.score).toBe(before.score);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatchObject({ severity: 'mild', ingredient: 'Test Acid', inUseIngredient: 'Test Retinoid' });
    expect(r.conflicts[0].text.zh).toContain('建议分开早晚使用');
  });

  it('严重冲突不推荐（双向识别）', () => {
    const p = product('P19', ['Aqua', 'Test Severe A']);
    const r = scoreProduct(p, profile({ inUseProducts: [inUse] }), data);
    expect(r.excluded).toBe(true);
    expect(r.exclusions[0].code).toBe('severe_conflict');
  });
});

describe('排序', () => {
  it('可推荐的按分数降序，无法评分的其次，被排除的最后', () => {
    const products = [
      product('A-excluded', ['Aqua', 'Piroctone Olamine', 'Test Pregnancy Caution'], { category: 'shampoo' }),
      product('B-noscore', ['Unknown Thing'], { category: 'shampoo' }),
      product('C-low', ['Aqua', 'Parfum'], { category: 'shampoo' }),
      product('D-high', ['Aqua', 'Piroctone Olamine'], { category: 'shampoo' }),
      product('E-other-category', ['Aqua'], { category: 'conditioner' }),
    ];
    const ranked = rankProducts(products, 'shampoo', profile({ concerns: ['dandruff'], specialStatus: 'pregnant' }), data);
    expect(ranked.map((r) => r.product.productId)).toEqual(['D-high', 'C-low', 'B-noscore', 'A-excluded']);
  });
});
