// 护肤结果页（草案第 7 节）：顶部是整套流程的搭配检查和提示；早 / 晚两个标签，按步骤顺序列出，
// 每步 1 个首选（完整卡片）+ 2 个备选（可换成首选）；底部是总价和"只看基础 3 步"开关。
// 卡片沿用洗护的 ProductCard。

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cities, exchangeRates, faceActiveClasses, faceConflictNotes, budgetCaps, ingredientIndex, products } from '../data/load';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import { faceMedicalAlerts, isFaceSensitive, migrateFace, wearsMakeup } from '../profile/faceQuestionnaire';
import { baseStatuses, cityKey, moneyToUsd } from '../profile/questionnaire';
import { formatMoney, nextBudgetChoice } from '../scoring/budget';
import { TEST_MODE_DRAFT_SCORING } from '../scoring/config';
import { buildScheduledRoutine, isEligible, type RoutineStep } from '../scoring/faceRoutine';
import { FACE_NEED_LABELS, rankFaceStep, type FaceProductScore } from '../scoring/faceScore';
import { FEW_OPTIONS } from '../scoring/shortfall';
import type { ScheduledStep, TimeOfDay } from '../scoring/faceSchedule';
import type { FaceStepId } from '../scoring/faceSteps';
import { filterByMarket, marketForCity } from '../scoring/market';
import type { RiskTag } from '../data/types';
import ProductCard from './ProductCard';
import { EmptyNotice, FewOptions } from './Shortfall';

const usd = (n: number) => formatMoney(n, 'USD', false);

