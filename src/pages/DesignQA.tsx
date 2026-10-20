// 设计自查页（/qa，不在导航中）：用固定案例渲染产品卡片，供 docs/DESIGN_QA.md 的截图和逐项检查使用。
// ?open=1 时所有卡片初始展开（评分明细也展开）。案例的产品和档案固定，数据更新后如案例不再成立，在这里调整。

import { useLocation } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, faceActiveClasses, ingredientIndex, products } from '../data/load';
import { EMPTY_FACE, type FaceAnswers } from '../profile/faceQuestionnaire';
import { buildFaceSteps, type FaceStepId } from '../scoring/faceSteps';
import { faceScoringProfile, scoreFaceProduct } from '../scoring/faceScore';
import type { SpecialStatus } from '../scoring/score';
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

interface FaceQaCase {
  id: string;
  title: string;
  productIds: string[];
  face: Partial<FaceAnswers>;
  statuses: SpecialStatus[];
  step: FaceStepId;
}

/** 护肤固定案例（草案 7.3）。目前只有洁面数据；防晒信息不全的案例等防晒数据导入后补上 */
export const FACE_QA_CASES: FaceQaCase[] = [
  { id: 'skin-minimal', title: 'S1 没有选困扰：基础 3 步（洁面）', productIds: ['CL-US-002'], face: {}, statuses: [], step: 'cleanser' },
  { id: 'skin-full', title: 'S2 痘痘、暗沉色斑、细纹（洁面，含过氧化苯甲酰）', productIds: ['CL-US-013'], face: { concerns: ['acne', 'pigmentation', 'aging'] }, statuses: [], step: 'cleanser' },
  { id: 'skin-sensitive', title: 'S3 经常敏感 + 泛红（水杨酸洁面计入刺激）', productIds: ['CL-US-006'], face: { concerns: ['redness'], sensitivity: 'often' }, statuses: [], step: 'cleanser' },
  { id: 'skin-rx', title: 'S4 口服异维 A 酸（冲洗型不排除，提示从低频开始）', productIds: ['CL-US-006'], face: { concerns: ['acne'] }, statuses: ['isotretinoin'], step: 'cleanser' },
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
      {FACE_QA_CASES.map((c) => {
        const face = { ...EMPTY_FACE, ...c.face };
        const step = buildFaceSteps(face, { statuses: c.statuses }).find((s) => s.id === c.step)!;
        const profile = faceScoringProfile(face, step, { specialStatus: 'none', specialStatuses: c.statuses, avoidIngredients: [], avoidTags: [] });
        return (
          <section key={c.id} id={`case-${c.id}`} className="qa-case">
            <h2 className="label">{c.title}</h2>
            {c.productIds.map((id) => {
              const p = products.find((x) => x.productId === id);
              if (!p) return <p key={id} className="small muted">{id} not found</p>;
              const r = scoreFaceProduct(p, profile, data, { face, step, classes: faceActiveClasses });
              return <ProductCard key={`${id}-${open}`} r={r} market="US" profile={profile} scentGoal={false} defaultOpen={open} />;
            })}
          </section>
        );
      })}
    </main>
  );
}
