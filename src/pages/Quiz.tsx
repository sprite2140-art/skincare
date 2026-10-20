// 洗护问卷：开头一屏说明，之后一屏一题（单选自动进入下一题），最后进入推荐结果。
// 除"想避开的成分"需要明确选择外，每一题都可以跳过；细问只在选了对应困扰时出现。答案只保存在本地。

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredients } from '../data/load';
import type { Category } from '../data/types';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import {
  EMPTY_HAIR, MAX_GOALS, cityKey, cityName, goalAvailable, migrateHair, migrateScalp, scopeCategories,
  type Discomfort, type DiscomfortFrequency, type HairLength, type HairLossAmount, type Redness, type StylingUse, type ThinningArea, type BaseAnswers, type BudgetMode, type CarePref,
  type ConditionerStatus, type DandruffType, type HairAnswers, type HairCondition, type HairGoal,
  type HairTexture, type HairThickness, type PurchaseScope, type ScalpAnswers, type ScalpConcern, type ScalpOilTiming,
} from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { DandruffIllo, HairLossIllo } from './Illustrations';
import WaterInfo from './WaterInfo';
import { AvoidQuestion, MoneyInput, Multi, Single } from './quizParts';
import { budgetOptions, type BudgetChoice } from '../scoring/budget';
import { currencyForCountry } from '../scoring/price';
import type { FragrancePref, WashFrequency } from '../scoring/score';

const EMPTY_SCALP: ScalpAnswers = {
  oilTiming: null, concerns: [], noConcerns: false, dandruffType: null, itchScore: null, hairLossLevel: null, washFrequency: null,
};
const AUTO_ADVANCE_MS = 220;

/**
 * 当前答案下不可选的期望效果（取消染、烫漂后的去黄 / 去橙 / 修护受损 / 护色；造型产品不到每周 3 次时的
 * 去除造型产品残留）从已选效果中去掉，避免占用 3 项名额
 */
function withoutUnavailableGoals(h: HairAnswers, scalp: ScalpAnswers | null): HairAnswers {
  return { ...h, goals: h.goals.filter((g) => goalAvailable(g, h, scalp)) };
}

type StepId =
  | 'intro' | 'scope' | 'city' | 'oil' | 'concerns' | 'dandruff' | 'dandruffAmount' | 'itch' | 'discomfort' | 'redness'
  | 'hairLength' | 'hairLossAmount' | 'thinning' | 'washStyling'
  | 'thickness' | 'texture' | 'conditions' | 'goals' | 'fragrance' | 'hasConditioner' | 'carePref' | 'budget' | 'avoid';

