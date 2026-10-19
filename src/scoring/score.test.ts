import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import { buildIngredientIndex } from '../data/ingredientIndex';
import { validateData } from '../data/validate';
import type { City, Ingredient, Product } from '../data/types';
import { concernWeights, ingredientStatuses, rankProducts, scoreProduct, weightedTotal, type ScoringProfile } from './score';
import { currencyForCountry } from './price';
import { budgetOptions, computeBudgetCaps, formatMoney, percentile, type BudgetChoice } from './budget';
import { filterByMarket, inMarket, marketForCity } from './market';
import { keyActiveTerms, matchesKeyActive } from '../data/keyActives';

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

// ---------- 用 data/ 里的真实数据（57 个洗发水：美国 47 个，日韩中 10 个） ----------

describe('data/ 真实数据', () => {
  const index = buildIngredientIndex(real.ingredients);
  const budgetCaps = computeBudgetCaps(real.products, real.exchangeRates);
  const strict = { index, exchangeRates: real.exchangeRates, budgetCaps };
  const testMode = { ...strict, allowDraft: true };
  const byId = (id: string) => real.products.find((p) => p.productId === id)!;

  it('CSV 能正确解析，名称已统一', () => {
    // 洗发水 70 款（美国 60、日韩中 10），护发素 37 款
    expect(real.products).toHaveLength(107);
    expect(real.products.filter((p) => p.category === 'conditioner')).toHaveLength(37);
    // 保留原有产品 ID
    for (const id of ['SH-US-001', 'SH-US-008', 'SH-JP-001', 'SH-KR-003', 'SH-CN-002']) expect(byId(id)).toBeDefined();
    const us1 = byId('SH-US-001');
    expect(us1.inciList[0]).toBe('Pyrithione Zinc');
    expect(us1.keyActives).toEqual(['Pyrithione Zinc 1%', 'Ceramides', 'Hyaluronic Acid', 'Niacinamide']);
    expect(us1.claimedBenefits).toEqual(['dandruff', 'sensitive_scalp']);
    expect(us1.awards[0]).toMatchObject({ source: 'Cosmopolitan Holy Grail Beauty Awards', year: '2025' });
    expect(us1.sizeMl).toBe(355);
    expect(us1.purchaseUrl).toContain('ulta.com/p/');
    expect(us1.imageUrl).toBe('');
    expect(us1.fragranceFreeClaim).toBe('unknown');
    // 品牌没有单独公布主打成分
    expect(byId('SH-US-014').keyActivesDisclosed).toBe(false);
    expect(byId('SH-US-014').keyActives).toEqual([]);
    expect(byId('SH-JP-001').inciNameUnverified).toContain('Bis-Methoxypropylamido Isodocosane');
    expect(byId('SH-CN-001').channels).toEqual(['天猫旗舰店']);
    expect(byId('SH-CN-001').formulaNote).toContain('渠道备注：具体商品链接待核验');
    expect(index.get('Glycine Max (Soybean) Oil')?.inciName).toBe('Glycine Soja Oil');
  });

  it('数据校验没有格式错误', () => {
    expect(validateData(real.ingredients, real.products, real.cities, real.exchangeRates).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('数据校验能发现未知品类和汇率表缺少的币种', () => {
    const bad = { ...byId('SH-US-001'), productId: 'BAD-1', category: 'shampooo', currency: 'EUR', pairedProductIds: [] };
    const errors = validateData(real.ingredients, [bad], real.cities, real.exchangeRates).filter((i) => i.level === 'error');
    expect(errors.map((e) => e.message)).toEqual([
      expect.stringContaining('category 取值 "shampooo"'),
      expect.stringContaining('currency "EUR" 不在 exchange_rates.csv'),
    ]);
  });

  it('没有价格的产品不参与三分位计算', () => {
    expect(budgetCaps.shampoo!.sampleSize).toBe(67);
  });

  it('关闭测试模式时，draft 有效成分不参与需求匹配（只剩资料分类的产品定位）；基础成分无需核对即可使用', () => {
    const r = scoreProduct(byId('SH-US-001'), profile({ concerns: ['dandruff'] }), strict);
    expect(r.dimensions.need.score).toBe(70);
    expect(r.dimensions.need.reason.zh).toBe('针对头皮屑：资料分类');
    expect(r.dimensions.evidence.score).toBeNull(); // 只有资料分类：数据缺失，不计入
    expect(r.dimensions.evidence.reason.zh).toContain('暂无成分或测试证据');
    expect(r.unverifiedIngredients).toContain('Pyrithione Zinc');
    expect(r.unverifiedIngredients).not.toContain('Water'); // Aqua 是基础成分
    expect(r.usesDraftData).toBe(false);
    expect(r.notices.some((n) => n.code === 'test_data')).toBe(false);
  });

  it('测试模式下 draft 成分参与打分，并标注测试数据', () => {
    const r = scoreProduct(byId('SH-US-001'), profile({ concerns: ['dandruff'] }), testMode);
    expect(r.dimensions.need.score).toBe(100);
    expect(r.dimensions.evidence.score).toBe(100); // 吡硫鎓锌 A 级
    expect(r.usesDraftData).toBe(true);
    expect(r.notices.find((n) => n.code === 'test_data')?.text.zh).toContain('测试数据，尚未核对');
    // [待核对] 的成分即使在测试模式下也不参与打分
    const jp = scoreProduct(byId('SH-JP-001'), profile({}), testMode);
    expect(jp.nameUnverifiedIngredients).toEqual(['Bis-Methoxypropylamido Isodocosane', 'Gamma-Docosalactone', 'Sodium Dilauramidoglutamide Lysine']);
  });

  it('测试模式下按头皮屑排序，含去屑成分的产品都排在不含的前面', () => {
    const ranked = rankProducts(real.products, 'shampoo', profile({ concerns: ['dandruff'] }), testMode);
    const need = ranked.map((r) => r.dimensions.need.score);
    expect(need).toEqual([...need].sort((a, b) => (b ?? 0) - (a ?? 0)));
    const matched = ranked.filter((r) => r.dimensions.need.score === 100).map((r) => r.product.productId);
    for (const id of ['SH-US-001', 'SH-US-042', 'SH-US-043', 'SH-US-044', 'SH-KR-004', 'SH-CN-001']) expect(matched).toContain(id);
    expect(ranked[0].dimensions.need.score).toBe(100);
  });

  it('安全相关的过滤也看 draft 成分，并标注未核对', () => {
    const r = scoreProduct(byId('SH-US-003'), profile({ avoidTags: ['fragrance'] }), strict);
    expect(r.excluded).toBe(true);
    expect(r.exclusions[0]).toMatchObject({ code: 'avoid_tag', unverified: true });
    expect(r.exclusions[0].text.zh).toContain('未核对');
    // 吡硫鎓锌带孕期需注意标签，排除和提示都说明这是谨慎处理及原因
    const preg = scoreProduct(byId('SH-US-001'), profile({ specialStatus: 'pregnant' }), strict).exclusions[0];
    expect(preg.code).toBe('special_status');
    expect(preg.text.zh).toContain('为谨慎起见，怀孕期间不推荐');
    expect(preg.text.zh).toContain('欧盟自 2022 年起以生殖毒性分类');
    expect(preg.text.zh).toContain('美国目前仍批准其作为非处方（OTC）去屑成分');
    const notice = scoreProduct(byId('SH-US-001'), profile({}), strict).notices.find((n) => n.code === 'pregnancy_notice')!;
    expect(notice.text.zh).toContain('谨慎提示，不代表确定有害');
    expect(notice.text.en).toContain('still approves it as an over-the-counter');
  });

  it('没有价格的产品只在"不限"档出现', () => {
    const kr = byId('SH-KR-003');
    const r = scoreProduct(kr, profile({ budget: 'q2' }), strict);
    expect(r.exclusions.map((e) => e.code)).toEqual(['price_unknown']);
    expect(r.exclusions[0].text.zh).toBe('价格未知，只在预算选"不限"时显示');
    expect(scoreProduct(kr, profile({ budget: 'none' }), strict).excluded).toBe(false);
  });
});

describe('按市场筛选', () => {
  const shampoos = real.products.filter((p) => p.category === 'shampoo');
  const ids = (ps: Product[]) => ps.map((p) => p.productId);
  const cityIn = (country: string): City => ({
    city: 'X', country, waterHardness: 'unknown', water: [], reviewStatus: 'draft',
  });

  it('默认市场取档案城市所在国家，只显示该市场的版本', () => {
    expect(marketForCity(cityIn('JP'))).toBe('JP');
    // 第一阶段默认美国市场
    expect(marketForCity(cityIn('FR'))).toBe('US');
    expect(marketForCity(null)).toBe('US');
    const us = filterByMarket(shampoos, 'US', false);
    expect(ids(us.shown).every((id) => id.startsWith('SH-US'))).toBe(true);
    expect(us.shown).toHaveLength(60);
    expect(us.hiddenCount).toBe(10);
    expect(filterByMarket(shampoos, 'JP', false).shown).toHaveLength(4);
  });

  it('打开"显示其他地区版本"后显示全部；没有市场时不筛选', () => {
    expect(filterByMarket(shampoos, 'US', true).shown).toHaveLength(70);
    expect(filterByMarket(shampoos, null, false)).toEqual({ shown: shampoos, hiddenCount: 0 });
  });

  it('中国市场同时显示国内能买到的进口版本', () => {
    const imported = { ...shampoos[0], productId: 'SH-US-IMPORT', availableInCn: 'cross_border' as const };
    const notSold = { ...shampoos[0], productId: 'SH-US-NOT', availableInCn: 'unknown' as const };
    const cn = filterByMarket([...shampoos, imported, notSold], 'CN', false);
    expect(ids(cn.shown)).toEqual(['SH-CN-001', 'SH-CN-002', 'SH-US-IMPORT']);
    expect(inMarket(imported, 'US')).toBe(true);
  });
});

// ---------- 测试专用数据：部分成分取自成分库并改为 verified；Test 开头的成分是虚构的 ----------

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
  verify(realIng('Fragrance')),
  verify(realIng('Glycerin')),
  fake('Aqua', { aliases: ['Water'] }),
  fake('Test Chelator', { functions: ['chelating'], chelator: true }),
  fake('Test Function Chelator', { functions: ['chelating'] }),
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

// 测试用的虚构洗发水
const sample: Product = {
  productId: 'SH-T-000', brand: 'Test', nameEn: 'Test Shampoo', nameZh: '测试洗发水', zone: 'scalp', category: 'shampoo',
  usageType: null, subtype: null, region: 'US', formulaNote: '', channels: [], inclusionBasis: '', inclusionBasisType: null,
  awards: [], claimedBenefits: [], claimSource: null, brandClaims: { text: '', quote: '', sourceUrl: '', status: null, targets: [] }, testedClaims: [], fragranceFreeSourceUrl: '', fragranceFreeClaim: 'unknown',
  inciList: ['Aqua', 'Sodium Laureth Sulfate', 'Glycerin', 'Piroctone Olamine', 'Parfum'], inciNameUnverified: [], keyActives: [],
  keyActivesDisclosed: true,
  inciListOriginal: '', price: 12, currency: 'USD', sizeMl: null, availableInCn: 'unknown', transparency: 'medium',
  sourceUrls: [], purchaseUrl: '', pairedProductIds: [], imageUrl: '', imageSource: '', imageLicense: '', imageLicenseUrl: '', imageAttribution: '', reviewedOn: '', ratings: [], purchaseLinks: [],
};
// 默认用免洗型品类，刺激风险不减半；需要冲洗型时显式传 category: 'shampoo'
const product = (id: string, inciList: string[], extra: Partial<Product> = {}): Product => ({
  ...sample, productId: id, nameZh: id, nameEn: id, category: 'scalp_care', inciList, ...extra,
});
const leaveOnSample = product('LEAVE-ON', sample.inciList);
const city = (waterHardness: City['waterHardness'], reviewStatus: City['reviewStatus'] = 'verified'): City => ({
  city: 'Testville', country: 'US', waterHardness, water: [], reviewStatus,
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
    expect(r.dimensions.need.reason.zh).toContain('针对头皮屑：没有找到依据');
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

describe('主打有效成分 key_actives', () => {
  it('主打成分覆盖的困扰按满分，只有非主打成分覆盖的按 30% 计', () => {
    // 头皮屑由主打的吡罗克酮覆盖（满分），头皮油只由非主打的 Test Oil Control 覆盖（30%）
    const p = product('K1', ['Aqua', 'Piroctone Olamine', 'Test Oil Control'], { keyActives: ['Piroctone Olamine'] });
    const r = scoreProduct(p, profile({ concerns: ['dandruff', 'scalp_oil'] }), data);
    expect(r.dimensions.need.score).toBe(65); // (1 + 0.3) / 2
    expect(r.dimensions.need.reason.zh).toBe('针对头皮屑：含吡罗克酮乙醇胺盐（主打）；针对头皮油：含Test Oil Control（非主打，按 30% 计）');
    expect(r.notices.some((n) => n.code === 'key_actives_missing')).toBe(false);
  });

  it('非主打的有效成分不再归零', () => {
    const p = product('K2', ['Aqua', 'Piroctone Olamine'], { keyActives: ['Test Oil Control'] });
    expect(scoreProduct(p, profile({ concerns: ['dandruff'] }), data).dimensions.need.score).toBe(30);
  });

  it('主打成分按别名和大小写匹配', () => {
    const p = product('K3', ['Aqua', 'Piroctone Olamine'], { keyActives: ['OCTOPIROX'] });
    expect(scoreProduct(p, profile({ concerns: ['dandruff'] }), data).dimensions.need.score).toBe(100);
  });

  it('还没填写主打成分时按满分计算，并提示', () => {
    const r = scoreProduct(product('K4', ['Aqua', 'Piroctone Olamine']), profile({ concerns: ['dandruff'] }), data);
    expect(r.dimensions.need.score).toBe(100);
    expect(r.dimensions.need.reason.zh).toBe('针对头皮屑：含吡罗克酮乙醇胺盐');
    expect(r.notices.some((n) => n.code === 'key_actives_missing')).toBe(true);
  });

  it('品牌写法：去掉浓度、复数匹配单数开头的成分、括号内容单独匹配、常见俗名对应 INCI', () => {
    const terms = (k: string[]) => k.flatMap(keyActiveTerms);
    expect(matchesKeyActive('Pyrithione Zinc', null, terms(['Pyrithione Zinc 1%']))).toBe(true);
    expect(matchesKeyActive('Ceramide NP', null, terms(['Ceramides']))).toBe(true);
    expect(matchesKeyActive('sh-Oligopeptide-78', null, terms(['K18PEPTIDE (sh-Oligopeptide-78)']))).toBe(true);
    expect(matchesKeyActive('Sodium Hyaluronate', null, terms(['Hyaluronic Acid']))).toBe(true);
    expect(matchesKeyActive('Hydrolyzed Keratin', null, terms(['Keratin']))).toBe(true);
    // 单数写法不匹配以它开头的其他成分（Glycine ≠ Glycine Soja Oil）
    expect(matchesKeyActive('Glycine Soja Oil', null, terms(['Glycine']))).toBe(false);
    expect(matchesKeyActive('Niacinamide', null, terms(['Ceramides']))).toBe(false);
  });

  it('没有单独公布主打成分（Not separately disclosed）时，有效成分都按非主打计分', () => {
    const p = product('K5', ['Aqua', 'Piroctone Olamine'], { keyActives: [], keyActivesDisclosed: false });
    const r = scoreProduct(p, profile({ concerns: ['dandruff'] }), data);
    expect(r.dimensions.need.score).toBe(30);
    expect(r.notices.some((n) => n.code === 'key_actives_missing')).toBe(false);
  });

  it('数据校验：对应不上成分表的主打成分只给提示，不报错', () => {
    const base = real.products.find((x) => x.productId === 'SH-US-001')!;
    const issues = (keyActives: string[]) =>
      validateData(real.ingredients, [{ ...base, keyActives }], real.cities, real.exchangeRates).filter((i) => i.message.includes('key_actives'));
    expect(issues(['Pyrithione Zinc 1%', 'zinc pyrithione'])).toEqual([]);
    expect(issues(['OLAPLEX Bond Building Technology'])).toEqual([
      expect.objectContaining({ level: 'warning', message: expect.stringContaining('OLAPLEX Bond Building Technology') }),
    ]);
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
    // 常用造型产品（每周 3 次以上）且每天洗头：不因强清洁力扣分
    expect(scoreProduct(p, profile({ washFrequency: 'daily', frequentStyling: true }), data).dimensions.irritation.score).toBe(100);
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
    expect(r.dimensions.evidence.reason.zh).toBe('依据：吡罗克酮乙醇胺盐 A 级、Test Oil Control B 级');
  });

  it('没有匹配成分时不计分', () => {
    const r = scoreProduct(sample, profile({ concerns: ['scalp_oil'] }), data);
    expect(r.dimensions.evidence.score).toBeNull();
  });
});

describe('环境适配', () => {
  const withChelator = product('P12', ['Aqua', 'Test Chelator']);
  it('硬水 + 螯合剂（清单上的）= 100，硬水无螯合剂 = 50；只登记了 chelating 功能不算', () => {
    expect(scoreProduct(withChelator, profile({ city: city('hard') }), data).dimensions.environment.score).toBe(100);
    const fnOnly = product('P12b', ['Aqua', 'Test Function Chelator']);
    expect(scoreProduct(fnOnly, profile({ city: city('hard') }), data).dimensions.environment.score).toBe(50);
    expect(scoreProduct(sample, profile({ city: city('hard') }), data).dimensions.environment.score).toBe(50);
  });
  it('未设城市、水硬度未知、城市数据未核对、软水：不计分并说明原因', () => {
    for (const c of [null, city('unknown'), city('hard', 'draft'), city('soft')]) {
      const d = scoreProduct(withChelator, profile({ city: c }), data).dimensions.environment;
      expect(d.score).toBeNull();
      expect(d.state).toBe('not_scored');
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
    // 未设城市，环境不计分；需求、证据无数据：只剩刺激 85
    expect(r.dimensions.environment.score).toBeNull();
    expect(r.score).toBe(85);
    expect(weightedTotal(r.dimensions)).toBe(85);
    const hard = scoreProduct(leaveOnSample, profile({ city: city('hard') }), data);
    // 刺激 85 (0.25) 和环境 50 (0.1)：(85*0.25 + 50*0.1) / 0.35 = 75
    expect(hard.score).toBe(75);
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
    expect(r.notices.find((n) => n.code === 'pregnancy_notice')?.text.zh).toBe('含Test Pregnancy Caution，孕期或哺乳期请注意（谨慎提示，不代表确定有害）。');
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

  it('按品类计算四分位界线，其他币种先换算成 USD', () => {
    expect(caps.shampoo).toEqual({ q1: expect.closeTo(17.5, 10), q2: expect.closeTo(25, 10), q3: expect.closeTo(32.5, 10), sampleSize: 4 });
    // 1583.40 JPY = 10 USD，与 10 USD 同价
    const mixed = computeBudgetCaps([item('J', 1583.4, 'JPY'), item('B', 20), item('C', 30), item('D', 40)], real.exchangeRates);
    expect(mixed.shampoo!.q1).toBeCloseTo(17.5, 6);
    // 不同品类分开算；有价格的产品少于 3 个时不提供档位
    const other = computeBudgetCaps([...catalog, item('X', 5, 'USD', 'conditioner')], real.exchangeRates);
    expect(other.conditioner).toBeUndefined();
    // 没有价格或币种不在汇率表的产品不参与计算
    expect(computeBudgetCaps([...catalog, item('E', 999, 'EUR')], real.exchangeRates).shampoo!.sampleSize).toBe(4);
  });

  it('价格区间：不含下界、含上界；区间外的产品排除；不限不排除', () => {
    const ok = (p: Product, budget: BudgetChoice) => !scoreProduct(p, profile({ budget }), withCaps).excluded;
    expect(ok(item('A', 10), 'q1')).toBe(true);
    expect(ok(item('A', 17.5), 'q1')).toBe(true);
    expect(ok(item('B', 20), 'q1')).toBe(false);
    expect(ok(item('A', 17.5), 'q2')).toBe(false);
    expect(ok(item('B', 20), 'q2')).toBe(true);
    expect(ok(item('B', 25), 'q2')).toBe(true);
    expect(ok(item('C', 30), 'q3')).toBe(true);
    expect(ok(item('D', 40), 'q3')).toBe(false);
    expect(ok(item('D', 40), 'q4')).toBe(true);
    expect(ok(item('A', 10), 'q4')).toBe(false);
    expect(ok(item('D', 40), 'none')).toBe(true);
    const r = scoreProduct(item('B', 20), profile({ budget: 'q1' }), withCaps);
    expect(r.exclusions[0]).toMatchObject({ code: 'over_budget' });
    expect(r.exclusions[0].text.zh).toBe('价格 20 USD，超出你选的预算上限（约 17.50 USD）');
    const low = scoreProduct(item('A', 10), profile({ budget: 'q4' }), withCaps);
    expect(low.exclusions[0]).toMatchObject({ code: 'below_budget' });
    expect(low.exclusions[0].text.zh).toBe('价格 10 USD，低于你选的价格区间（约 32.50 USD 以上）');
    const jp = scoreProduct(item('J', 4000, 'JPY'), profile({ budget: 'q1' }), withCaps);
    expect(jp.price).toEqual({ amount: 4000, currency: 'JPY', usd: expect.closeTo(4000 / 158.34, 6) });
    expect(jp.exclusions[0].text.zh).toBe('价格 4000 JPY（约 25.26 USD），超出你选的预算上限（约 17.50 USD）');
    // 自填上限：只有上限
    expect(scoreProduct(item('A', 10), profile({ budget: 'custom', customBudgetUsd: 12 }), withCaps).excluded).toBe(false);
  });

  it('品类没有档位：不排除，只提示；价格未知或汇率表没有该币种：只在"不限"档出现', () => {
    const noCaps = scoreProduct(item('C1', 999, 'USD', 'conditioner'), profile({ budget: 'q1' }), withCaps);
    expect(noCaps.excluded).toBe(false);
    expect(noCaps.notices.some((n) => n.code === 'budget_unchecked')).toBe(true);
    for (const p of [product('C2', ['Aqua'], { category: 'shampoo', price: null }), item('C3', 999, 'EUR')]) {
      expect(scoreProduct(p, profile({ budget: 'q1' }), withCaps).exclusions.map((e) => e.code)).toEqual(['price_unknown']);
      expect(scoreProduct(p, profile({ budget: 'none' }), withCaps).excluded).toBe(false);
    }
  });

  it('问卷选项只显示算出的价格区间（不起名字），换算成用户当地货币', () => {
    const rates = real.exchangeRates;
    const labels = (currency: string) => budgetOptions(caps.shampoo, currency, rates).map((o) => o.label.zh);
    expect(labels('USD')).toEqual(['≤ $18', '$18–25', '$25–33', '$33 以上', '不限']);
    expect(budgetOptions(caps.shampoo, 'USD', rates).map((o) => o.label.en)).toEqual(['≤ $18', '$18–25', '$25–33', 'Over $33', 'No limit']);
    // 17.5 × 6.692 ≈ 117，25 × 6.692 ≈ 167，32.5 × 6.692 ≈ 217
    expect(labels('CNY')).toEqual(['≤ ¥117', '¥117–167', '¥167–217', '¥217 以上', '不限']);
    expect(labels('EUR')).toEqual(['≤ $18', '$18–25', '$25–33', '$33 以上', '不限']);
    expect(budgetOptions(undefined, 'CNY', rates).map((o) => o.choice)).toEqual(['none']);
    // 区间是否为空按 USD 原值判断：取整后相同但原值不同时保留，并改用不取整的金额显示
    const close = { q1: 10.2, q2: 10.4, q3: 30, sampleSize: 9 };
    expect(budgetOptions(close, 'USD', rates).map((o) => o.label.zh)).toEqual(['≤ $10.20', '$10.20–10.40', '$10.40–30', '$30 以上', '不限']);
    // 原值相等的区间为空，去掉
    expect(budgetOptions({ q1: 10, q2: 10, q3: 30, sampleSize: 9 }, 'USD', rates).map((o) => o.choice)).toEqual(['q1', 'q3', 'q4', 'none']);
    expect(budgetOptions(caps.shampoo, 'CNY', rates).map((o) => o.choice)).toEqual(['q1', 'q2', 'q3', 'q4', 'none']);
    expect(formatMoney(1650, 'JPY', false)).toBe('¥1,650');
    expect(formatMoney(12.5, 'USD', false)).toBe('$12.50');
    expect(formatMoney(12, 'USD', false)).toBe('$12');
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

describe('证据缺失时总分封顶', () => {
  // 两款都只针对头皮痒：一款有 C 级成分，一款只有资料分类（需求匹配 0.7）
  const cLevel = product('CAP-C', ['Aqua', 'Test Itch Relief'], { keyActives: ['Test Itch Relief'] });
  const claimOnly = product('CAP-CLAIM', ['Aqua', 'Glycerin'], { claimedBenefits: ['scalp_itch'], claimSource: 'data_classification', keyActives: ['Glycerin'] });
  const prof = profile({ concerns: ['scalp_itch'] });

  it('只有资料分类的产品最多与 C 级证据产品打平，不反超', () => {
    const c = scoreProduct(cLevel, prof, data);
    const claim = scoreProduct(claimOnly, prof, data);
    expect(c.dimensions.evidence.score).toBe(40);
    expect(claim.dimensions.evidence.score).toBeNull();
    // 不封顶时：(70*0.5 + 100*0.25) / 0.75 = 80；封顶按证据 40：(70*0.5 + 100*0.25 + 40*0.15) / 0.9 = 73
    expect(claim.score).toBe(73);
    expect(claim.evidenceCapped).toBe(true);
    expect(claim.dimensions.evidence.reason.zh).toContain('总分上限按证据弱');
    expect(claim.score!).toBeLessThanOrEqual(c.score!);
  });

  it('封顶后的分数正好等于"证据按 C 级计"的结果，不额外扣分', () => {
    const r = scoreProduct(claimOnly, prof, data);
    const asC = weightedTotal({ ...r.dimensions, evidence: { ...r.dimensions.evidence, score: 40 } });
    expect(r.score).toBe(asC);
  });
});

describe('没有选任何需求', () => {
  it('不给适合等级；按温和程度、价格排序', () => {
    const list = [
      product('G1', ['Aqua', 'Parfum'], { category: 'shampoo', price: 5 }),
      product('G2', ['Aqua', 'Glycerin'], { category: 'shampoo', price: 20 }),
      product('G3', ['Aqua', 'Glycerin'], { category: 'shampoo', price: 10 }),
    ];
    const ranked = rankProducts(list, 'shampoo', profile({}), data);
    expect(ranked.map((r) => r.product.productId)).toEqual(['G3', 'G2', 'G1']);
    expect(ranked.every((r) => r.noNeeds && r.fitLevel === null && !r.lowMatch)).toBe(true);
  });

  it('选了需求时，需求匹配为 0 的产品标为不太匹配，排在推荐之后', () => {
    const list = [
      product('M1', ['Aqua', 'Glycerin'], { category: 'shampoo' }),
      product('M2', ['Aqua', 'Test Itch Relief'], { category: 'shampoo', keyActives: ['Test Itch Relief'] }),
    ];
    const ranked = rankProducts(list, 'shampoo', profile({ concerns: ['scalp_itch'] }), data);
    expect(ranked.map((r) => [r.product.productId, r.lowMatch])).toEqual([['M2', false], ['M1', true]]);
  });
});

describe('无法评分的产品', () => {
  it('没有可用成分数据时不标为"不太匹配"', () => {
    const r = scoreProduct(product('NODATA', ['Unknown Thing A', 'Unknown Thing B']), profile({ concerns: ['scalp_itch'] }), data);
    expect(r.score).toBeNull();
    expect(r.dimensions.need.score).toBeNull();
    expect(r.lowMatch).toBe(false);
  });
});
