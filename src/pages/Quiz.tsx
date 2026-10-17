// 洗护问卷：开头一屏说明，之后一屏一题（单选自动进入下一题），最后进入推荐结果。
// 除"想避开的成分"需要明确选择外，每一题都可以跳过；细问只在选了对应困扰时出现。答案只保存在本地。

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredients } from '../data/load';
import type { Category, City } from '../data/types';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import {
  EMPTY_HAIR, MAX_GOALS, cityKey, scopeCategories, type AvoidOption, type BaseAnswers, type BudgetMode, type CarePref,
  type ConditionerStatus, type DandruffType, type HairAnswers, type HairCondition, type HairGoal, type HairLossLevel,
  type HairTexture, type HairThickness, type Money, type PurchaseScope, type ScalpAnswers, type ScalpConcern, type ScalpOilTiming,
} from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { budgetOptions, type BudgetChoice } from '../scoring/budget';
import { currencyForCountry } from '../scoring/price';
import type { FragrancePref, WashFrequency } from '../scoring/score';

const EMPTY_SCALP: ScalpAnswers = {
  oilTiming: null, concerns: [], noConcerns: false, dandruffType: null, itchScore: null, hairLossLevel: null, washFrequency: null,
};
const AUTO_ADVANCE_MS = 220;

type StepId =
  | 'intro' | 'scope' | 'city' | 'oil' | 'concerns' | 'dandruff' | 'itch' | 'hairLoss' | 'wash'
  | 'thickness' | 'texture' | 'conditions' | 'goals' | 'fragrance' | 'hasConditioner' | 'carePref' | 'budget' | 'avoid';

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

