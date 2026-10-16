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
