import { describe, expect, it } from 'vitest';
import { parseInciList, parseProducts } from './parse';
import { buildIngredientIndex, cleanInciName } from './ingredientIndex';
import { ingredientFrequency } from './frequency';
import { loadDataFromDisk } from './node';
import { validateData } from './validate';
import type { ExchangeRate, Ingredient, Product } from './types';

const real = loadDataFromDisk();
const sample = real.products[0];
const errorsOf = (opts: { ingredients?: Ingredient[]; products?: Product[]; rates?: ExchangeRate[] }) =>
  validateData(opts.ingredients ?? real.ingredients, opts.products ?? real.products, real.cities, opts.rates ?? real.exchangeRates)
    .filter((i) => i.level === 'error')
    .map((i) => i.message);

describe('产品表新列', () => {
  const header =
    'product_id,brand,name_en,name_zh,zone,category,usage_type,region,formula_note,channels,inclusion_basis,inci_list,inci_list_original,price,currency,size_ml,available_in_cn,transparency,source_url,reviewed_on';
  const row =
    'SH-JP-001,B,N,名,scalp,shampoo,,JP,日本版,@cosme,,AQUA;Piroctone Olamine,"水、ピロクトンオラミン",1650,JPY,400,cross_border,high,https://a.example/1; https://b.example/2,2026-10-16';
  const [p] = parseProducts(`${header}\n${row}\n`);

  it('inci_list_original 原样保存，inci_list 仍是英文 INCI 列表', () => {
    expect(p.inciListOriginal).toBe('水、ピロクトンオラミン');
    expect(p.inciList).toEqual(['AQUA', 'Piroctone Olamine']);
  });

  it('size_ml 解析为数字，source_url 按分号拆成多个链接', () => {
    expect(p.sizeMl).toBe(400);
    expect(p.sourceUrls).toEqual(['https://a.example/1', 'https://b.example/2']);
    expect(errorsOf({ products: [p] })).toEqual([]);
  });

  it('size_ml 必须为正数，source_url 每一项必须是链接', () => {
    expect(errorsOf({ products: [{ ...p, sizeMl: 0 }] })).toEqual([expect.stringContaining('size_ml 应为正数')]);
    expect(errorsOf({ products: [{ ...p, sourceUrls: ['https://a.example', 'see brand site'] }] }))
      .toEqual([expect.stringContaining('"see brand site" 不是 http(s) 链接')]);
  });

  it('成分匹配不区分大小写', () => {
    const index = buildIngredientIndex(real.ingredients);
    expect(index.get('AQUA')?.inciName).toBe('Aqua');
    expect(index.get('PIROCTONE OLAMINE')?.inciName).toBe('Piroctone Olamine');
    expect(index.get('parfum')?.inciName).toBe('Parfum');
    expect(index.get('FRAGRANCE')?.inciName).toBe('Parfum');
  });
});

