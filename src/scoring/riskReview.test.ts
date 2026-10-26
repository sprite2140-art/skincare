import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import { computeBudgetCaps } from './budget';
import { scoreProduct, type ScoringProfile } from './score';

const real = loadDataFromDisk();
const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: false };
const profile: ScoringProfile = {
  concerns: [], concernsRanked: false, sensitive: false, specialStatus: 'none', avoidIngredients: [], avoidTags: [],
  budget: 'none', fragrancePref: null, washFrequency: 'daily', city: null, inUseProducts: [],
};
const base = real.products.find((p) => p.productId === 'SH-US-001')!;
const make = (inciList: string[], usageType: 'leave_on' | 'rinse_off' = 'rinse_off') =>
  ({ ...base, productId: 'T-RISK', usageType, inciList, inciNameUnverified: [] });

describe('风险成分 10 个（2026-10-26 PubMed 核对）', () => {
  it('全部标为已核对', () => {
    for (const n of ['Sodium Lauryl Sulfate', 'Ammonium Lauryl Sulfate', 'Sodium C14-16 Olefin Sulfonate', 'TEA-Dodecylbenzenesulfonate',
      'Methylisothiazolinone', 'Methylchloroisothiazolinone', 'Iodopropynyl Butylcarbamate', 'Alcohol', 'Alcohol Denat.', 'Isopropyl Alcohol']) {
      expect(real.ingredientIndex.get(n)!.reviewStatus).toBe('verified');
    }
  });

  it('C14-16 烯烃磺酸钠、TEA-十二烷基苯磺酸盐不再按强清洁力扣分；SLS 维持', () => {
    expect(scoreProduct(make(['Water', 'Sodium C14-16 Olefin Sulfonate']), profile, data).dimensions.irritation.score).toBe(100);
    expect(scoreProduct(make(['Water', 'TEA-Dodecylbenzenesulfonate']), profile, data).dimensions.irritation.score).toBe(100);
    expect(scoreProduct(make(['Water', 'Sodium Lauryl Sulfate']), profile, data).dimensions.irritation.score).toBeLessThan(100);
  });

  it('酒精不扣分，只提示"高浓度酒精可能降低皮肤含水量"', () => {
    const r = scoreProduct(make(['Water', 'Alcohol Denat.'], 'leave_on'), profile, data);
    expect(r.dimensions.irritation.score).toBe(100);
    expect(r.notices.find((n) => n.code === 'alcohol_drying')!.text.zh).toBe('含变性乙醇：高浓度酒精可能降低皮肤含水量');
  });

  it('异丙醇与强清洁力表活同在一款免洗产品中时另加提示；冲洗型不提示', () => {
    const inci = ['Water', 'Isopropyl Alcohol', 'Sodium Lauryl Sulfate'];
    expect(scoreProduct(make(inci, 'leave_on'), profile, data).notices.some((n) => n.code === 'ipa_with_cleanser')).toBe(true);
    expect(scoreProduct(make(inci, 'rinse_off'), profile, data).notices.some((n) => n.code === 'ipa_with_cleanser')).toBe(false);
    expect(scoreProduct(make(['Water', 'Alcohol', 'Sodium Lauryl Sulfate'], 'leave_on'), profile, data).notices.some((n) => n.code === 'ipa_with_cleanser')).toBe(false);
  });

  it('致敏防腐剂维持扣分', () => {
    expect(scoreProduct(make(['Water', 'Iodopropynyl Butylcarbamate'], 'leave_on'), profile, data).dimensions.irritation.score).toBe(85);
  });
});