export default function FaceResults() {
  const { t, tx, lang } = useI18n();
  const { profile } = useProfiles();
  const hour = new Date().getHours();
  const [time, setTime] = useState<TimeOfDay>(hour >= 5 && hour < 17 ? 'am' : 'pm');
  const [basicOnly, setBasicOnly] = useState(false);
  const [hideMineral, setHideMineral] = useState(false);
  const [picks, setPicks] = useState<Partial<Record<FaceStepId, string>>>({});
  /** 打开了"看看稍高预算的选择"的步骤 */
  const [nextTierOpen, setNextTierOpen] = useState<Partial<Record<FaceStepId, boolean>>>({});

  const face = profile?.face ? migrateFace(profile.face) : null;
  const city = cities.find((c) => cityKey(c) === profile?.base.cityKey) ?? null;
  const market = marketForCity(city);
  const statuses = profile ? baseStatuses(profile.base) : [];
  const setBudgetUsd = face?.budget === 'set' && face.setBudget && face.setBudget.amount > 0 ? moneyToUsd(face.setBudget, exchangeRates) : null;

  const faceProducts = useMemo(() => filterByMarket(products.filter((p) => p.zone === 'face'), market, false).shown, [market]);
  const scoringData = { index: ingredientIndex, exchangeRates, budgetCaps, allowDraft: TEST_MODE_DRAFT_SCORING };
  const result = useMemo(() => {
    if (!face || !profile) return null;
    return buildScheduledRoutine({
      products: faceProducts, face, statuses, avoidIngredients: profile.base.avoidIngredients, avoidTags: profile.base.avoid as RiskTag[],
      data: scoringData,
      classes: faceActiveClasses, conflictNotes: faceConflictNotes, basicOnly, hideUntintedMineral: hideMineral, setBudgetUsd, picks,
    });
  }, [profile, basicOnly, hideMineral, picks, faceProducts]);

  if (!face || !profile || !result) {
    return (
      <main className="shell stack-lg" style={{ paddingTop: 32 }}>
        <p>{t('skinResults.empty')}</p>
        <Link className="btn btn-primary" to="/skin/quiz">{t('home.startSkin')}</Link>
      </main>
    );
  }

  const { routine, schedule, conflicts } = result;
  const alerts = faceMedicalAlerts(face);
  const slot = schedule[time];
  const hasOptional = routine.steps.some((s) => s.step.tier === 'optional') || basicOnly;

  /** 高一档预算的说明和那一档里多出来的可推荐产品（只在用户点了按钮后计算，不改变推荐） */
  const nextTier = (rs: RoutineStep) => {
    const caps = budgetCaps[rs.step.category];
    const next = nextBudgetChoice(rs.profile.budget, caps, rs.profile.customBudgetUsd ?? null);
    if (next === null) return null;
    const label = next === 'none' || !caps ? t('few.noLimit') : t('few.within', { cap: usd(caps[next as 'q1' | 'q2' | 'q3']) });
    if (!nextTierOpen[rs.step.id] || !face) return { label, extra: [] as FaceProductScore[] };
    const current = new Set(rs.eligible.map((r) => r.product.productId));
    const { ranked } = rankFaceStep(faceProducts, { ...rs.profile, budget: next, customBudgetUsd: null }, scoringData,
      { face, step: rs.step, classes: faceActiveClasses }, { hideUntintedMineral: hideMineral });
    return { label, extra: ranked.filter((r) => isEligible(r) && !current.has(r.product.productId)) };
  };

  const stepView = (s: ScheduledStep) => {
    const { step } = s.step;
    const rs = s.step;
    // 可推荐的少于 3 款：提示，可以看看高一档预算（不自动放宽）
    const tier = rs.status !== 'no_data' && rs.eligible.length < FEW_OPTIONS ? nextTier(rs) : null;
    const few = tier && (
      <FewOptions empty={rs.eligible.length === 0} nextCap={tier.label} open={!!nextTierOpen[step.id]} onToggle={() => setNextTierOpen({ ...nextTierOpen, [step.id]: !nextTierOpen[step.id] })} />
    );
    const because = step.becauseOf.map((c) => tx(FACE_NEED_LABELS[c])).join(lang === 'zh' ? '、' : ', ');
    return (
      <section key={step.id} className="slot">
        <div className="slot-head">
          <span className="label">
            {t(`category.${step.category}` as Key)} · {t(step.tier === 'basic' ? 'skinResults.basic' : 'skinResults.optional')}
            {s.weekly && <> · {t('skinResults.weekly')}</>}
          </span>
        </div>
        {because && <p className="small muted">{t('skinResults.because', { list: because })}</p>}
        {s.movedReason === 'bpo_retinoid' && <p className="small muted">{t('skinResults.movedBpo')}</p>}
        {step.id === 'sunscreen' && (
          <div className="toggle-row" style={{ marginTop: 8 }}>
            <span>{t('skinResults.hideMineral')}{rs.hidden > 0 && <><br /><span className="muted">{t('skinResults.hiddenCount', { n: rs.hidden })}</span></>}</span>
            <label className="switch">
              <input type="checkbox" checked={hideMineral} onChange={(e) => setHideMineral(e.target.checked)} aria-label={t('skinResults.hideMineral')} />
              <span />
            </label>
          </div>
        )}
        {rs.status === 'no_data' && <p className="small muted">{t('skinResults.noData')}</p>}
        {rs.status === 'no_match' ? (
          <EmptyNotice ranked={rs.ranked} quizPath="/skin/quiz">{few}</EmptyNotice>
        ) : rs.status === 'ok' && rs.eligible.length < FEW_OPTIONS && few}
        {s.product && (
          <>
            {s.bothTimes && <p className="small muted">{t('skinResults.bothTimes')}</p>}
            <ProductCard r={s.product} market={market} profile={rs.profile} scentGoal={false} />
            {rs.alternates.length > 0 && (
              <details className="sub" style={{ marginTop: 8 }}>
                <summary>{t('skinResults.alternates', { n: rs.alternates.length })}</summary>
                {rs.alternates.map((a) => (
                  <div key={a.product.productId} style={{ marginTop: 8 }}>
                    <ProductCard r={a} market={market} profile={rs.profile} scentGoal={false} compact />
                    <button type="button" className="textbtn" onClick={() => setPicks({ ...picks, [step.id]: a.product.productId })}>
                      {t('skinResults.makePrimary')}
                    </button>
                  </div>
                ))}
              </details>
            )}
          </>
        )}
        {tier && nextTierOpen[step.id] && tier.extra.length === 0 && <p className="small muted">{t('few.none', { cap: tier.label })}</p>}
        {tier && tier.extra.length > 0 && (
          <details className="sub" open style={{ marginTop: 8 }}>
            <summary>{t('few.heading', { cap: tier.label })}</summary>
            {tier.extra.map((r) => (
              <div key={r.product.productId} style={{ marginTop: 8 }}>
                <ProductCard r={r} market={market} profile={rs.profile} scentGoal={false} compact overBudget />
              </div>
            ))}
          </details>
        )}
      </section>
    );
  };

  return (
    <main className="shell">
      <header className="results-head">
        <div className="label">{t('skinQuiz.intro.kicker')}</div>
        <h1 className="h1" style={{ marginTop: 8 }}>{t('skinResults.title')}</h1>
        <div className="chips">
          {profile && <span className="tag">{profile.name}</span>}
          <span className="tag">{t('results.marketTag', { market: t(`region.${market}` as Key) })}</span>
          <Link className="tag" to="/skin/quiz">{t('results.editQuiz')}</Link>
        </div>
      </header>

      <div className="stack" style={{ marginTop: 16 }}>
        {/* 整套流程的搭配检查放在最上面 */}
        <div className={conflicts.length > 0 ? 'notice alert' : 'notice'} role="status">
          <strong>{conflicts.length > 0 ? t('skinResults.conflicts', { n: conflicts.length }) : t('skinResults.noConflicts')}</strong>
          {conflicts.length > 0 && (
            <details className="sub" open>
              <summary>{t('skinResults.conflictDetails')}</summary>
              <ul className="list">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    {tx(c.text)}
                    <div className="note">
                      {tx(c.advice)}
                      {c.source
                        ? <> · <a href={c.source.url} target="_blank" rel="noreferrer">{c.source.label}</a></>
                        : <> · {t('skinResults.industryPractice')}</>}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        {alerts.length > 0 && (
          <div className="notice alert" role="alert">
            <strong>{t('results.medical')}</strong>
            {alerts.map((a, i) => <p key={i}>{tx(a)}</p>)}
          </div>
        )}
        {isFaceSensitive(face) && <p className="small muted">{t('skinResults.patchTest')}</p>}
        {statuses.length === 0 && <p className="small muted">{t('skinResults.specialHint')} <Link to="/profile">{t('nav.profile')}</Link></p>}
        {TEST_MODE_DRAFT_SCORING && (
          <div className="notice test">
            <strong>{t('results.testData')}</strong>
            {t('results.testBanner')}
          </div>
        )}
        {routine.overBudget && setBudgetUsd !== null && (
          <div className="notice" role="status">
            <strong>{t('set.noMatch')}</strong>
            <p>{t('results.noMatchBody')}</p>
          </div>
        )}
      </div>

      <div className="segmented tabs" role="tablist" style={{ marginTop: 20 }}>
        {(['am', 'pm'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={time === v} onClick={() => setTime(v)}>
            {t(`skinResults.${v}` as Key)}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        {time === 'pm' && wearsMakeup(face) && <p className="small muted">{t('skinResults.makeup')}</p>}
        {slot.map(stepView)}
      </div>

      <div className="total" aria-live="polite">
        <span>{t('skinResults.total')}</span>
        <strong>{routine.totalUsd === null ? t('set.totalUnknown') : usd(routine.totalUsd)}</strong>
      </div>
      {setBudgetUsd !== null && <p className="small muted">{t('set.budget', { cap: usd(setBudgetUsd) })}</p>}

      {hasOptional && (
        <div className="toggle-row" style={{ marginTop: 16 }}>
          <span>{t('skinResults.basicOnly')}</span>
          <label className="switch">
            <input type="checkbox" checked={basicOnly} onChange={(e) => setBasicOnly(e.target.checked)} aria-label={t('skinResults.basicOnly')} />
            <span />
          </label>
        </div>
      )}
    </main>
  );
}