describe('成分名称统一', () => {
  it('去掉括号内俗名，保留大小写，合并空格', () => {
    expect(cleanInciName('Rosmarinus Officinalis (Rosemary) Leaf Extract')).toEqual({
      name: 'Rosmarinus Officinalis Leaf Extract',
      nameUnverified: false,
    });
    expect(cleanInciName('Parfum (Fragrance)').name).toBe('Parfum');
    expect(cleanInciName('Aqua（Water）').name).toBe('Aqua');
  });

  it('去掉 [待核对] 标记并记为名称未核对（半角、全角括号均可）', () => {
    expect(cleanInciName('Sodium Cocoyl Glutamate [待核对]')).toEqual({ name: 'Sodium Cocoyl Glutamate', nameUnverified: true });
    expect(cleanInciName('【待核对】Sodium Cocoyl Glutamate')).toEqual({ name: 'Sodium Cocoyl Glutamate', nameUnverified: true });
    expect(cleanInciName('Camellia Sinensis (Tea) Leaf Extract ［待核对］')).toEqual({
      name: 'Camellia Sinensis Leaf Extract',
      nameUnverified: true,
    });
  });

  it('解析产品成分表时统一写法，并记下名称未核对的成分', () => {
    const r = parseInciList('Aqua (Water); Sodium Lauroyl Methyl Alaninate [待核对]; Rosmarinus Officinalis (Rosemary) Leaf Extract');
    expect(r.names).toEqual(['Aqua', 'Sodium Lauroyl Methyl Alaninate', 'Rosmarinus Officinalis Leaf Extract']);
    expect(r.unverified).toEqual(['Sodium Lauroyl Methyl Alaninate']);
  });

  it('不同写法通过成分库 aliases 匹配到同一成分', () => {
    const index = buildIngredientIndex(real.ingredients);
    expect(index.get('Sodium Lauroyl Methyl Alaninate')?.inciName).toBe('Sodium Lauroyl Methylalaninate');
    expect(index.get('sodium lauroyl methylalaninate')?.inciName).toBe('Sodium Lauroyl Methylalaninate');
    expect(index.get('Rosmarinus Officinalis (Rosemary) Leaf Extract')?.inciName).toBe('Rosmarinus Officinalis Leaf Extract');
    expect(index.get('Water')?.inciName).toBe('Aqua');
  });

  it('频率统计按统一后的名称合并', () => {
    const index = buildIngredientIndex(real.ingredients);
    const mk = (id: string, list: string) => {
      const inci = parseInciList(list);
      return { ...sample, productId: id, inciList: inci.names, inciNameUnverified: inci.unverified };
    };
    const rows = ingredientFrequency(
      [
        mk('P1', 'Water; Sodium Lauroyl Methylalaninate; Rosmarinus Officinalis (Rosemary) Leaf Extract; Foo Extract'),
        mk('P2', 'Aqua; Sodium Lauroyl Methyl Alaninate; Rosmarinus Officinalis Leaf Extract; FOO EXTRACT [待核对]'),
        mk('P3', 'AQUA (WATER); Aqua'),
      ],
      index,
    );
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(byName['Aqua'].productCount).toBe(3); // P3 里重复出现只算一次
    expect(byName['Aqua'].spellings).toEqual(['Water', 'Aqua', 'AQUA']);
    expect(byName['Sodium Lauroyl Methylalaninate'].productCount).toBe(2);
    expect(byName['Rosmarinus Officinalis Leaf Extract'].productCount).toBe(2);
    // 不在库的成分按统一后的名称合并，并统计待核对次数
    expect(byName['Foo Extract']).toMatchObject({ productCount: 2, reviewStatus: null, nameUnverifiedCount: 1 });
    expect(rows[0].name).toBe('Aqua');
  });
});

describe('数据校验', () => {
  it('inci_name 重复（忽略大小写）报错', () => {
    const dup = { ...real.ingredients[0], inciName: real.ingredients[0].inciName.toUpperCase(), aliases: [] };
    expect(errorsOf({ ingredients: [...real.ingredients, dup] })).toEqual([expect.stringContaining('inci_name 重复')]);
  });

  it('价格必须为正数', () => {
    expect(errorsOf({ products: [{ ...sample, price: -12 }] })).toEqual([expect.stringContaining('price 应为正数')]);
    expect(errorsOf({ products: [{ ...sample, price: 0 }] })).toEqual([expect.stringContaining('price 应为正数')]);
  });

  it('汇率表所有币种必须是同一个数据日期', () => {
    const rates = real.exchangeRates.map((r) => (r.currency === 'JPY' ? { ...r, dataDate: '2026-10-02' } : r));
    expect(errorsOf({ rates })).toEqual([expect.stringContaining('各币种的 data_date 应相同')]);
  });
});

