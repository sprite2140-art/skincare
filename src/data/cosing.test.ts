import { describe, expect, it } from 'vitest';
import { expandIngredients, parseAllergens, parseCosingExport, parseCosingTable } from './cosing';
import { buildIngredientIndex } from './ingredientIndex';
import { loadDataFromDisk } from './node';
import { fragranceInfo } from '../scoring/fragrance';

const real = loadDataFromDisk();

// 仿照 CosIng 导出文件：开头有说明行，功能用逗号分隔、大写，字段带引号
const EXPORT = `CosIng - Cosmetic ingredients database
Ingredients/Fragrance Inventory export,,,,,,,,,
COSING Ref No,INCI name,INN name,Ph. Eur. Name,CAS No,EC No,Chem/IUPAC Name / Description,Restriction,Function,Update Date
12345,TEST PERFUME BASE,,,123-45-6,,"A perfume, test",,PERFUMING,01/01/2020
23456,Test Emollient Ester,,,,,"Ester",,"SKIN CONDITIONING - EMOLLIENT, HAIR CONDITIONING",02/02/2021
34567,Test Chelator Salt,,,,,"Salt",,"CHELATING, VISCOSITY CONTROLLING",03/03/2022
45678,Limonene,,,5989-27-5,,,,"PERFUMING, SOLVENT",04/04/2023
`;

describe('CosIng 导入', () => {
  const entries = parseCosingExport(EXPORT);

  it('找到表头，功能转成小写并按逗号拆分', () => {
    expect(entries.map((e) => e.inciName)).toEqual(['TEST PERFUME BASE', 'Test Emollient Ester', 'Test Chelator Salt', 'Limonene']);
    expect(entries[1].functions).toEqual(['skin conditioning - emollient', 'hair conditioning']);
    expect(entries[0]).toMatchObject({ casNo: '123-45-6', ref: '12345', updateDate: '01/01/2020' });
  });

  it('分号分隔的导出也能读取；没有表头时报错', () => {
    const semi = EXPORT.replace(/,/g, ';').replace(/"([^"]*)"/g, (_, x: string) => `"${x.replace(/;/g, ',')}"`);
    expect(parseCosingExport(semi)[1].functions).toEqual(['skin conditioning - emollient', 'hair conditioning']);
    expect(() => parseCosingExport('a,b\n1,2')).toThrow('没有找到 CosIng 表头');
  });

  it('合并：成分库优先；CosIng 补充的条目来源为 cosing、未核对；含香料功能的识别为加香成分；致敏原清单标注', () => {
    const allergens = parseAllergens('inci_name,list,source\nLimonene,EU 26,https://x.example\nEvernia Prunastri Extract,EU 26,https://x.example\n');
    const all = expandIngredients(real.ingredients, entries, allergens);
    const index = buildIngredientIndex(all);
    const perfume = index.get('test perfume base')!;
    expect(perfume).toMatchObject({ origin: 'cosing', reviewStatus: 'draft', category: 'risk', riskTags: ['fragrance'], euAllergen: false });
    expect(perfume.sources[0]).toContain('cosing');
    const ester = index.get('Test Emollient Ester')!;
    expect(ester).toMatchObject({ origin: 'cosing', category: 'base', riskTags: [] });
    expect(ester.explainZh).toBe('CosIng 登记功能：skin conditioning - emollient、hair conditioning。');
    expect(index.get('Test Chelator Salt')!.functions).toContain('chelating');
    // 成分库已有的 Limonene 保留成分库条目，补上致敏原标注和 CosIng 功能
    const lim = index.get('Limonene')!;
    expect(lim).toMatchObject({ origin: 'library', euAllergen: true });
    expect(lim.cosingFunctions).toEqual(['perfuming', 'solvent']);
    // 两边都没有的致敏原按清单补条目
    expect(index.get('Evernia Prunastri Extract')).toMatchObject({ origin: 'eu_allergen_list', riskTags: ['fragrance'], euAllergen: true });
  });

  it('加香规则：只按香精统称、致敏原清单、功能只有香料类；登记了香料功能的普通成分不算', () => {
    const tbl = parseCosingTable(
      'inci_name,functions,cas_no,cosing_ref,update_date\n' +
      'Glycine Soja Oil,perfuming;skin conditioning,,1,\n' +
      'Pure Perfume Base,perfuming;fragrance,,2,\n' +
      'Aroma,flavouring,,3,\n',
    );
    const index = buildIngredientIndex(expandIngredients(real.ingredients, tbl, real.allergens));
    // 成分库条目在 CosIng 有其他功能：不算加香
    expect(index.get('Glycine Soja Oil')!.riskTags).not.toContain('fragrance');
    expect(index.get('Pure Perfume Base')).toMatchObject({ origin: 'cosing', category: 'risk', riskTags: ['fragrance'] });
    expect(index.get('Aroma')!.riskTags).toEqual(['fragrance']);
  });

  it('香味信息区分欧盟致敏原和 CosIng 登记功能含香料的成分', () => {
    const all = expandIngredients(real.ingredients, entries, real.allergens);
    const index = buildIngredientIndex(all);
    const p = { ...real.products[0], inciList: ['Water', 'TEST PERFUME BASE', 'Linalool', 'Fragrance'], inciNameUnverified: [] };
    const f = fragranceInfo(p, index);
    expect(f.status).toBe('contains');
    expect(f.allergens).toEqual(['Linalool']);
    expect(f.cosingPerfuming).toEqual(['TEST PERFUME BASE']);
    expect(f.fragrance).toEqual(['TEST PERFUME BASE', 'Linalool', 'Fragrance']);
  });

  it('data/ 中的致敏原清单是欧盟 26 种，转换后的 CosIng 表可以读取', () => {
    expect(real.allergens).toHaveLength(26);
    expect(new Set(real.allergens.map((a) => a.inciName.toLowerCase())).size).toBe(26);
    expect(parseCosingTable('inci_name,functions,cas_no,cosing_ref,update_date\nX,perfuming;solvent,,1,\n')[0].functions).toEqual(['perfuming', 'solvent']);
  });
});

