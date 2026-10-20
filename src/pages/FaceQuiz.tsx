// 护肤（面部）问卷：开头说明 + 6 屏（痘痘细问只在选了痘痘时出现）。题目和规则见 docs/SKIN_QUIZ_DRAFT.md 第 2 节。
// 单选题选完自动进入下一题；一屏多问时点继续。除"想避开的成分"外都可以跳过。答案只保存在本地。

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredients } from '../data/load';
import type { FaceTarget } from '../data/types';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import {
  FACE_CONCERNS, MAX_FACE_CONCERNS, migrateFace,
  type AcneSeverity, type FaceAnswers, type FaceBudget, type MakeupUse, type OutdoorTime, type Sensitivity, type SkinType, type SweatLevel,
} from '../profile/faceQuestionnaire';
import { baseStatuses, cityKey, type BaseAnswers } from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { budgetOptions, type BudgetChoice } from '../scoring/budget';
import { buildFaceSteps } from '../scoring/faceSteps';
import { currencyForCountry } from '../scoring/price';
import { AvoidQuestion, MoneyInput, Multi, Single } from './quizParts';

const AUTO_ADVANCE_MS = 220;

type StepId = 'intro' | 'skin' | 'concerns' | 'acne' | 'habits' | 'budget' | 'avoid';

