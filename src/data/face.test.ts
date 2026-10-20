import { describe, expect, it } from 'vitest';
import { parseProducts, parsePurchaseLinks, parseRetailRatings } from './parse';
import { loadDataFromDisk } from './node';
import { validateData } from './validate';
import { visibleRatings } from './retail';
import { usageTypeOf, type Product } from './types';

const real = loadDataFromDisk();
const issuesOf = (products: Product[], level: 'error' | 'warning') =>
  validateData(real.ingredients, products, real.cities, real.exchangeRates)
    .filter((i) => i.level === level)
    .map((i) => i.message);
const errorsOf = (products: Product[]) => issuesOf(products, 'error');
const warningsOf = (products: Product[]) => issuesOf(products, 'warning');

const BASE_COLS =
  'product_id,brand,name_en,name_zh,zone,category,usage_type,region,brand_claims,brand_claims_quote,brand_claims_source_url,brand_claims_status,brand_claim_targets,inci_list,price,currency,available_in_cn,transparency,purchase_url,reviewed_on';
const FACE_COLS =
  'skin_type_claim,texture,spf,broad_spectrum,water_resistance,active_concentrations,use_time,use_frequency,non_comedogenic_claim,face_step_note';

/** 按列名拼一行：base 是前 20 列的覆盖值，face 是 10 列面部属性 */
function product(base: Record<string, string>, face: Record<string, string> = {}, withFaceCols = true): Product {
  const defaults: Record<string, string> = {
    product_id: 'SU-US-001', brand: 'B', name_en: 'N', name_zh: '名', zone: 'face', category: 'sunscreen', usage_type: '',
    region: 'US', brand_claims: '', brand_claims_quote: '', brand_claims_source_url: '', brand_claims_status: '', brand_claim_targets: '',
    inci_list: 'Aqua;Glycerin;Salicylic Acid', price: '20', currency: 'USD', available_in_cn: 'unknown', transparency: 'high',
    purchase_url: 'https://shop.example/p', reviewed_on: '2026-10-19',
  };
  const b = { ...defaults, ...base };
  const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const baseRow = BASE_COLS.split(',').map((c) => quote(b[c] ?? '')).join(',');
  const faceRow = FACE_COLS.split(',').map((c) => quote(face[c] ?? '')).join(',');
  const text = withFaceCols ? `${BASE_COLS},${FACE_COLS}\n${baseRow},${faceRow}\n` : `${BASE_COLS}\n${baseRow}\n`;
  return parseProducts(text)[0];
}

