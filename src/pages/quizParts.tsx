// 问卷共用的选项组件：洗护问卷和护肤问卷都用。

import { useState } from 'react';
import type { AvoidOption, BaseAnswers, Money } from '../profile/questionnaire';
import { useI18n, type Key } from '../i18n';

export function Single<T extends string>(props: { options: readonly T[]; value: T | null; label: (v: T) => string; sub?: (v: T) => string; onPick: (v: T) => void }) {
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
export function Multi<T extends string>(props: {
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

/** 金额输入：只接受正数，清空时为 null */
export function MoneyInput({ value, currency, label, onChange }: { value: Money | null | undefined; currency: string; label: string; onChange: (m: Money | null) => void }) {
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

/** "有想避开的成分吗？"：成分类型多选 + 搜索具体成分；"没有，跳过"互斥。两个问卷共用同一份答案 */
export function AvoidQuestion({ base, setBase, avoidNone, setAvoidNone, ingredientNames }: {
  base: BaseAnswers; setBase: (b: BaseAnswers) => void; avoidNone: boolean; setAvoidNone: (v: boolean) => void; ingredientNames: string[];
}) {
  const { t } = useI18n();
  const [avoidInput, setAvoidInput] = useState('');
  const nothingPicked = base.avoid.length === 0 && base.avoidIngredients.length === 0;
  const addAvoid = () => {
    const name = avoidInput.trim();
    if (name && !base.avoidIngredients.includes(name)) setBase({ ...base, avoidIngredients: [...base.avoidIngredients, name] });
    setAvoidInput('');
    setAvoidNone(false);
  };
  return (
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
}
