// 洗发水问卷：基础档案 + 头皮。全部点选，每题都可以跳过。

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredients } from '../data/load';
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

function Choice<T extends string>(props: {
  name: string;
  options: readonly T[];
  value: T | null;
  label: (v: T) => string;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="choices" role="radiogroup">
      {props.options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={props.value === o}
          className={props.value === o ? 'chip selected' : 'chip'}
          // 再点一次取消选择，方便跳过
          onClick={() => props.onChange(props.value === o ? null : o)}
        >
          {props.label(o)}
        </button>
      ))}
    </div>
  );
}

function Multi<T extends string>(props: { options: readonly T[]; value: T[]; label: (v: T) => string; onChange: (v: T[]) => void }) {
  return (
    <div className="choices">
      {props.options.map((o) => {
        const on = props.value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            className={on ? 'chip selected' : 'chip'}
            onClick={() => props.onChange(on ? props.value.filter((x) => x !== o) : [...props.value, o])}
          >
            {props.label(o)}
          </button>
        );
      })}
    </div>
  );
}

export default function Quiz() {
  const { t, tx } = useI18n();
  const { profile, save } = useProfiles();
  const navigate = useNavigate();
  const start = profile ?? newProfile(t('profile.defaultName'));
  const [base, setBase] = useState<BaseAnswers>(start.base);
  const [scalp, setScalp] = useState<ScalpAnswers>(start.scalp ?? EMPTY_SCALP);
  const [avoidInput, setAvoidInput] = useState('');

  const city = cities.find((c) => cityKey(c) === base.cityKey) ?? null;
  const currency = currencyForCountry(city?.country);
  const budgetChoices = useMemo(() => budgetOptions(budgetCaps.shampoo, currency, exchangeRates), [currency]);
  const ingredientNames = useMemo(() => ingredients.map((i) => i.inciName), []);

  const setScalpField = <K extends keyof ScalpAnswers>(k: K, v: ScalpAnswers[K]) => setScalp((s) => ({ ...s, [k]: v }));

  const addAvoid = () => {
    const name = avoidInput.trim();
    if (name && !base.avoidIngredients.includes(name)) setBase({ ...base, avoidIngredients: [...base.avoidIngredients, name] });
    setAvoidInput('');
  };

  const submit = () => {
    // 追问只在选了对应困扰时保留
    const cleaned: ScalpAnswers = {
      ...scalp,
      dandruffType: scalp.concerns.includes('dandruff') ? scalp.dandruffType : null,
      hairLossLevel: scalp.concerns.includes('hair_loss') ? scalp.hairLossLevel : null,
    };
    save({ ...start, base, scalp: cleaned });
    navigate('/results/shampoo');
  };

  return (
    <main>
      <h2>{t('quiz.title')}</h2>
      <p className="muted">{t('quiz.hint')}</p>

      <section className="card">
        <h3>{t('quiz.base')}</h3>

        <label className="q" htmlFor="city">{t('quiz.city')}</label>
        <select id="city" value={base.cityKey ?? ''} onChange={(e) => setBase({ ...base, cityKey: e.target.value || null })}>
          <option value="">{t('quiz.cityNone')}</option>
          {cities.map((c) => (
            <option key={cityKey(c)} value={cityKey(c)}>{cityKey(c)}</option>
          ))}
        </select>

        <p className="q">{t('quiz.budget')}</p>
        <Choice<BudgetChoice>
          name="budget"
          options={budgetChoices.map((o) => o.choice)}
          value={base.budgets.shampoo ?? null}
          label={(v) => tx(budgetChoices.find((o) => o.choice === v)!.label)}
          onChange={(v) => setBase({ ...base, budgets: { ...base.budgets, shampoo: v ?? 'none' } })}
        />
        <p className="muted small">{t('quiz.budgetHint')}</p>

        <p className="q">{t('quiz.avoid')}</p>
        <Multi<AvoidOption>
          options={['fragrance', 'alcohol', 'essential_oil']}
          value={base.avoid}
          label={(v) => t(`avoid.${v}` as Key)}
          onChange={(v) => setBase({ ...base, avoid: v })}
        />
        <div className="row">
          <input
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
          <button type="button" onClick={addAvoid}>{t('quiz.add')}</button>
        </div>
        <div className="choices">
          {base.avoidIngredients.map((n) => (
            <button
              key={n}
              type="button"
              className="chip selected"
              aria-label={`${t('quiz.remove')} ${n}`}
              onClick={() => setBase({ ...base, avoidIngredients: base.avoidIngredients.filter((x) => x !== n) })}
            >
              {n} ×
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>{t('quiz.scalp')}</h3>

        <p className="q">{t('quiz.oilTiming')}</p>
        <Choice<ScalpOilTiming>
          name="oil"
          options={['same_day', 'one_two_days', 'three_plus_days']}
          value={scalp.oilTiming}
          label={(v) => t(`quiz.oil.${v}` as Key)}
          onChange={(v) => setScalpField('oilTiming', v)}
        />

        <p className="q">{t('quiz.concerns')}</p>
        <Multi<ScalpConcern>
          options={['dandruff', 'itch', 'redness', 'hair_loss']}
          value={scalp.concerns}
          label={(v) => t(`quiz.concern.${v}` as Key)}
          onChange={(v) => setScalpField('concerns', v)}
        />

        {scalp.concerns.includes('dandruff') && (
          <>
            <p className="q">{t('quiz.dandruffType')}</p>
            <Choice<DandruffType>
              name="dandruff"
              options={['dry_fine', 'oily_large', 'red_recurring']}
              value={scalp.dandruffType ?? null}
              label={(v) => t(`quiz.dandruff.${v}` as Key)}
              onChange={(v) => setScalpField('dandruffType', v)}
            />
          </>
        )}

        {scalp.concerns.includes('hair_loss') && (
          <>
            <p className="q">{t('quiz.hairLoss')}</p>
            <Choice<HairLossLevel>
              name="hairLoss"
              options={['same_as_before', 'more_than_before', 'sudden_or_patchy']}
              value={scalp.hairLossLevel ?? null}
              label={(v) => t(`quiz.hairLoss.${v}` as Key)}
              onChange={(v) => setScalpField('hairLossLevel', v)}
            />
          </>
        )}

        <p className="q">{t('quiz.wash')}</p>
        <Choice<WashFrequency>
          name="wash"
          options={['daily', 'every_other_day', 'twice_weekly_or_less']}
          value={scalp.washFrequency}
          label={(v) => t(`quiz.wash.${v}` as Key)}
          onChange={(v) => setScalpField('washFrequency', v)}
        />
      </section>

      <button type="button" className="primary" onClick={submit}>{t('quiz.submit')}</button>
    </main>
  );
}
