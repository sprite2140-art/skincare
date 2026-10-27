import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import type { FaceAttributes, Product } from '../data/types';
import { EMPTY_FACE, type FaceAnswers } from '../profile/faceQuestionnaire';
import { computeBudgetCaps } from './budget';
import { buildFaceSteps, type FaceStepId } from './faceSteps';
import { faceScoringProfile, parseRangePercent, rankFaceStep, scoreFaceProduct } from './faceScore';
import type { SpecialStatus } from './score';

const real = loadDataFromDisk();
const data = { index: real.ingredientIndex, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: true };
const cl = real.products.find((p) => p.productId === 'CL-US-001')!;
const FACE: FaceAttributes = {
  skinTypeClaim: [], texture: null, spf: null, broadSpectrum: 'unknown', waterResistance: 'unknown',
  activeConcentrations: [], useTime: 'unknown', useFrequency: '', nonComedogenicClaim: 'unknown', faceStepNote: '',
};
const product = (id: string, category: string, inciList: string[], extra: Partial<Product> = {}, face: Partial<FaceAttributes> = {}): Product => ({
  ...cl, productId: id, category, usageType: null, inciList, inciNameUnverified: [], keyActives: [], keyActivesDisclosed: true,
  claimedBenefits: [], brandClaims: { ...cl.brandClaims, targets: [], text: '', status: null }, ...extra, face: { ...FACE, ...face },
});
const answers = (a: Partial<FaceAnswers>): FaceAnswers => ({ ...EMPTY_FACE, ...a });

function run(p: Product, a: Partial<FaceAnswers>, stepId: FaceStepId, statuses: SpecialStatus[] = []) {
  const face = answers(a);
  const step = buildFaceSteps(face, { statuses }).find((s) => s.id === stepId)
    ?? { id: stepId, category: p.category as never, tier: 'optional' as const, needs: [], becauseOf: [], weekly: false };
  const profile = faceScoringProfile(face, step, { specialStatus: 'none', specialStatuses: statuses, avoidIngredients: [], avoidTags: [] });
  return scoreFaceProduct(p, profile, data, { face, step, classes: real.faceActiveClasses });
}

describe('防晒的硬性条件', () => {
  const sun = (id: string, face: Partial<FaceAttributes>, inci = ['Water', 'Zinc Oxide', 'Glycerin']) =>
    product(id, 'sunscreen', inci, {}, face);

  it('SPF 30 以上且广谱才可推荐；不达标排除；缺数据放"信息不全"', () => {
    expect(run(sun('SU-US-901', { spf: 50, broadSpectrum: 'yes' }), {}, 'sunscreen').faceExtras.sunscreen).toBe('ok');
    const low = run(sun('SU-US-902', { spf: 15, broadSpectrum: 'yes' }), {}, 'sunscreen');
    expect(low.excluded).toBe(true);
    expect(low.exclusions.map((e) => e.code)).toContain('sunscreen_standard');
    expect(run(sun('SU-US-903', { spf: 50, broadSpectrum: 'no' }), {}, 'sunscreen').excluded).toBe(true);
    const missing = run(sun('SU-US-904', { spf: 50 }), {}, 'sunscreen');
    expect(missing.excluded).toBe(false);
    expect(missing.faceExtras.sunscreen).toBe('incomplete');
    expect(missing.notices.find((n) => n.code === 'sunscreen_incomplete')!.text.zh).toBe('信息不全，无法确认：缺少是否广谱');
  });

  it('所有防晒卡片都显示是否防水；户外久或出汗时防水款排前面，其他人不按防水排序', () => {
    const a = sun('SU-US-911', { spf: 50, broadSpectrum: 'yes', waterResistance: 'none' });
    const b = sun('SU-US-912', { spf: 50, broadSpectrum: 'yes', waterResistance: '80' });
    expect(run(b, {}, 'sunscreen').notices.find((n) => n.code === 'water_resistance')!.text.zh).toBe('防水 80 分钟');
    expect(run(a, {}, 'sunscreen').notices.find((n) => n.code === 'water_resistance')!.text.zh).toBe('未标注防水');
    const rank = (f: Partial<FaceAnswers>) => {
      const face = answers(f);
      const step = buildFaceSteps(face, { statuses: [] }).find((s) => s.id === 'sunscreen')!;
      const profile = faceScoringProfile(face, step, { specialStatus: 'none', avoidIngredients: [], avoidTags: [] });
      return rankFaceStep([a, b], profile, data, { face, step, classes: real.faceActiveClasses }).ranked.map((r) => r.product.productId);
    };
    expect(rank({ sweat: 'often' })).toEqual(['SU-US-912', 'SU-US-911']);
    expect(rank({ outdoor: 'under_30m' })).toEqual(['SU-US-911', 'SU-US-912']);
  });

  it('"隐藏可能泛白的未调色物理防晒"：只按成分表事实（只有氧化锌 / 二氧化钛、没有氧化铁）', () => {
    const mineral = sun('SU-US-921', { spf: 50, broadSpectrum: 'yes' }, ['Zinc Oxide', 'Water']);
    const tinted = sun('SU-US-922', { spf: 50, broadSpectrum: 'yes' }, ['Zinc Oxide', 'Water', 'CI 77491']);
    const hybrid = sun('SU-US-923', { spf: 50, broadSpectrum: 'yes' }, ['Zinc Oxide', 'Avobenzone', 'Water']);
    expect([mineral, tinted, hybrid].map((p) => run(p, {}, 'sunscreen').faceExtras.untintedMineral)).toEqual([true, false, false]);
    const face = answers({});
    const step = buildFaceSteps(face, { statuses: [] }).find((s) => s.id === 'sunscreen')!;
    const profile = faceScoringProfile(face, step, { specialStatus: 'none', avoidIngredients: [], avoidTags: [] });
    const r = rankFaceStep([mineral, tinted, hybrid], profile, data, { face, step, classes: real.faceActiveClasses }, { hideUntintedMineral: true });
    expect(r.hidden).toBe(1);
    expect(r.ranked.map((x) => x.product.productId)).not.toContain('SU-US-921');
  });
});