export default function FaceQuiz() {
  const { t, tx } = useI18n();
  const { profile, save } = useProfiles();
  const navigate = useNavigate();
  const startRef = useRef(profile ?? newProfile(t('profile.defaultName')));
  const start = startRef.current;
  const [base, setBase] = useState<BaseAnswers>(start.base);
  const [face, setFace] = useState<FaceAnswers>(migrateFace(start.face));
  // 修改已有档案时，已保存过的"想避开的成分"视为已选择
  const [avoidNone, setAvoidNone] = useState(!!(start.face || start.scalp) && start.base.avoid.length === 0 && start.base.avoidIngredients.length === 0);
  const [stepIndex, setStepIndex] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const city = cities.find((c) => cityKey(c) === base.cityKey) ?? null;
  const currency = currencyForCountry(city?.country ?? 'US');
  const ingredientNames = useMemo(() => ingredients.map((i) => i.inciName), []);

  const steps: StepId[] = ['intro', 'skin', 'concerns', ...(face.concerns.includes('acne') ? (['acne'] as StepId[]) : []), 'habits', 'budget', 'avoid'];
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const questionCount = steps.length - 1;
  const progress = stepIndex === 0 ? 0 : (stepIndex / questionCount) * 100;

  const finish = () => {
    const cleaned = migrateFace({
      ...face,
      // 金额为 0 表示还没填写，按不限处理
      setBudget: face.budget === 'set' && face.setBudget && face.setBudget.amount > 0 ? face.setBudget : null,
    });
    save({ ...start, base, face: cleaned });
    navigate('/skin');
  };
  const next = () => (stepIndex >= steps.length - 1 ? finish() : setStepIndex(stepIndex + 1));
  const back = () => (stepIndex === 0 ? navigate('/') : setStepIndex(stepIndex - 1));
  const pickThenNext = (apply: () => void) => {
    apply();
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(next, AUTO_ADVANCE_MS);
  };
  const setField = <K extends keyof FaceAnswers>(k: K, v: FaceAnswers[K]) => setFace((f) => ({ ...f, [k]: v }));

  let body: JSX.Element;
  let canContinue = true;
  let continueLabel = t('quiz.next');
  switch (step) {
    case 'intro':
      continueLabel = t('quiz.start');
      body = (
        <>
          <div className="label">{t('skinQuiz.intro.kicker')}</div>
          <h1 className="h1">{t('skinQuiz.intro.title')}</h1>
          <p className="lead">{t('skinQuiz.intro.body')}</p>
          <p className="hint">{t('quiz.intro.privacy')}</p>
        </>
      );
      break;
    case 'skin':
      body = (
        <>
          <h1 className="h1">{t('skinQuiz.skin')}</h1>
          <div className="label" style={{ marginTop: 16 }}>{t('skinQuiz.skinType')}</div>
          <Single<SkinType>
            options={['dry', 'normal', 'combination', 'oily', 'unsure']}
            value={face.skinType}
            label={(v) => t(`skinQuiz.skinType.${v}` as Key)}
            sub={(v) => (v === 'unsure' ? t('skinQuiz.skinType.unsureSub') : '')}
            onPick={(v) => setField('skinType', v)}
          />
          <div className="label" style={{ marginTop: 20 }}>{t('skinQuiz.sensitivity')}</div>
          <Single<Sensitivity>
            options={['rarely', 'sometimes', 'often']}
            value={face.sensitivity}
            label={(v) => t(`skinQuiz.sensitivity.${v}` as Key)}
            onPick={(v) => setField('sensitivity', v)}
          />
        </>
      );
      break;
    case 'concerns':
      body = (
        <>
          <h1 className="h1">{t('skinQuiz.concerns')}</h1>
          <p className="hint">{t('skinQuiz.concernsHint', { n: MAX_FACE_CONCERNS })}</p>
          <Multi<FaceTarget>
            options={FACE_CONCERNS}
            value={face.concerns}
            // 选中的显示排序号（第 1 项权重最高）
            label={(v) => {
              const i = face.concerns.indexOf(v);
              const name = t(`skinQuiz.concern.${v}` as Key);
              return i >= 0 ? `${i + 1}. ${name}` : name;
            }}
            onChange={(v) => setFace((f) => ({ ...f, concerns: v.slice(0, MAX_FACE_CONCERNS), noConcerns: false }))}
            noneLabel={t('skinQuiz.concern.none')}
            noneOn={face.noConcerns}
            onNone={() => setFace((f) => ({ ...f, concerns: [], noConcerns: true, acneSeverity: null }))}
            max={MAX_FACE_CONCERNS}
          />
        </>
      );
      break;
    case 'acne':
      body = (
        <>
          <h1 className="h1">{t('skinQuiz.acne')}</h1>
          <Single<AcneSeverity>
            options={['occasional', 'recurring', 'severe']}
            value={face.acneSeverity}
            label={(v) => t(`skinQuiz.acne.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setField('acneSeverity', v))}
          />
        </>
      );
      break;
    case 'habits':
      body = (
        <>
          <h1 className="h1">{t('skinQuiz.habits')}</h1>
          <div className="label" style={{ marginTop: 16 }}>{t('skinQuiz.makeup')}</div>
          <Single<MakeupUse> options={['none', 'sometimes', 'daily']} value={face.makeup} label={(v) => t(`skinQuiz.makeup.${v}` as Key)} onPick={(v) => setField('makeup', v)} />
          <div className="label" style={{ marginTop: 20 }}>{t('skinQuiz.outdoor')}</div>
          <Single<OutdoorTime> options={['under_30m', '30m_2h', 'over_2h']} value={face.outdoor} label={(v) => t(`skinQuiz.outdoor.${v}` as Key)} onPick={(v) => setField('outdoor', v)} />
          <div className="label" style={{ marginTop: 20 }}>{t('skinQuiz.sweat')}</div>
          <Single<SweatLevel> options={['rarely', 'sometimes', 'often']} value={face.sweat} label={(v) => t(`skinQuiz.sweat.${v}` as Key)} onPick={(v) => setField('sweat', v)} />
        </>
      );
      break;
    case 'budget': {
      // 每档按当前流程里出现的品类分别显示金额（各品类自己价格的 25% / 50% / 75% 分位数）
      const categories = buildFaceSteps(face, { statuses: baseStatuses(base) }).map((s) => s.category);
      const tierLabel = (q: BudgetChoice) =>
        categories.map((c) => {
          const options = budgetOptions(budgetCaps[c], currency, exchangeRates);
          const order = ['q1', 'q2', 'q3'];
          // 相邻上限相同时只保留一个选项，这时用不高于这一档的最近一个
          const hit = options.filter((o) => o.choice !== 'none' && order.indexOf(o.choice) <= order.indexOf(q)).at(-1);
          return `${t(`category.${c}` as Key)} ${hit ? tx(hit.label) : t('skinQuiz.budgetNoCap')}`;
        }).join(' · ');
      body = (
        <>
          <h1 className="h1">{t('quiz.budget')}</h1>
          <p className="hint">{t('skinQuiz.budgetHint')}</p>
          <Single<FaceBudget>
            options={['q1', 'q2', 'q3', 'none', 'set']}
            value={face.budget}
            label={(v) => (v === 'none' ? t('quiz.budgetNone') : v === 'set' ? t('quiz.budgetSetCustom') : t(`skinQuiz.budget.${v}` as Key))}
            sub={(v) => (v === 'q1' || v === 'q2' || v === 'q3' ? tierLabel(v) : '')}
            onPick={(v) => setFace((f) => ({ ...f, budget: v, setBudget: v === 'set' ? f.setBudget ?? { amount: 0, currency } : null }))}
          />
          {face.budget === 'set' && (
            <MoneyInput
              value={face.setBudget && face.setBudget.amount > 0 ? face.setBudget : null}
              currency={currency}
              label={t('quiz.budgetSetInput')}
              onChange={(m) => setField('setBudget', m ?? { amount: 0, currency })}
            />
          )}
        </>
      );
      break;
    }
    case 'avoid':
      canContinue = avoidNone || base.avoid.length > 0 || base.avoidIngredients.length > 0;
      continueLabel = t('quiz.submit');
      body = <AvoidQuestion base={base} setBase={setBase} avoidNone={avoidNone} setAvoidNone={setAvoidNone} ingredientNames={ingredientNames} />;
      break;
  }

  return (
    <main className="shell quiz">
      <div className="progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <div className="quiz-head">
        <button type="button" className="textbtn" onClick={back}>← {t('quiz.back')}</button>
        {stepIndex > 0 && <span className="label">{t('quiz.counter', { n: stepIndex, total: questionCount })}</span>}
      </div>
      <div className="quiz-body" key={step}>{body}</div>
      <div className="quiz-foot">
        <button type="button" className="btn btn-primary btn-block" disabled={!canContinue} onClick={next}>
          {continueLabel}
        </button>
        {step !== 'intro' && step !== 'avoid' && (
          <p className="small muted" style={{ textAlign: 'center', marginTop: 10 }}>{t('quiz.skipHint')}</p>
        )}
      </div>
    </main>
  );
}