describe('面部属性列', () => {
  it('洗护产品这些列为空，不报错', () => {
    expect(errorsOf(real.products.filter((p) => p.zone !== 'face'))).toEqual([]);
    expect(real.products[0].face?.broadSpectrum).toBe('unknown');
  });

  it('没有这些列、或这些列为空时取默认值', () => {
    for (const p of [product({}, {}, false), product({})]) {
      expect(p.face).toEqual({
        skinTypeClaim: [], texture: null, spf: null, broadSpectrum: 'unknown', waterResistance: 'unknown',
        activeConcentrations: [], useTime: 'unknown', useFrequency: '', nonComedogenicClaim: 'unknown', faceStepNote: '',
      });
    }
  });

  it('洗护产品新列为空时不报错，也不提示', () => {
    const p = product({ product_id: 'SH-US-999', zone: 'scalp', category: 'shampoo' });
    expect(errorsOf([p])).toEqual([]);
    expect(warningsOf([p]).filter((m) => m.includes('面部'))).toEqual([]);
  });

  it('完整填写的防晒解析正确、没有错误', () => {
    const p = product(
      { brand_claims: 'Broad Spectrum SPF 50, non-comedogenic', brand_claims_quote: 'Broad Spectrum SPF 50, non-comedogenic',
        brand_claims_source_url: 'https://brand.example/p', brand_claims_status: 'brand_page_quote' },
      { skin_type_claim: 'oily; Sensitive', texture: 'lotion', spf: '50', broad_spectrum: 'yes', water_resistance: '80',
        active_concentrations: 'Salicylic Acid|0.5%|https://brand.example/p', use_time: 'am',
        use_frequency: 'Apply 15 minutes before sun exposure', non_comedogenic_claim: 'yes', face_step_note: 'Last step of your AM routine' },
    );
    expect(p.face).toMatchObject({
      skinTypeClaim: ['oily', 'sensitive'], texture: 'lotion', spf: 50, broadSpectrum: 'yes', waterResistance: '80', useTime: 'am',
      activeConcentrations: [{ inci: 'Salicylic Acid', concentration: '0.5%', url: 'https://brand.example/p' }],
      useFrequency: 'Apply 15 minutes before sun exposure', nonComedogenicClaim: 'yes',
    });
    expect(errorsOf([p])).toEqual([]);
  });

  it('取值不在范围内报错', () => {
    const p = product({}, { skin_type_claim: 'oily;teen', texture: 'mousse', broad_spectrum: 'maybe', water_resistance: '60', use_time: 'night', non_comedogenic_claim: 'y' });
    const errors = errorsOf([p]);
    for (const field of ['skin_type_claim', 'texture', 'broad_spectrum', 'water_resistance', 'use_time', 'non_comedogenic_claim']) {
      expect(errors).toContainEqual(expect.stringContaining(`${field} 取值`));
    }
  });

  it('spf 必须为正数，且只有防晒填写', () => {
    expect(errorsOf([product({}, { spf: 'high' })])).toEqual([expect.stringContaining('spf 应为正数')]);
    expect(errorsOf([product({}, { spf: '-5' })])).toEqual([expect.stringContaining('spf 应为正数')]);
    expect(errorsOf([product({ product_id: 'MO-US-001', category: 'moisturizer' }, { spf: '30' })]))
      .toEqual([expect.stringContaining('spf 只有 sunscreen 填写')]);
    expect(warningsOf([product({})])).toContainEqual(expect.stringContaining('防晒缺少 spf'));
  });

  it('active_concentrations 三项都要填，成分应在成分表里', () => {
    expect(errorsOf([product({}, { active_concentrations: 'Salicylic Acid|2%' })]))
      .toEqual([expect.stringContaining('INCI|浓度|链接')]);
    expect(errorsOf([product({}, { active_concentrations: 'Salicylic Acid|some|https://a.example' })]))
      .toEqual([expect.stringContaining('浓度应含数字')]);
    expect(warningsOf([product({}, { active_concentrations: 'Niacinamide|5%|https://a.example' })]))
      .toContainEqual(expect.stringContaining('"Niacinamide" 在 inci_list 中找不到'));
  });

  it('non_comedogenic_claim = yes 必须有出处', () => {
    expect(errorsOf([product({}, { non_comedogenic_claim: 'yes' })]))
      .toEqual([expect.stringContaining('brand_claims_source_url')]);
  });
});