/** 多选；noneLabel 为互斥的"没有"选项；max 为最多可选数 */
function Multi<T extends string>(props: {
  options: readonly T[]; value: T[]; label: (v: T) => string; onChange: (v: T[]) => void;
  noneLabel?: string; noneOn?: boolean; onNone?: () => void; max?: number;
}) {
  const full = props.max !== undefined && props.value.length >= props.max;
  return (
    <div className="options">
      {props.noneLabel && (
        <button type="button" aria-pressed={!!props.noneOn && props.value.length === 0} className="option multi" onClick={props.onNone}>
          <span className="mark" aria-hidden="true" />
          <span className="opt-text">{props.noneLabel}</span>
        </button>
      )}
      {props.options.map((o) => {
        const on = props.value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            disabled={!on && full}
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

/** 城市的水硬度：有数据时显示等级、数值、适用范围和来源，没有时显示"暂无数据" */
function WaterInfo({ city }: { city: City }) {
  const { t } = useI18n();
  const known = city.waterHardness !== 'unknown';
  return (
    <div className="infobox" aria-live="polite">
      <div className="label">{t('quiz.water.title', { city: city.city })}</div>
      <div className="value">{known ? t(`water.${city.waterHardness}` as Key) : t('quiz.water.none')}</div>
      {known && (
        <>
          {city.hardnessMgL && (
            <p className="small" style={{ marginTop: 6 }}>
              {t('quiz.water.value', { v: city.hardnessMgL })}{city.dataPeriod ? ` · ${city.dataPeriod}` : ''}
            </p>
          )}
          <details className="more small">
            <summary>{t('quiz.water.detail')}</summary>
            {city.supplyScope && <p className="muted" style={{ marginTop: 6 }}>{t('quiz.water.scope', { s: city.supplyScope })}</p>}
            <p className="muted" style={{ marginTop: 6 }}>{t('quiz.water.caveat')}</p>
            <p className="muted" style={{ marginTop: 6 }}>
              {city.source ? <a href={city.source} target="_blank" rel="noreferrer">{t('quiz.water.source')}</a> : t('quiz.water.noSource')}
              {city.retrievedOn && ` · ${t('quiz.water.retrieved', { d: city.retrievedOn })}`}
              {city.reviewStatus !== 'verified' && ` · ${t('quiz.water.unverified')}`}
            </p>
          </details>
        </>
      )}
      <p className="small muted" style={{ marginTop: 6 }}>{t('quiz.water.why')}</p>
    </div>
  );
}

/** 金额输入：只接受正数，清空时为 null */
function MoneyInput({ value, currency, label, onChange }: { value: Money | null | undefined; currency: string; label: string; onChange: (m: Money | null) => void }) {
  const [text, setText] = useState(value ? String(value.amount) : '');
  return (
    <div className="field money">
      <span className="money-cur" aria-hidden="true">{currency}</span>
      <input
        className="input"
        inputMode="decimal"
        aria-label={label}
        placeholder={label}
        value={text}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d.]/g, '');
          setText(v);
          const n = Number(v);
          onChange(v && Number.isFinite(n) && n > 0 ? { amount: n, currency } : null);
        }}
      />
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
  const [scalp, setScalp] = useState<ScalpAnswers>({ ...EMPTY_SCALP, ...(start.scalp ?? {}) });
  const [hair, setHair] = useState<HairAnswers>(start.hair ?? EMPTY_HAIR);
  const [avoidInput, setAvoidInput] = useState('');
  // "想避开的成分"选了"没有，跳过"；修改已有档案时，已保存过的答案视为已选择
  const [avoidNone, setAvoidNone] = useState(!!start.scalp && start.base.avoid.length === 0 && start.base.avoidIngredients.length === 0);
  const [conditionsNone, setConditionsNone] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const city = cities.find((c) => cityKey(c) === base.cityKey) ?? null;
  const currency = currencyForCountry(city?.country ?? 'US');
  const ingredientNames = useMemo(() => ingredients.map((i) => i.inciName), []);
  const categories = scopeCategories(base.scope, hair);
  const multiCategory = categories.length > 1;

  // 只买护发素时不问头皮
  const scalpSteps: StepId[] = base.scope === 'conditioner' ? [] : [
    'oil', 'concerns',
    ...(scalp.concerns.includes('dandruff') ? (['dandruff'] as StepId[]) : []),
    ...(scalp.concerns.includes('itch') ? (['itch'] as StepId[]) : []),
    ...(scalp.concerns.includes('hair_loss') ? (['hairLoss'] as StepId[]) : []),
    'wash',
  ];
  const steps: StepId[] = [
    'intro', 'scope', 'city', ...scalpSteps, 'thickness', 'texture', 'conditions', 'goals', 'fragrance',
    ...(base.scope === 'help' || base.scope === 'shampoo' || base.scope === null ? (['hasConditioner'] as StepId[]) : []),
    ...(base.scope === 'help' || base.scope === 'set' ? (['carePref'] as StepId[]) : []),
    'budget', 'avoid',
  ];
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const questionCount = steps.length - 1;
  const progress = stepIndex === 0 ? 0 : (stepIndex / questionCount) * 100;

  const finish = () => {
    const cleanedScalp: ScalpAnswers = {
      ...scalp,
      dandruffType: scalp.concerns.includes('dandruff') ? scalp.dandruffType : null,
      itchScore: scalp.concerns.includes('itch') ? scalp.itchScore : null,
      hairLossLevel: scalp.concerns.includes('hair_loss') ? scalp.hairLossLevel : null,
    };
    // 只有一个品类时预算一定按单品
    const cleanedBase: BaseAnswers = { ...base, budgetMode: multiCategory ? base.budgetMode : 'item' };
    save({ ...start, base: cleanedBase, scalp: cleanedScalp, hair });
    navigate('/results');
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
  const setHairField = <K extends keyof HairAnswers>(k: K, v: HairAnswers[K]) => setHair((h) => ({ ...h, [k]: v }));

  const addAvoid = () => {
    const name = avoidInput.trim();
    if (name && !base.avoidIngredients.includes(name)) setBase({ ...base, avoidIngredients: [...base.avoidIngredients, name] });
    setAvoidInput('');
    setAvoidNone(false);
  };

  /** 某品类的单品预算：三档 + 自填 */
  const budgetGroup = (category: Category) => {
    const tiers = budgetOptions(budgetCaps[category], currency, exchangeRates);
    const value = base.budgets[category] ?? null;
    const options: BudgetChoice[] = [...tiers.map((o) => o.choice), 'custom'];
    return (
      <section key={category} style={{ marginTop: 18 }}>
        {multiCategory && <div className="label">{t(`category.${category}` as Key)}</div>}
        {!budgetCaps[category] && <p className="small muted" style={{ marginTop: 6 }}>{t('quiz.budgetNoTiers')}</p>}
        <Single<BudgetChoice>
          options={options}
          value={value}
          label={(v) => (v === 'custom' ? t('quiz.budgetCustom') : tx(tiers.find((o) => o.choice === v)!.label))}
          onPick={(v) => setBase({ ...base, budgets: { ...base.budgets, [category]: v } })}
        />
        {value === 'custom' && (
          <MoneyInput
            value={base.customBudgets[category]}
            currency={currency}
            label={t('quiz.budgetCustomInput')}
            onChange={(m) => {
              const customBudgets = { ...base.customBudgets };
              if (m) customBudgets[category] = m;
              else delete customBudgets[category];
              setBase({ ...base, customBudgets });
            }}
          />
        )}
      </section>
    );
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
    case 'scope':
      body = (
        <>
          <h1 className="h1">{t('quiz.scope')}</h1>
          <Single<PurchaseScope>
            options={['shampoo', 'conditioner', 'set', 'help']}
            value={base.scope}
            label={(v) => t(`quiz.scope.${v}` as Key)}
            sub={(v) => (v === 'help' ? t('quiz.scope.helpSub') : v === 'conditioner' ? t('quiz.scope.conditionerSub') : '')}
            onPick={(v) => pickThenNext(() => setBase({ ...base, scope: v }))}
          />
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
            options={['dandruff', 'itch', 'redness', 'dry_tight', 'hair_loss']}
            value={scalp.concerns}
            label={(v) => t(`quiz.concern.${v}` as Key)}
            onChange={(v) => setScalp((s) => ({ ...s, concerns: v, noConcerns: false }))}
            noneLabel={t('quiz.concern.none')}
            noneOn={!!scalp.noConcerns}
            onNone={() => setScalp((s) => ({ ...s, concerns: [], noConcerns: true }))}
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
    case 'itch':
      body = (
        <>
          <h1 className="h1">{t('quiz.itch')}</h1>
          <p className="hint">{t('quiz.itchHint')}</p>
          <div className="scale" role="radiogroup" aria-label={t('quiz.itch')}>
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={scalp.itchScore === n}
                className="scale-btn"
                onClick={() => pickThenNext(() => setScalpField('itchScore', n))}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="scale-ends small muted"><span>{t('quiz.itch.min')}</span><span>{t('quiz.itch.max')}</span></div>
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
    case 'thickness':
      body = (
        <>
          <h1 className="h1">{t('quiz.thickness')}</h1>
          <Single<HairThickness>
            options={['fine', 'medium', 'coarse']}
            value={hair.thickness}
            label={(v) => t(`quiz.thickness.${v}` as Key)}
            sub={(v) => t(`quiz.thickness.${v}.sub` as Key)}
            onPick={(v) => pickThenNext(() => setHairField('thickness', v))}
          />
        </>
      );
      break;
    case 'texture':
      body = (
        <>
          <h1 className="h1">{t('quiz.texture')}</h1>
          <Single<HairTexture>
            options={['straight', 'wavy', 'curly', 'coily']}
            value={hair.texture}
            label={(v) => t(`quiz.texture.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setHairField('texture', v))}
          />
        </>
      );
      break;
    case 'conditions':
      body = (
        <>
          <h1 className="h1">{t('quiz.conditions')}</h1>
          <p className="hint">{t('quiz.multiHint')}</p>
          <Multi<HairCondition>
            options={['dry', 'tangling', 'colored', 'permed_bleached', 'breakage', 'heat']}
            value={hair.conditions}
            label={(v) => t(`quiz.condition.${v}` as Key)}
            onChange={(v) => {
              setHairField('conditions', v);
              setConditionsNone(false);
            }}
            noneLabel={t('quiz.condition.none')}
            noneOn={conditionsNone}
            onNone={() => {
              setHairField('conditions', []);
              setConditionsNone(true);
            }}
          />
        </>
      );
      break;
    case 'goals':
      body = (
        <>
          <h1 className="h1">{t('quiz.goals')}</h1>
          <p className="hint">{t('quiz.goalsHint', { n: MAX_GOALS })}</p>
          <Multi<HairGoal>
            options={['smooth', 'moisture', 'less_frizz', 'clean', 'volume', 'shine', 'curl', 'scent']}
            value={hair.goals}
            label={(v) => t(`quiz.goal.${v}` as Key)}
            onChange={(v) => setHairField('goals', v.slice(0, MAX_GOALS))}
            max={MAX_GOALS}
          />
          {hair.goals.includes('scent') && <p className="small muted" style={{ marginTop: 10 }}>{t('quiz.goal.scentNote')}</p>}
        </>
      );
      break;
    case 'fragrance':
      body = (
        <>
          <h1 className="h1">{t('quiz.fragrance')}</h1>
          <Single<FragrancePref>
            options={['free_first', 'ok', 'any']}
            value={hair.fragrancePref}
            label={(v) => t(`quiz.fragrance.${v}` as Key)}
            sub={(v) => (v === 'free_first' ? t('quiz.fragrance.freeSub') : '')}
            onPick={(v) => pickThenNext(() => setHairField('fragrancePref', v))}
          />
        </>
      );
      break;
    case 'hasConditioner':
      body = (
        <>
          <h1 className="h1">{t('quiz.hasConditioner')}</h1>
          <Single<ConditionerStatus>
            options={['satisfied', 'not_satisfied', 'none']}
            value={hair.hasConditioner}
            label={(v) => t(`quiz.hasConditioner.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setHairField('hasConditioner', v))}
          />
        </>
      );
      break;
    case 'carePref':
      body = (
        <>
          <h1 className="h1">{t('quiz.carePref')}</h1>
          <Single<CarePref>
            options={['simple', 'extra']}
            value={hair.carePref}
            label={(v) => t(`quiz.carePref.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setHairField('carePref', v))}
          />
        </>
      );
      break;
    case 'budget': {
      const mode: BudgetMode = multiCategory ? base.budgetMode : 'item';
      body = (
        <>
          <h1 className="h1">{t('quiz.budget')}</h1>
          <p className="hint">{t('quiz.budgetHint')}</p>
          {multiCategory && (
            <div className="segmented" role="radiogroup" aria-label={t('quiz.budgetMode')}>
              {(['item', 'set'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setBase({ ...base, budgetMode: m })}>
                  {t(`quiz.budgetMode.${m}` as Key)}
                </button>
              ))}
            </div>
          )}
          {mode === 'item' ? (
            categories.map(budgetGroup)
          ) : (
            <section style={{ marginTop: 18 }}>
              <Single<'none' | 'custom'>
                options={['none', 'custom']}
                value={base.setBudget ? 'custom' : 'none'}
                label={(v) => (v === 'none' ? t('quiz.budgetNone') : t('quiz.budgetSetCustom'))}
                // 金额为 0 表示还没填写，按不限处理
                onPick={(v) => setBase({ ...base, setBudget: v === 'none' ? null : base.setBudget ?? { amount: 0, currency } })}
              />
              {base.setBudget && (
                <MoneyInput
                  value={base.setBudget.amount > 0 ? base.setBudget : null}
                  currency={currency}
                  label={t('quiz.budgetSetInput')}
                  onChange={(m) => setBase({ ...base, setBudget: m ?? { amount: 0, currency } })}
                />
              )}
            </section>
          )}
        </>
      );
      break;
    }
    case 'avoid': {
      const nothingPicked = base.avoid.length === 0 && base.avoidIngredients.length === 0;
      canContinue = avoidNone || !nothingPicked;
      continueLabel = t('quiz.submit');
      body = (
        <>
          <h1 className="h1">{t('quiz.avoid')}</h1>
          <p className="hint">{t('quiz.avoidHint')}</p>
          <Multi<AvoidOption>
            options={['fragrance', 'alcohol', 'essential_oil']}
            value={base.avoid}
            label={(v) => t(`avoid.${v}` as Key)}
            onChange={(v) => {
              setBase({ ...base, avoid: v });
              setAvoidNone(false);
            }}
            noneLabel={t('quiz.avoidNone')}
            noneOn={avoidNone && nothingPicked}
            onNone={() => {
              setBase({ ...base, avoid: [], avoidIngredients: [] });
              setAvoidNone(true);
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
          <p className="small muted" style={{ textAlign: 'center', marginTop: 10 }}>
            {step === 'city' ? t('quiz.citySkipHint') : t('quiz.skipHint')}
          </p>
        )}
      </div>
    </main>
  );
}
