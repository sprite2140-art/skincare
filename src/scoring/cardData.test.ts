import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/node';
import type { Product } from '../data/types';
import { EMPTY_HAIR, toScoringProfile, type HairAnswers, type ScalpAnswers } from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { computeBudgetCaps } from './budget';
import {
  cautionItems, hasAntiDandruffActive, keyIngredients, needRows, needSummary, platformOf, primaryStore, scoreBreakdown, storeRows, topRating,
} from './cardData';
import { scoreProduct } from './score';

const real = loadDataFromDisk();
const index = real.ingredientIndex;
const byId = (id: string) => real.products.find((p) => p.productId === id)!;

describe('卡片：评分行与购买渠道', () => {
  it('评分行只取评价数最多的平台（不跨平台平均），低于门槛的不算', () => {
    // SH-US-002：Ulta 11 条（不显示）、Target 1,554、Amazon 6,395 → Amazon
    expect(topRating(byId('SH-US-002'))?.platform).toBe('amazon');
    // SH-US-001：Ulta 19 条不显示 → Target
    expect(topRating(byId('SH-US-001'))?.platform).toBe('target');
    expect(topRating(byId('SH-US-048'))).toBeNull();
  });

  it('其他网站显示站名', () => {
    expect(platformOf('https://www.walgreens.com/store/c/x')).toEqual({ platform: 'other', host: 'Walgreens' });
    expect(platformOf('https://www.amazon.com/dp/X').platform).toBe('amazon');
    expect(platformOf('not a url')).toEqual({ platform: 'other', host: '' });
  });

  it('在哪买：每个平台一行，按固定顺序；评价少于门槛的标为 lowCount，不显示分数', () => {
    const rows = storeRows(byId('SH-US-001'));
    expect(rows.map((r) => r.platform)).toEqual(['brand', 'ulta', 'target', 'amazon']);
    const ulta = rows.find((r) => r.platform === 'ulta')!;
    expect(ulta.rating).toBeNull();
    expect(ulta.lowCount).toBe(true);
    expect(rows.find((r) => r.platform === 'target')!.rating?.rating).toBeCloseTo(4.55);
    const amazon = rows.find((r) => r.platform === 'amazon')!;
    expect(amazon.rating).toBeNull();
    expect(amazon.lowCount).toBe(false);
  });

  it('主购买按钮默认指向评价数最多的平台；没有评分时用产品表的 purchase_url', () => {
    expect(primaryStore(byId('SH-US-002'))?.platform).toBe('amazon');
    const sparse = byId('SH-US-048');
    const primary = primaryStore(sparse)!;
    expect(primary.url).toBe(sparse.purchaseUrl);
    expect(primary.host).toBe('Walgreens');
  });

  it('产品表的 purchase_url 不在购买链接里时补成一行，其他网站排在最后', () => {
    const p: Product = { ...byId('SH-US-001'), purchaseUrl: 'https://www.walgreens.com/x' };
    const rows = storeRows(p);
    expect(rows.at(-1)).toMatchObject({ platform: 'other', host: 'Walgreens', url: 'https://www.walgreens.com/x' });
  });
});

describe('卡片：关键成分', () => {
  it('最多 5 个，只列有效成分和螯合剂（风险成分只在"需要注意"里列）；针对需求的有效成分在前', () => {
    const k = keyIngredients(byId('SH-US-048'), index, ['dandruff']);
    expect(k.length).toBeLessThanOrEqual(5);
    expect(k[0]).toMatchObject({ kind: 'active', role: { zh: '去屑' } });
    expect(k.map((x) => x.kind)).toContain('chelator');
    expect(k.every((x) => x.kind === 'active' || x.kind === 'chelator')).toBe(true);
    expect(k.some((x) => x.ingredient.riskTags.includes('fragrance'))).toBe(false);
    expect(keyIngredients(byId('SH-US-048'), index, ['dandruff'], 1)).toHaveLength(1);
  });

  it('只有含去屑有效成分的产品才显示去屑用法', () => {
    expect(hasAntiDandruffActive(byId('SH-US-048'), index)).toBe(true);
    const plain = real.products.find((p) => p.category === 'conditioner' && !hasAntiDandruffActive(p, index));
    expect(plain).toBeDefined();
  });
});

