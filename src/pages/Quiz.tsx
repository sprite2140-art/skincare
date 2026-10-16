// 洗发水问卷：开头一屏说明，之后一屏一题（单选自动进入下一题），最后进入推荐结果。
// 每一题都可以跳过；答案只保存在本地。

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredients } from '../data/load';
import type { City } from '../data/types';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import {
  cityKey, type AvoidOption, type BaseAnswers, type DandruffType, type HairLossLevel, type ScalpAnswers,
  type ScalpConcern, type ScalpOilTiming,
} from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { budgetOptions, type BudgetChoice } from '../scoring/budget';
import { currencyForCountry } from '../scoring/price';
import type { WashFrequency } from '../scoring/score';

const EMPTY_SCALP: ScalpAnswers = { oilTiming: null, concerns: [], dandruffType: null, hairLossLevel: null, washFrequency: null };
const AUTO_ADVANCE_MS = 220;

type StepId = 'intro' | 'city' | 'oil' | 'concerns' | 'dandruff' | 'hairLoss' | 'wash' | 'budget' | 'avoid';

function Single<T extends string>(props: { options: readonly T[]; value: T | null; label: (v: T) => string; sub?: (v: T) => string; onPick: (v: T) => void }) {
  return (
    <div className="options" role="radiogroup">
      {props.options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={props.value === o} className="option" onClick={() => props.onPick(o)}>
          <span className="mark" aria-hidden="true" />
          <span className="opt-text">
            <span>{props.label(o)}</span>
            {props.sub && props.sub(o) && <span className="opt-sub">{props.sub(o)}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Multi<T extends string>(props: { options: readonly T[]; value: T[]; label: (v: T) => string; onChange: (v: T[]) => void }) {
  return (
    <div className="options">
      {props.options.map((o) => {
        const on = props.value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            className="option multi"
            onClick={() => props.onChange(on ? props.value.filter((x) => x !== o) : [...props.value, o])}
          >
            <span className="mark" aria-hidden="true" />
            <span className="opt-text">{props.label(o)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 城市的水硬度：有数据时显示等级和来源，没有时显示"暂无数据" */
function WaterInfo({ city }: { city: City }) {
  const { t } = useI18n();
  const known = city.waterHardness !== 'unknown';
  return (
    <div className="infobox" aria-live="polite">
      <div className="label">{t('quiz.water.title', { city: city.city })}</div>
      <div className="value">{known ? t(`water.${city.waterHardness}` as Key) : t('quiz.water.none')}</div>
      {known && (
        <p className="small muted" style={{ marginTop: 6 }}>
          {city.source ? (
            <a href={city.source} target="_blank" rel="noreferrer">{t('quiz.water.source')}</a>
          ) : (
            t('quiz.water.noSource')
          )}
          {city.reviewStatus !== 'verified' && ` · ${t('quiz.water.unverified')}`}
        </p>
      )}
      <p className="small muted" style={{ marginTop: 6 }}>{t('quiz.water.why')}</p>
    </div>
  );
}

export default function Quiz() {
  const { t, tx } = useI18n();
  const { profile, save } = useProfiles();
  const navigate = useNavigate();
  const startRef = useRef(profile ?? newProfile(t('profile.defaultName')));
  const start = startRef.current;
  const [base, setBase] = useState<BaseAnswers>(start.base);
  const [scalp, setScalp] = useState<ScalpAnswers>(start.scalp ?? EMPTY_SCALP);
  const [avoidInput, setAvoidInput] = useState('');
  // "想避开的成分"选了"没有，跳过"
  const [avoidNone, setAvoidNone] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const city = cities.find((c) => cityKey(c) === base.cityKey) ?? null;
  const currency = currencyForCountry(city?.country ?? 'US');
  const budgetChoices = useMemo(() => budgetOptions(budgetCaps.shampoo, currency, exchangeRates), [currency]);
  const ingredientNames = useMemo(() => ingredients.map((i) => i.inciName), []);

  const steps: StepId[] = [
    'intro', 'city', 'oil', 'concerns',
    ...(scalp.concerns.includes('dandruff') ? (['dandruff'] as StepId[]) : []),
    ...(scalp.concerns.includes('hair_loss') ? (['hairLoss'] as StepId[]) : []),
    'wash', 'budget', 'avoid',
  ];
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const questionCount = steps.length - 1;
  const progress = stepIndex === 0 ? 0 : (stepIndex / questionCount) * 100;

  const finish = () => {
    const cleaned: ScalpAnswers = {
      ...scalp,
      dandruffType: scalp.concerns.includes('dandruff') ? scalp.dandruffType : null,
      hairLossLevel: scalp.concerns.includes('hair_loss') ? scalp.hairLossLevel : null,
    };
    save({ ...start, base, scalp: cleaned });
    navigate('/results/shampoo');
  };
  const next = () => (stepIndex >= steps.length - 1 ? finish() : setStepIndex(stepIndex + 1));
  const back = () => (stepIndex === 0 ? navigate('/') : setStepIndex(stepIndex - 1));
  /** 单选题：记下答案后稍等一下自动进入下一题 */
  const pickThenNext = (apply: () => void) => {
    apply();
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(next, AUTO_ADVANCE_MS);
  };
  const setScalpField = <K extends keyof ScalpAnswers>(k: K, v: ScalpAnswers[K]) => setScalp((s) => ({ ...s, [k]: v }));

  const addAvoid = () => {
    const name = avoidInput.trim();
    if (name && !base.avoidIngredients.includes(name)) setBase({ ...base, avoidIngredients: [...base.avoidIngredients, name] });
    setAvoidInput('');
    setAvoidNone(false);
  };

  let body: JSX.Element;
  let canContinue = true;
  let continueLabel = t('quiz.next');
  switch (step) {
    case 'intro':
      continueLabel = t('quiz.start');
      body = (
        <>
          <div className="label">{t('quiz.intro.kicker')}</div>
          <h1 className="h1">{t('quiz.intro.title')}</h1>
          <ul className="intro-list">
            {(['oil', 'dandruff', 'hair', 'env'] as const).map((k) => (
              <li key={k}>
                <strong>{t(`quiz.intro.${k}.title` as Key)}</strong>
                <span>{t(`quiz.intro.${k}.body` as Key)}</span>
              </li>
            ))}
          </ul>
          <p className="hint">{t('quiz.intro.privacy')}</p>
        </>
      );
      break;
    case 'city':
      body = (
        <>
          <h1 className="h1">{t('quiz.city')}</h1>
          <p className="hint">{t('quiz.cityHint')}</p>
          <select className="select" aria-label={t('quiz.city')} value={base.cityKey ?? ''} onChange={(e) => setBase({ ...base, cityKey: e.target.value || null })}>
            <option value="">{t('quiz.cityNone')}</option>
            <optgroup label={t('quiz.cityGroupUS')}>
              {cities.filter((c) => c.country === 'US').map((c) => <option key={cityKey(c)} value={cityKey(c)}>{c.city}</option>)}
            </optgroup>
            <optgroup label={t('quiz.cityGroupOther')}>
              {cities.filter((c) => c.country !== 'US').map((c) => <option key={cityKey(c)} value={cityKey(c)}>{cityKey(c)}</option>)}
            </optgroup>
          </select>
          {city && <WaterInfo city={city} />}
        </>
      );
      break;
    case 'oil':
      body = (
        <>
          <h1 className="h1">{t('quiz.oilTiming')}</h1>
          <Single<ScalpOilTiming>
            options={['same_day', 'one_two_days', 'three_plus_days']}
            value={scalp.oilTiming}
            label={(v) => t(`quiz.oil.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setScalpField('oilTiming', v))}
          />
        </>
      );
      break;
    case 'concerns':
      body = (
        <>
          <h1 className="h1">{t('quiz.concerns')}</h1>
          <p className="hint">{t('quiz.multiHint')}</p>
          <Multi<ScalpConcern>
            options={['dandruff', 'itch', 'redness', 'hair_loss']}
            value={scalp.concerns}
            label={(v) => t(`quiz.concern.${v}` as Key)}
            onChange={(v) => setScalpField('concerns', v)}
          />
        </>
      );
      break;
    case 'dandruff':
      body = (
        <>
          <h1 className="h1">{t('quiz.dandruffType')}</h1>
          <Single<DandruffType>
            options={['dry_fine', 'oily_large', 'red_recurring']}
            value={scalp.dandruffType ?? null}
            label={(v) => t(`quiz.dandruff.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setScalpField('dandruffType', v))}
          />
        </>
      );
      break;
    case 'hairLoss':
      body = (
        <>
          <h1 className="h1">{t('quiz.hairLoss')}</h1>
          <Single<HairLossLevel>
            options={['same_as_before', 'more_than_before', 'sudden_or_patchy']}
            value={scalp.hairLossLevel ?? null}
            label={(v) => t(`quiz.hairLoss.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setScalpField('hairLossLevel', v))}
          />
        </>
      );
      break;
    case 'wash':
      body = (
        <>
          <h1 className="h1">{t('quiz.wash')}</h1>
          <Single<WashFrequency>
            options={['daily', 'every_other_day', 'twice_weekly_or_less']}
            value={scalp.washFrequency}
            label={(v) => t(`quiz.wash.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setScalpField('washFrequency', v))}
          />
        </>
      );
      break;
    case 'budget':
      body = (
        <>
          <h1 className="h1">{t('quiz.budget')}</h1>
          <p className="hint">{t('quiz.budgetHint')}</p>
          <Single<BudgetChoice>
            options={budgetChoices.map((o) => o.choice)}
            value={base.budgets.shampoo ?? null}
            label={(v) => tx(budgetChoices.find((o) => o.choice === v)!.label)}
            onPick={(v) => pickThenNext(() => setBase({ ...base, budgets: { ...base.budgets, shampoo: v } }))}
          />
        </>
      );
      break;
    case 'avoid': {
      const nothingPicked = base.avoid.length === 0 && base.avoidIngredients.length === 0;
      canContinue = avoidNone || !nothingPicked;
      continueLabel = t('quiz.submit');
      body = (
        <>
          <h1 className="h1">{t('quiz.avoid')}</h1>
          <p className="hint">{t('quiz.avoidHint')}</p>
          <div className="options">
            <button
              type="button"
              aria-pressed={avoidNone && nothingPicked}
              className="option multi"
              onClick={() => {
                setBase({ ...base, avoid: [], avoidIngredients: [] });
                setAvoidNone(true);
              }}
            >
              <span className="mark" aria-hidden="true" />
              <span className="opt-text">{t('quiz.avoidNone')}</span>
            </button>
          </div>
          <Multi<AvoidOption>
            options={['fragrance', 'alcohol', 'essential_oil']}
            value={base.avoid}
            label={(v) => t(`avoid.${v}` as Key)}
            onChange={(v) => {
              setBase({ ...base, avoid: v });
              setAvoidNone(false);
            }}
          />
          <div className="field">
            <input
              className="input"
              list="ingredient-names"
              value={avoidInput}
              placeholder={t('quiz.avoidOther')}
              aria-label={t('quiz.avoidOther')}
              onChange={(e) => setAvoidInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAvoid()}
            />
            <datalist id="ingredient-names">
              {ingredientNames.map((n) => <option key={n} value={n} />)}
            </datalist>
            <button type="button" className="btn" onClick={addAvoid}>{t('quiz.add')}</button>
          </div>
          {base.avoidIngredients.length > 0 && (
            <div className="tags">
              {base.avoidIngredients.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="tag"
                  aria-label={`${t('quiz.remove')} ${n}`}
                  onClick={() => setBase({ ...base, avoidIngredients: base.avoidIngredients.filter((x) => x !== n) })}
                >
                  {n} ×
                </button>
              ))}
            </div>
          )}
        </>
      );
      break;
    }
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