describe('本轮新增的产品列', () => {
  const header =
    'product_id,brand,name_en,name_zh,zone,category,region,inclusion_basis,awards,claimed_benefits,tested_claims,fragrance_free_claim,inci_list,key_actives,price,currency,transparency,source_url,purchase_url,image_url,image_source,image_license';
  const row =
    'CO-US-T01,B,N,名,hair,conditioner,US,,Allure Best of Beauty|2025|Best Conditioner|https://a.example/award,frizz;shine,frizz|第三方仪器测试梳理力|2025|https://lab.example/report,yes,Water;Cetearyl Alcohol,Not separately disclosed,12,USD,medium,https://a.example/p,https://shop.example/p,,,';
  const [p] = parseProducts(`${header}\n${row}\n`);

  it('awards、claimed_benefits、tested_claims、fragrance_free_claim、购买和图片列', () => {
    expect(p.awards).toEqual([{ source: 'Allure Best of Beauty', year: '2025', title: 'Best Conditioner', url: 'https://a.example/award' }]);
    expect(p.claimedBenefits).toEqual(['frizz', 'shine']);
    expect(p.testedClaims).toEqual([{ target: 'frizz', description: '第三方仪器测试梳理力', year: '2025', url: 'https://lab.example/report' }]);
    expect(p.fragranceFreeClaim).toBe('yes');
    expect(p.keyActivesDisclosed).toBe(false);
    expect(p.purchaseUrl).toBe('https://shop.example/p');
    expect(p.imageUrl).toBe('');
    expect(errorsOf({ products: [p] })).toEqual([]);
  });

  it('旧格式（没有新列）仍能解析，取默认值', () => {
    expect(sample.productId).toBe('SH-US-001');
    const [old] = parseProducts('product_id,brand,category,inci_list\nX,B,shampoo,Water\n');
    expect(old).toMatchObject({ awards: [], claimedBenefits: [], testedClaims: [], fragranceFreeClaim: 'unknown', keyActivesDisclosed: true, imageUrl: '' });
  });

  it('取值检查：未知困扰、奖项缺年份、测试缺来源、图片缺许可', () => {
    expect(errorsOf({ products: [{ ...p, claimedBenefits: ['softness' as never] }] })).toEqual([expect.stringContaining('claimed_benefits 取值 "softness"')]);
    expect(errorsOf({ products: [{ ...p, awards: [{ source: 'X', year: '', title: '', url: '' }] }] })).toEqual([expect.stringContaining('4 位年份')]);
    expect(errorsOf({ products: [{ ...p, testedClaims: [{ target: 'frizz', description: '', year: '', url: '' }] }] }))
      .toEqual([expect.stringContaining('测试来源链接')]);
    const warnings = validateData(real.ingredients, [{ ...p, imageUrl: 'https://img.example/a.jpg' }], real.cities, real.exchangeRates)
      .filter((i) => i.level === 'warning').map((i) => i.message);
    expect(warnings).toContain('image_url 缺少 image_source 或 image_license，页面将使用占位图');
  });

  it('"INCI 名/俗名"写法用斜杠前的部分匹配，本身带斜杠的 INCI 名不拆', () => {
    const index = buildIngredientIndex(real.ingredients);
    expect(index.get('Glycine Soja Oil/ Soybean Oil')?.inciName).toBe('Glycine Soja Oil');
    expect(index.get('Rosmarinus Officinalis Leaf Oil/Rosemary Leaf Oil')?.inciName).toBe('Rosmarinus Officinalis Leaf Oil');
    expect(index.get('Hippophae Rhamnoides Fruit/Seed Oil')).toBeUndefined();
  });
});

describe('城市水硬度', () => {
  it('有供水机构数据的城市带数值、适用范围和来源；没有的为 unknown', () => {
    const sf = real.cities.find((c) => c.city === 'San Francisco')!;
    expect(sf).toMatchObject({ waterHardness: 'moderate', hardnessMgL: '62', confidence: 'medium' });
    expect(sf.dataPeriod).toContain('2025');
    expect(sf.hardnessMgL).toContain('62');
    expect(sf.source).toMatch(/^https:\/\/www\.sfpuc\.gov\//);
    expect(real.cities.find((c) => c.city === 'Las Vegas')!.waterHardness).toBe('very_hard');
    expect(real.cities.find((c) => c.city === 'Seattle')!.waterHardness).toBe('unknown');
  });
});