describe('面部品类与编号', () => {
  it('新品类的默认使用方式：点涂、眼霜、面油为免洗，面膜必须填写', () => {
    for (const category of ['spot_treatment', 'eye_cream', 'face_oil']) {
      expect(usageTypeOf({ category, usageType: null })).toBe('leave_on');
    }
    const mask = product({ product_id: 'MA-US-001', category: 'mask' });
    expect(errorsOf([mask])).toEqual([expect.stringContaining('品类 mask 没有默认使用方式')]);
    expect(errorsOf([{ ...mask, usageType: 'rinse_off' }])).toEqual([]);
  });

  it('ID 前缀与品类、地区一致', () => {
    const cases: [string, string][] = [
      ['cleanser', 'CL'], ['moisturizer', 'MO'], ['sunscreen', 'SU'], ['serum', 'SE'], ['exfoliator', 'EX'],
      ['spot_treatment', 'ST'], ['eye_cream', 'EY'], ['face_oil', 'FO'], ['mask', 'MA'],
    ];
    for (const [category, prefix] of cases) {
      const p = product({ product_id: `${prefix}-US-001`, category, usage_type: 'leave_on' });
      expect(errorsOf([p])).toEqual([]);
    }
    expect(errorsOf([product({ product_id: 'SN-US-001' })])).toEqual([expect.stringContaining('SU-US-序号')]);
    expect(errorsOf([product({ product_id: 'SU-JP-001' })])).toEqual([expect.stringContaining('SU-US-序号')]);
    expect(errorsOf([product({ product_id: 'SU-US-1' })])).toEqual([expect.stringContaining('SU-US-序号')]);
  });

  it('面部品类的 zone 必须为 face，需求代码必须是面部代码', () => {
    expect(errorsOf([product({ zone: 'scalp' })])).toEqual([expect.stringContaining('zone 应为 face')]);
    const p = product({
      brand_claims: 'Hydrating', brand_claims_quote: 'Hydrating', brand_claims_source_url: 'https://brand.example/p',
      brand_claims_status: 'brand_page_quote', brand_claim_targets: 'dryness;dandruff',
    });
    expect(errorsOf([p])).toEqual([expect.stringContaining('面部产品的需求代码')]);
  });

  it('品牌宣称原文含对应表里的说法、但没填需求代码时提示', () => {
    const p = product({
      brand_claims: 'Oil-control, mattifying sunscreen that minimizes the look of pores',
      brand_claims_quote: 'Oil-control, mattifying sunscreen that minimizes the look of pores',
      brand_claims_source_url: 'https://brand.example/p', brand_claims_status: 'brand_page_quote', brand_claim_targets: 'oil',
    });
    const hints = warningsOf([p]).filter((m) => m.includes('brand_claim_targets 里没有'));
    expect(hints).toEqual([expect.stringContaining('pores')]);
  });
});

describe('购买平台写法', () => {
  it('neimanmarcus、bergdorf 等写法统一为现有平台代码', () => {
    const links = parsePurchaseLinks('product_id,platform,url\nX,neimanmarcus,https://www.neimanmarcus.com/p\nX,Bergdorf,https://www.bergdorfgoodman.com/p\nX,saks,https://www.saksfifthavenue.com/p\n');
    expect(links.map((l) => l.platform)).toEqual(['neiman_marcus', 'bergdorf_goodman', 'saks']);
    const ratings = parseRetailRatings('product_id,platform,rating\nX,nordstrom,4.5\nX,bluemercury,4\n');
    expect(ratings.map((r) => r.platform)).toEqual(['nordstrom', 'bluemercury']);
  });
});

describe('星级留空', () => {
  it('留空的星级不当作 0 星：页面不显示，校验只提示', () => {
    const [r] = parseRetailRatings('product_id,platform,rating,rating_count,rating_count_display,checked_on,url\nX,sephora,,828,828,2026-10-19,https://www.sephora.com/p\n');
    expect(r.rating).toBeNaN();
    const p = { ...real.products.find((x) => x.productId === 'CL-US-008')!, ratings: [r] };
    expect(visibleRatings(p)).toEqual([]);
    const issues = validateData(real.ingredients, [p], real.cities, real.exchangeRates).filter((i) => i.file === 'retail_ratings.csv');
    expect(issues.map((i) => [i.level, i.message])).toEqual([['warning', 'sephora 没有星级，页面不显示这条评分']]);
  });

  it('写了但无法解析的星级（如 unknown）报错，不当作留空', () => {
    const [r] = parseRetailRatings('product_id,platform,rating,rating_count,rating_count_display,checked_on,url\nX,sephora,unknown,828,828,2026-10-19,https://www.sephora.com/p\n');
    const p = { ...real.products.find((x) => x.productId === 'CL-US-008')!, ratings: [r] };
    const issues = validateData(real.ingredients, [p], real.cities, real.exchangeRates).filter((i) => i.file === 'retail_ratings.csv');
    expect(issues.map((i) => [i.level, i.message])).toEqual([['error', 'rating 应为 0–5 之间的数字：unknown']]);
  });
});