describe('data/ 中导入的 CosIng（2026-10-17）', () => {
  const index = real.ingredientIndex;
  const tagged = (name: string) => index.get(name)?.riskTags.includes('fragrance') ?? false;

  it('已导入完整清单', () => {
    expect(real.cosing.length).toBe(33640);
    expect(index.get('Glycerin')?.cosingFunctions).toContain('perfuming');
  });

  it('甘油、柠檬酸、丁二醇、咖啡因、精氨酸等登记了香料功能，但还有其他功能：不算加香', () => {
    for (const n of ['Glycerin', 'Citric Acid', 'Butylene Glycol', 'Caffeine', 'Arginine', 'Salicylic Acid', 'Cocos Nucifera Oil', 'Menthol']) {
      expect(tagged(n), n).toBe(false);
    }
    const p = { ...real.products[0], inciList: ['Water', 'Glycerin', 'Citric Acid', 'Butylene Glycol', 'Caffeine', 'Arginine'], inciNameUnverified: [] };
    expect(fragranceInfo(p, index)).toMatchObject({ status: 'none_found', fragrance: [] });
  });

  it('香精统称、欧盟致敏原、功能只有香料类的成分算加香；精油也算并单独列出', () => {
    for (const n of ['Parfum', 'Fragrance', 'Linalool', 'Limonene', 'Coumarin', 'Citrus Aurantium Peel Oil', 'Terpineol']) expect(tagged(n), n).toBe(true);
    const oil = { ...real.products[0], inciList: ['Water', 'Mentha Piperita Oil'], inciNameUnverified: [] };
    expect(fragranceInfo(oil, index)).toMatchObject({ status: 'contains', fragrance: [], essentialOils: ['Mentha Piperita Oil'] });
  });

  it('产品中带香料功能的成分里，只有少数按规则算加香', () => {
    const names = new Set(real.products.flatMap((p) => p.inciList));
    const withFn = [...names].filter((n) => index.get(n)?.cosingFunctions?.some((f) => f === 'perfuming' || f === 'fragrance'));
    const counted = withFn.filter((n) => tagged(n));
    expect(withFn.length).toBeGreaterThan(100);
    expect(counted.length).toBeLessThan(40);
  });
});