describe('功效成分', () => {
  const saSerum = product('SE-US-901', 'serum', ['Water', 'Salicylic Acid', 'Glycerin']);
  const saCleanser = product('CL-US-901', 'cleanser', ['Water', 'Salicylic Acid', 'Glycerin']);

  it('只对经常敏感的人计入刺激：免洗每类扣 30 分，冲洗型减半为 15 分；不敏感不扣', () => {
    const calm = run(saSerum, { concerns: ['pores'] }, 'treatment');
    const sensitive = run(saSerum, { concerns: ['pores'], sensitivity: 'often' }, 'treatment');
    expect(calm.dimensions.irritation.score! - sensitive.dimensions.irritation.score!).toBe(30);
    expect(sensitive.irritation.hits.find((h) => h.tag === 'active_irritant')!.deduction).toBe(30);
    const cleanserCalm = run(saCleanser, { concerns: ['acne'] }, 'cleanser');
    const cleanserSens = run(saCleanser, { concerns: ['acne'], sensitivity: 'often' }, 'cleanser');
    expect(cleanserSens.irritation.hits.find((h) => h.tag === 'active_irritant')!.deduction).toBe(15);
    expect(cleanserCalm.irritation.hits.some((h) => h.tag === 'active_irritant')).toBe(false);
  });

  it('含功效成分时温和度取决于耐受（卡片不显示等级），不含时照常', () => {
    expect(run(saSerum, { concerns: ['pores'] }, 'treatment').faceExtras.toleranceDependent).toBe(true);
    expect(run(cl, { concerns: ['oil'] }, 'cleanser').faceExtras.toleranceDependent).toBe(false);
  });

  it('只计入与这一步相关的需求时，记录步骤和用户一共选了几项', () => {
    const face = answers({ concerns: ['acne', 'pigmentation', 'aging'] });
    const step = buildFaceSteps(face, { statuses: [] }).find((x) => x.id === 'cleanser')!;
    const profile = faceScoringProfile(face, step, { specialStatus: 'none', specialStatuses: [], avoidIngredients: [], avoidTags: [] });
    expect(profile.needScope).toEqual({ category: 'cleanser', selected: 3 });
  });

  it('所有人都提示"初次使用从低频开始，白天需要防晒"', () => {
    expect(run(saSerum, { concerns: ['pores'] }, 'treatment').notices.find((n) => n.code === 'active_start_slow')!.text.zh)
      .toBe('含水杨酸类：初次使用从低频开始（如隔天一次），白天需要防晒');
  });

  it('孕期排除 A 醇类；处方药 / 异维 A 酸排除含功效成分的免洗产品，冲洗型不排除', () => {
    const retinol = product('SE-US-902', 'serum', ['Water', 'Retinol']);
    expect(run(retinol, { concerns: ['aging'] }, 'treatment', ['pregnant']).excluded).toBe(true);
    expect(run(retinol, { concerns: ['aging'] }, 'treatment').excluded).toBe(false);
    const iso = run(saSerum, { concerns: ['pores'] }, 'treatment', ['isotretinoin']);
    expect(iso.exclusions.map((e) => e.code)).toContain('rx_actives');
    expect(run(saCleanser, { concerns: ['acne'] }, 'cleanser', ['isotretinoin']).excluded).toBe(false);
  });

  it('处方外用药：不排除过氧化苯甲酰，改为提示；A 醇类、果酸、水杨酸类仍排除；口服异维 A 酸时过氧化苯甲酰仍排除', () => {
    const bpoSpot = product('ST-US-901', 'spot_treatment', ['Water', 'Benzoyl Peroxide']);
    const rx = run(bpoSpot, { concerns: ['acne'] }, 'spot', ['rx']);
    expect(rx.excluded).toBe(false);
    expect(rx.notices.find((n) => n.code === 'rx_bpo_note')!.text.zh).toBe('如果你在用处方外用药：抗生素类（如克林霉素）常与过氧化苯甲酰同用；处方维 A 酸（tretinoin）不要与过氧化苯甲酰在同一时段使用。具体请按医生的方案。');
    expect(run(saSerum, { concerns: ['pores'] }, 'treatment', ['rx']).exclusions.map((e) => e.code)).toContain('rx_actives');
    expect(run(bpoSpot, { concerns: ['acne'] }, 'spot', ['isotretinoin']).exclusions.map((e) => e.code)).toContain('rx_actives');
  });
});

