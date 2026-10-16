import { describe, expect, it } from 'vitest';
import { parseProducts } from './parse';
import { buildIngredientIndex } from './ingredientIndex';
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
    expect(index.get('AQUA')).toBeUndefined(); // 示例成分库里没有 Aqua
    expect(index.get('PIROCTONE OLAMINE')?.inciName).toBe('Piroctone Olamine');
    expect(index.get('parfum')?.inciName).toBe('Parfum');
    expect(index.get('FRAGRANCE')?.inciName).toBe('Parfum');
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