describe('卡片：需求对照、需要注意、评分明细', () => {
  const data = { index, exchangeRates: real.exchangeRates, budgetCaps: computeBudgetCaps(real.products, real.exchangeRates), allowDraft: true };
  const ctx = { cities: real.cities, exchangeRates: real.exchangeRates };
  const answers = (scalp: Partial<ScalpAnswers>, hair: Partial<HairAnswers> = {}, wash: ScalpAnswers['washFrequency'] = null) => ({
    base: { ...newProfile('我', 'me').base, scope: 'shampoo' as const },
    scalp: { concerns: [], oilTiming: null, washFrequency: wash, ...scalp },
    hair: { ...EMPTY_HAIR, ...hair },
  });

  it('每个已选需求一行：满足 / 部分 / 无依据，带依据类型；"柔顺"只占一行', () => {
    const profile = toScoringProfile(answers({ concerns: ['dandruff'] }, { goals: ['smooth', 'volume'] }), 'shampoo', ctx);
    const r = scoreProduct(byId('SH-US-001'), profile, data);
    const rows = needRows(r);
    expect(rows.map((x) => x.id)).toEqual(['dandruff', 'smooth', 'volume']);
    expect(rows[0]).toMatchObject({ result: 'met', basis: 'ingredients' });
    expect(rows[0].evidence!.zh).toContain('吡硫鎓锌');
    for (const x of rows) {
      if (x.result === 'none') expect(x).toMatchObject({ basis: null, evidence: null });
      else expect(x.basis).not.toBeNull();
    }
    const sum = needSummary(rows);
    expect(sum.met + sum.partial + sum.none).toBe(3);
  });

  it('需要注意：按温和度的扣分列出风险成分；冲洗型减半写明；强清洁力表活不扣分时说明原因', () => {
    const p = byId('SH-US-048');
    const notDaily = toScoringProfile(answers({ concerns: ['dandruff'] }, {}, 'every_other_day'), 'shampoo', ctx);
    const r = scoreProduct(p, notDaily, data);
    const items = cautionItems(r, notDaily);
    const frag = items.find((x) => x.label.zh === '香精 / 香料')!;
    expect(frag.note.zh).toMatch(/^温和度扣 [\d.]+ 分（冲洗型产品，香精 \/ 香料扣分减半）$/);
    const cleanser = items.find((x) => x.label.zh === '强清洁力表活')!;
    expect(cleanser.note.zh).toBe('你不是每天洗头，不扣分');
    // 扣分合计与温和度得分一致，不互相矛盾
    const total = r.irritation.hits.reduce((n, h) => n + h.deduction, 0);
    expect(r.dimensions.irritation.score).toBe(Math.round(Math.max(0, 100 - total)));
    const daily = toScoringProfile(answers({ concerns: ['dandruff'] }, {}, 'daily'), 'shampoo', ctx);
    expect(cautionItems(scoreProduct(p, daily, data), daily).find((x) => x.label.zh === '强清洁力表活')!.note.zh).toMatch(/^温和度扣/);
  });

  it('评分明细：实际权重为重新归一化后的值，贡献合计等于总分（未封顶时）', () => {
    const profile = toScoringProfile(answers({ concerns: ['dandruff'] }), 'shampoo', ctx);
    const r = scoreProduct(byId('SH-US-001'), profile, data);
    const bd = scoreBreakdown(r);
    const scored = bd.rows.filter((x) => x.score !== null);
    expect(scored.reduce((n, x) => n + x.weight!, 0)).toBeCloseTo(1, 10);
    expect(bd.rows.find((x) => x.key === 'environment')).toMatchObject({ score: null, weight: null, contribution: null });
    if (!r.evidenceCapped) expect(Math.round(bd.sum!)).toBe(r.score);
    else expect(r.score!).toBeLessThanOrEqual(Math.round(bd.sum!));
  });
});

describe('卡片：在售版本与品牌页不一致', () => {
  it('version_mismatch 时不列出品牌官网（官网卖的不是打分用的配方）', () => {
    const p = byId('CO-US-005');
    expect(p.brandClaims.status).toBe('version_mismatch');
    expect(p.purchaseLinks.some((l) => l.platform === 'brand')).toBe(true);
    const rows = storeRows(p);
    expect(rows.some((r) => r.platform === 'brand' || r.url.includes('lorealparisusa.com'))).toBe(false);
    expect(primaryStore(p)?.platform).not.toBe('brand');
  });
});

describe('百货 / 买手渠道', () => {
  it('从链接识别 Nordstrom、Neiman Marcus、Saks Fifth Avenue、Bergdorf Goodman、Bluemercury', () => {
    expect(platformOf('https://www.nordstrom.com/s/x').platform).toBe('nordstrom');
    expect(platformOf('https://www.neimanmarcus.com/p/x').platform).toBe('neiman_marcus');
    expect(platformOf('https://www.saksfifthavenue.com/product/x').platform).toBe('saks');
    expect(platformOf('https://www.bergdorfgoodman.com/p/x').platform).toBe('bergdorf_goodman');
    expect(platformOf('https://bluemercury.com/products/x').platform).toBe('bluemercury');
  });

  it('顺序：品牌官网 → Ulta → Sephora → Target → Amazon → 百货（按固定顺序）→ 其他', () => {
    const base = byId('SH-US-001');
    const link = (platform: Product['purchaseLinks'][number]['platform'], url: string) => ({ productId: base.productId, platform, url, status: '', checkedOn: '', note: '' });
    const p: Product = {
      ...base,
      purchaseUrl: 'https://www.walgreens.com/x',
      purchaseLinks: [
        link('bluemercury', 'https://bluemercury.com/x'),
        link('nordstrom', 'https://www.nordstrom.com/x'),
        link('amazon', 'https://www.amazon.com/x'),
        link('saks', 'https://www.saksfifthavenue.com/x'),
        link('brand', 'https://brand.example/x'),
      ],
    };
    expect(storeRows(p).map((r) => r.platform)).toEqual(['brand', 'amazon', 'nordstrom', 'saks', 'bluemercury', 'other']);
  });
});