describe('浓度', () => {
  it('解析有效范围里的百分比', () => {
    expect(parseRangePercent('免洗 2%（控油）–5%（红斑、色斑、细纹）')).toEqual({ min: 2, max: 5 });
    expect(parseRangePercent('美国 OTC 去屑 1.8%–3%')).toEqual({ min: 1.8, max: 3 });
    expect(parseRangePercent('免洗 0.1%（面部）')).toEqual({ min: 0.1, max: null });
    expect(parseRangePercent('未知')).toBeNull();
    expect(parseRangePercent('美国防晒专论允许最高25%；浓度不能代替成品SPF及广谱测试')).toBeNull();
    expect(parseRangePercent('45%专业短接触换肤每2周1次共6次;日常5%至10%免洗的独立有效范围本批未核定')).toBeNull();
  });

  it('公开浓度低于有效范围的主打成分按非主打计', () => {
    const base = product('SE-US-903', 'serum', ['Water', 'Niacinamide'], { keyActives: ['Niacinamide'] });
    const ok = run({ ...base, face: { ...FACE, activeConcentrations: [{ inci: 'Niacinamide', concentration: '5%', url: 'https://a.example' }] } }, { concerns: ['pigmentation'] }, 'treatment');
    const low = run({ ...base, face: { ...FACE, activeConcentrations: [{ inci: 'Niacinamide', concentration: '1%', url: 'https://a.example' }] } }, { concerns: ['pigmentation'] }, 'treatment');
    expect(ok.needMatches[0].credit).toBe(1);
    expect(low.needMatches[0].credit).toBe(0.3);
    expect(low.notices.some((n) => n.code === 'below_range')).toBe(true);
  });
});

describe('真实洁面数据', () => {
  it('按困扰排序；面部不用水硬度，环境维度不计分', () => {
    const face = answers({ concerns: ['acne', 'oil'] });
    const step = buildFaceSteps(face, { statuses: [] }).find((s) => s.id === 'cleanser')!;
    const profile = faceScoringProfile(face, step, { specialStatus: 'none', avoidIngredients: [], avoidTags: [] });
    const { ranked } = rankFaceStep(real.products, profile, data, { face, step, classes: real.faceActiveClasses });
    expect(ranked).toHaveLength(40);
    expect(ranked[0].dimensions.environment.score).toBeNull();
    expect(ranked[0].needMatches.map((m) => m.id)).toEqual(['acne', 'oil']);
  });
});

describe('无有效成分的物理产品（痘痘贴）', () => {
  it('成分表只有材料名称：不报"暂无数据"，需求匹配只按品牌宣称', () => {
    for (const id of ['ST-US-001', 'ST-US-002', 'ST-US-003', 'ST-US-015']) {
      const p = real.products.find((x) => x.productId === id)!;
      expect(p.physicalOnly).toBe(true);
      const r = run(p, { concerns: ['acne'] }, 'spot');
      expect(r.notices.map((n) => n.code)).not.toContain('missing_data');
      expect(r.dimensions.need.score).not.toBeNull();
      expect(r.needMatches.find((m) => m.id === 'acne')!.bases).toEqual(['brand_claim', 'claim']);
    }
    // 含药物成分的点涂产品不算物理产品
    expect(real.products.find((x) => x.productId === 'ST-US-004')!.physicalOnly).toBe(false);
  });
});
