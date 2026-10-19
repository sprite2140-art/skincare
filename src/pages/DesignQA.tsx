// 设计自查页（/qa，不在导航中）：用固定案例渲染产品卡片，供 docs/DESIGN_QA.md 的截图和逐项检查使用。
// ?open=1 时所有卡片初始展开（评分明细也展开）。案例的产品和档案固定，数据更新后如案例不再成立，在这里调整。

import { useLocation } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredientIndex, products } from '../data/load';
import { EMPTY_HAIR, toScoringProfile, type Answers, type HairAnswers, type ScalpAnswers } from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import type { Category } from '../data/types';
import { TEST_MODE_DRAFT_SCORING } from '../scoring/config';
import { scoreProduct } from '../scoring/score';
import ProductCard from './ProductCard';

interface QaCase {
  id: string;
  title: string;
  productIds: string[];
  answers: Answers;
  routine?: boolean;
}

function answers(scope: 'shampoo' | 'conditioner' | 'set', scalp: Partial<ScalpAnswers>, hair: Partial<HairAnswers>): Answers {
  return {
    base: { ...newProfile('QA', 'qa').base, scope },
    scalp: { concerns: [], oilTiming: null, washFrequency: 'every_other_day', ...scalp },
    hair: { ...EMPTY_HAIR, ...hair },
  };
}

/** 固定案例：见 docs/DESIGN_QA.md */
export const QA_CASES: QaCase[] = [
  { id: 'all-met', title: '1 需求全部满足', productIds: ['SH-US-001'], answers: answers('shampoo', { concerns: ['dandruff'] }, {}) },
  { id: 'partial', title: '2 部分满足（含发丝效果分组）', productIds: ['SH-US-007'], answers: answers('shampoo', { concerns: ['dandruff', 'oily'] }, { goals: ['smooth', 'volume'] }) },
  { id: 'none', title: '3 全无依据', productIds: ['SH-US-005'], answers: answers('shampoo', { concerns: ['dandruff', 'oily'] }, { goals: ['smooth', 'volume'] }) },
  { id: 'no-evidence', title: '4 证据缺失（只有资料分类）', productIds: ['SH-US-003'], answers: answers('shampoo', { concerns: ['oily'] }, {}) },
  { id: 'no-rating', title: '5 没有零售商评分', productIds: ['SH-US-048'], answers: answers('shampoo', { concerns: ['dandruff'] }, {}) },
  { id: 'long-name', title: '6 名称很长', productIds: ['CO-US-030'], answers: answers('conditioner', {}, { goals: ['smooth'] }) },
  { id: 'unverified', title: '7 含未核对成分', productIds: ['CO-US-032'], answers: answers('conditioner', {}, { goals: ['smooth'] }) },
  { id: 'routine', title: '8 洗护搭配', productIds: ['SH-US-001', 'CO-US-001'], answers: answers('set', { concerns: ['dandruff'] }, { goals: ['smooth'] }), routine: true },
];

export default function DesignQA() {
  const open = new URLSearchParams(useLocation().search).get('open') === '1';
  const data = { index: ingredientIndex, exchangeRates, budgetCaps, allowDraft: TEST_MODE_DRAFT_SCORING };
  return (
    <main className="shell qa">
      {QA_CASES.map((c) => (
        <section key={c.id} id={`case-${c.id}`} className="qa-case">
          <h2 className="label">{c.title}</h2>
          {c.productIds.map((id) => {
            const p = products.find((x) => x.productId === id);
            if (!p) return <p key={id} className="small muted">{id} not found</p>;
            const profile = toScoringProfile(c.answers, p.category as Category, { cities, exchangeRates, routine: c.routine });
            const r = scoreProduct(p, profile, data);
            return <ProductCard key={`${id}-${open}`} r={r} market="US" profile={profile} scentGoal={false} compact={c.routine} defaultOpen={open} />;
          })}
        </section>
      ))}
    </main>
  );
}