export default function Quiz() {
  const { t, tx, lang } = useI18n();
  const { profile, save } = useProfiles();
  const navigate = useNavigate();
  const startRef = useRef(profile ?? newProfile(t('profile.defaultName')));
  const start = startRef.current;
  const [base, setBase] = useState<BaseAnswers>(start.base);
  const [scalp, setScalp] = useState<ScalpAnswers>(migrateScalp({ ...EMPTY_SCALP, ...(start.scalp ?? {}) }));
  const [hair, setHair] = useState<HairAnswers>(migrateHair(start.hair ?? EMPTY_HAIR));
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
  // 细问只在选了对应困扰时出现
  const scalpSteps: StepId[] = base.scope === 'conditioner' ? [] : [
    'concerns',
    // 出油时间只在选了"容易出油"时追问
    ...(scalp.concerns.includes('oily') ? (['oil'] as StepId[]) : []),
    ...(scalp.concerns.includes('dandruff') ? (['dandruff', 'dandruffAmount'] as StepId[]) : []),
    ...(scalp.concerns.includes('itch') ? (['itch'] as StepId[]) : []),
    'discomfort', 'redness',
    ...(scalp.concerns.includes('hair_loss') ? (['hairLength', 'hairLossAmount', 'thinning'] as StepId[]) : []),
    'washStyling',
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
      oilTiming: scalp.concerns.includes('oily') ? scalp.oilTiming : null,
      dandruffType: scalp.concerns.includes('dandruff') ? scalp.dandruffType : null,
      dandruffAmount: scalp.concerns.includes('dandruff') ? scalp.dandruffAmount : null,
      itchScore: scalp.concerns.includes('itch') ? scalp.itchScore : null,
      discomfortFrequency: (scalp.discomfort ?? []).length > 0 ? scalp.discomfortFrequency : null,
      hairLength: scalp.concerns.includes('hair_loss') ? scalp.hairLength : null,
      hairLossAmount: scalp.concerns.includes('hair_loss') ? scalp.hairLossAmount : null,
      thinning: scalp.concerns.includes('hair_loss') ? scalp.thinning : [],
      // 回答了新的掉发量题后，不再保留旧版追问
      hairLossLevel: scalp.concerns.includes('hair_loss') && scalp.hairLossAmount == null ? scalp.hairLossLevel : null,
    };
    // 去黄 / 去橙 / 修护受损 / 护色只在选了染或烫漂时有效，去除造型产品残留只在常用造型产品时有效
    const cleanedHair: HairAnswers = withoutUnavailableGoals(hair, base.scope === 'conditioner' ? null : cleanedScalp);
    // 只有一个品类时预算一定按单品
    const cleanedBase: BaseAnswers = { ...base, budgetMode: multiCategory ? base.budgetMode : 'item' };
    save({ ...start, base: cleanedBase, scalp: cleanedScalp, hair: cleanedHair });
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
              {cities.filter((c) => c.country === 'US').map((c) => <option key={cityKey(c)} value={cityKey(c)}>{cityName(c, lang)}</option>)}
            </optgroup>
            <optgroup label={t('quiz.cityGroupOther')}>
              {cities.filter((c) => c.country !== 'US').map((c) => <option key={cityKey(c)} value={cityKey(c)}>{cityName(c, lang)}</option>)}
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
            options={['same_day', 'next_day', 'three_four_days', 'five_plus_days']}
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
            options={['dandruff', 'itch', 'dry_tight', 'oily', 'sensitive', 'hair_loss']}
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
            options={['dry_fine', 'oily_large', 'thick_scaly']}
            value={scalp.dandruffType ?? null}
            label={(v) => t(`quiz.dandruff.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setScalpField('dandruffType', v))}
          />
        </>
      );
      break;
    case 'dandruffAmount':
      body = (
        <>
          <h1 className="h1">{t('quiz.dandruffAmount')}</h1>
          <p className="hint">{t('quiz.illoHint')}</p>
          <div className="illo-grid" role="radiogroup">
            {([1, 2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={scalp.dandruffAmount === n}
                className="illo-option"
                onClick={() => pickThenNext(() => setScalpField('dandruffAmount', n))}
              >
                <DandruffIllo level={n} />
                <span>{t(`quiz.dandruffAmount.${n}` as Key)}</span>
              </button>
            ))}
          </div>
        </>
      );
      break;
    case 'discomfort': {
      const picked = (scalp.discomfort ?? []).length > 0;
      body = (
        <>
          <h1 className="h1">{t('quiz.discomfort')}</h1>
          <p className="hint">{t('quiz.multiHint')}</p>
          <Multi<Discomfort>
            options={['stinging', 'burning', 'tightness', 'tingling']}
            value={scalp.discomfort ?? []}
            label={(v) => t(`quiz.discomfort.${v}` as Key)}
            onChange={(v) => setScalp((s) => ({ ...s, discomfort: v, discomfortNone: false }))}
            noneLabel={t('quiz.discomfort.none')}
            noneOn={!!scalp.discomfortNone}
            onNone={() => setScalp((s) => ({ ...s, discomfort: [], discomfortNone: true, discomfortFrequency: null }))}
          />
          {picked && (
            <section style={{ marginTop: 20 }}>
              <div className="label">{t('quiz.discomfortFrequency')}</div>
              <Single<DiscomfortFrequency>
                options={['sometimes', 'often']}
                value={scalp.discomfortFrequency ?? null}
                label={(v) => t(`quiz.discomfortFrequency.${v}` as Key)}
                onPick={(v) => setScalpField('discomfortFrequency', v)}
              />
            </section>
          )}
        </>
      );
      break;
    }
    case 'redness':
      body = (
        <>
          <h1 className="h1">{t('quiz.redness')}</h1>
          <Single<Redness>
            options={['none', 'occasional', 'often', 'spreading']}
            value={scalp.redness ?? null}
            label={(v) => t(`quiz.redness.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setScalpField('redness', v))}
          />
        </>
      );
      break;
    case 'hairLength':
      body = (
        <>
          <h1 className="h1">{t('quiz.hairLength')}</h1>
          <p className="hint">{t('quiz.hairLengthHint')}</p>
          <Single<HairLength>
            options={['short', 'shoulder', 'long']}
            value={scalp.hairLength ?? null}
            label={(v) => t(`quiz.hairLength.${v}` as Key)}
            onPick={(v) => pickThenNext(() => setScalpField('hairLength', v))}
          />
        </>
      );
      break;
    case 'hairLossAmount': {
      const short = scalp.hairLength === 'short';
      const levels = [1, 2, 3, 4, 5, 6] as const;
      const sudden = (
        <div className="options">
          <button
            type="button"
            role="radio"
            aria-checked={scalp.hairLossAmount === 'sudden'}
            className="option"
            onClick={() => pickThenNext(() => setScalpField('hairLossAmount', 'sudden'))}
          >
            <span className="mark" aria-hidden="true" />
            <span className="opt-text">{t('quiz.hairLossAmount.sudden')}</span>
          </button>
        </div>
      );
      body = (
        <>
          <h1 className="h1">{t('quiz.hairLossAmount')}</h1>
          <p className="hint">{short ? t('quiz.hairLossAmount.shortHint') : t('quiz.hairLossAmount.longHint')}</p>
          {short ? (
            <Single<`${(typeof levels)[number]}`>
              options={levels.map((n) => `${n}` as const)}
              value={typeof scalp.hairLossAmount === 'number' ? (`${scalp.hairLossAmount}` as `${(typeof levels)[number]}`) : null}
              label={(v) => t(`quiz.hairLossAmount.short.${v}` as Key)}
              onPick={(v) => pickThenNext(() => setScalpField('hairLossAmount', Number(v) as HairLossAmount))}
            />
          ) : (
            <div className="illo-grid three" role="radiogroup">
              {levels.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={scalp.hairLossAmount === n}
                  className="illo-option"
                  onClick={() => pickThenNext(() => setScalpField('hairLossAmount', n))}
                >
                  <HairLossIllo level={n} />
                  <span>{t(`quiz.hairLossAmount.long.${n}` as Key)}</span>
                </button>
              ))}
            </div>
          )}
          {sudden}
        </>
      );
      break;
    }
    case 'thinning':
      body = (
        <>
          <h1 className="h1">{t('quiz.thinning')}</h1>
          <p className="hint">{t('quiz.multiHint')}</p>
          <Multi<ThinningArea>
            options={['part_widening', 'hairline', 'crown', 'diffuse', 'patches']}
            value={scalp.thinning ?? []}
            label={(v) => t(`quiz.thinning.${v}` as Key)}
            onChange={(v) => setScalp((s) => ({ ...s, thinning: v, thinningNone: false }))}
            noneLabel={t('quiz.thinning.none')}
            noneOn={!!scalp.thinningNone}
            onNone={() => setScalp((s) => ({ ...s, thinning: [], thinningNone: true }))}
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
    case 'washStyling':
      body = (
        <>
          <h1 className="h1">{t('quiz.washStyling')}</h1>
          <section style={{ marginTop: 20 }}>
            <div className="label">{t('quiz.wash')}</div>
            <Single<WashFrequency>
              options={['daily', 'every_other_day', 'twice_weekly_or_less']}
              value={scalp.washFrequency}
              label={(v) => t(`quiz.wash.${v}` as Key)}
              onPick={(v) => setScalpField('washFrequency', v)}
            />
          </section>
          <section style={{ marginTop: 24 }}>
            <div className="label">{t('quiz.styling')}</div>
            <Single<StylingUse>
              options={['none', 'weekly_1_2', 'weekly_3_plus', 'daily']}
              value={scalp.styling ?? null}
              label={(v) => t(`quiz.styling.${v}` as Key)}
              onPick={(v) => setScalpField('styling', v)}
            />
          </section>
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
              setHair((h) => withoutUnavailableGoals({ ...h, conditions: v }, base.scope === 'conditioner' ? null : scalp));
              setConditionsNone(false);
            }}
            noneLabel={t('quiz.condition.none')}
            noneOn={conditionsNone}
            onNone={() => {
              setHair((h) => withoutUnavailableGoals({ ...h, conditions: [] }, base.scope === 'conditioner' ? null : scalp));
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
            options={([
              'smooth', 'moisture', 'less_frizz', 'clean', 'volume', 'shine', 'curl',
              'repair', 'color_care', 'tone_yellow', 'tone_orange', 'buildup', 'scent',
            ] as HairGoal[]).filter((g) => goalAvailable(g, hair, base.scope === 'conditioner' ? null : scalp))}
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
          <p className="small muted" style={{ textAlign: 'center', marginTop: 10 }}>
            {step === 'city' ? t('quiz.citySkipHint') : t('quiz.skipHint')}
          </p>
        )}
      </div>
    </main>
  );
}
