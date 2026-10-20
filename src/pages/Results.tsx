// 推荐结果：洗发水 / 护发素 / 洗护搭配。产品卡片见 ProductCard.tsx。没有符合条件的商品时明确提示，不自动放宽条件。

import { useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import { Link } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredientIndex, products } from '../data/load';
import { LIST_CATEGORIES, productsForList, type ListCategory } from '../scoring/listProducts';
import type { Category } from '../data/types';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import {
  EMPTY_HAIR, adviseCare, cityKey, cityName, moneyToUsd, scalpInfoNotes, scalpMedicalAlerts, toScoringProfile, type Answers, type ScalpAnswers,
} from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { formatMoney } from '../scoring/budget';
import { TEST_MODE_DRAFT_SCORING } from '../scoring/config';
import { filterByMarket, marketForCity } from '../scoring/market';
import { buildRoutine, routineTotal } from '../scoring/routine';
import {
  rankProducts, type ProductScore, type ScoringProfile,
} from '../scoring/score';

const EMPTY_SCALP: ScalpAnswers = { oilTiming: null, concerns: [], washFrequency: null };
type View = ListCategory | 'set';
type SortBy = 'fit' | 'price';

function usdLabel(usd: number) {
  return formatMoney(usd, 'USD', false);
}

export default function Results() {
  const { t, tx, lang } = useI18n();
  const { profile } = useProfiles();
  const p = profile ?? newProfile('');
  const answers: Answers = { base: p.base, scalp: p.scalp ?? EMPTY_SCALP, hair: p.hair ?? EMPTY_HAIR };
  const { base, scalp, hair } = answers;
  const advice = base.scope === 'help' ? adviseCare(hair) : null;
  const initialView: View = base.scope === 'conditioner'
    ? 'conditioner'
    : base.scope === 'set' || (advice && advice.categories.length > 1) ? 'set' : 'shampoo';

  const [view, setView] = useState<View>(initialView);
  const [sortBy, setSortBy] = useState<SortBy>('fit');
  const [showOthers, setShowOthers] = useState(false);
  /** 搭配中用户替换或移除的单品：productId，null 表示已移除 */
  const [picks, setPicks] = useState<Partial<Record<Category, string | null>>>({});

  const city = cities.find((c) => cityKey(c) === base.cityKey) ?? null;
  const market = marketForCity(city);
  const scentGoal = hair.goals.includes('scent');

  // 单品列表（洗发水 / 护发素标签）按单买打分；洗护搭配标签按搭配打分（发丝效果只分给护发素），
  // 两者分开计算，切换标签时与显示的视图一致
  const score = (routineMode: boolean) => {
    const out = {} as Record<ListCategory, { ranked: ProductScore[]; total: number; hidden: number; profile: ScoringProfile }>;
    for (const cat of LIST_CATEGORIES) {
      const all = productsForList(products, cat);
      const { shown, hiddenCount } = filterByMarket(all, market, showOthers);
      const scoring = toScoringProfile(answers, cat, { cities, exchangeRates, routine: routineMode });
      const ranked = rankProducts(shown, cat, scoring, { index: ingredientIndex, exchangeRates, budgetCaps, allowDraft: TEST_MODE_DRAFT_SCORING });
      out[cat] = { ranked, total: all.length, hidden: hiddenCount, profile: scoring };
    }
    return out;
  };
  // answers 来自 profile，profile 变化时重新计算
  const data = useMemo(() => score(false), [profile, market, showOthers]);
  const setData = useMemo(() => score(true), [profile, market, showOthers]);

  const setCap = base.budgetMode === 'set' ? moneyToUsd(base.setBudget, exchangeRates) : null;
  const routine = useMemo(
    () => buildRoutine(['shampoo', 'conditioner'], { shampoo: setData.shampoo.ranked, conditioner: setData.conditioner.ranked }, setCap),
    [setData, setCap],
  );
  const alerts = scalpMedicalAlerts(scalp);
  const notes = scalpInfoNotes(scalp);

  const sorted = (list: ProductScore[]) =>
    sortBy === 'price'
      ? [...list].sort((a, b) => (a.price.usd ?? Infinity) - (b.price.usd ?? Infinity))
      : list;

  const listView = (cat: ListCategory) => {
    const d = data[cat];
    if (d.total === 0) {
      return (
        <div className="notice">
          <strong>{t(`empty.${cat}` as Key)}</strong>
          <p>{t('empty.dataPending')}</p>
          {cat === 'conditioner' && <button type="button" className="textbtn" onClick={() => setView('shampoo')}>{t('empty.seeShampoo')}</button>}
        </div>
      );
    }
    const shown = sorted(d.ranked.filter((r) => !r.excluded && !r.lowMatch && r.score !== null));
    // 选了需求但需求匹配为 0 的产品：不进入推荐列表，放在"不太匹配"
    const lowMatch = sorted(d.ranked.filter((r) => !r.excluded && r.lowMatch && r.score !== null));
    // 没有可用成分数据、无法评分的产品单独列出
    const unscored = d.ranked.filter((r) => !r.excluded && r.score === null);
    const excluded = d.ranked.filter((r) => r.excluded);
    return (
      <>
        <p className="small muted" style={{ marginTop: 4 }}>{t('results.count', { n: d.ranked.length, ok: shown.length })}</p>
        {shown.length === 0 && (
          <div className="notice" role="status">
            <strong>{t('results.noMatch')}</strong>
            <p>{t('results.noMatchBody')}</p>
            <Link to="/quiz">{t('results.editQuiz')}</Link>
          </div>
        )}
        {shown.map((r) => <ProductCard key={r.product.productId} r={r} market={market} profile={d.profile} scentGoal={scentGoal} />)}
        {lowMatch.length > 0 && (
          <details className="excluded-list">
            <summary>{t('results.lowMatch', { n: lowMatch.length })}</summary>
            <p className="small muted">{t('results.lowMatchBody')}</p>
            {lowMatch.map((r) => <ProductCard key={r.product.productId} r={r} market={market} profile={d.profile} scentGoal={scentGoal} />)}
          </details>
        )}
        {unscored.length > 0 && (
          <details className="excluded-list">
            <summary>{t('results.unscored', { n: unscored.length })}</summary>
            {unscored.map((r) => <ProductCard key={r.product.productId} r={r} market={market} profile={d.profile} scentGoal={scentGoal} />)}
          </details>
        )}
        {excluded.length > 0 && (
          <details className="excluded-list">
            <summary>{t('results.excluded', { n: excluded.length })}</summary>
            {excluded.map((r) => <ProductCard key={r.product.productId} r={r} market={market} profile={d.profile} scentGoal={scentGoal} />)}
          </details>
        )}
      </>
    );
  };

  const setView_ = () => {
    const items = routine.slots.map((s) => {
      const pick = picks[s.category];
      if (pick === null) return { slot: s, item: null, removed: true };
      const item = pick ? s.options.find((o) => o.product.productId === pick) ?? s.chosen : s.chosen;
      return { slot: s, item, removed: false };
    });
    const total = routineTotal(items.map((x) => x.item));
    // 选中的单品互为同系列时标出（只是说明，不要求成套购买）
    const chosen = items.filter((x) => x.item && !x.removed).map((x) => x.item!.product);
    const sameSeries = chosen.length === 2 && chosen[0].pairedProductIds.includes(chosen[1].productId);
    const otherChosen = (category: string) => chosen.find((p) => p.category !== category);
    const over = setCap !== null && total !== null && total > setCap + 1e-9;
    return (
      <>
        {routine.noMatch && (
          <div className="notice" role="status">
            <strong>{t('set.noMatch')}</strong>
            <p>{t('results.noMatchBody')}</p>
            <Link to="/quiz">{t('results.editQuiz')}</Link>
          </div>
        )}
        {sameSeries && <p className="small muted">{t('set.sameSeries')}</p>}
        {items.map(({ slot, item, removed }) => (
          <section key={slot.category} className="slot">
            <div className="slot-head">
              <span className="label">{t(`category.${slot.category}` as Key)}</span>
              {removed ? (
                <button type="button" className="textbtn" onClick={() => setPicks({ ...picks, [slot.category]: undefined })}>{t('set.restore')}</button>
              ) : item && (
                <button type="button" className="textbtn" onClick={() => setPicks({ ...picks, [slot.category]: null })}>{t('set.remove')}</button>
              )}
            </div>
            {slot.status === 'no_data' && <p className="small muted">{t(`empty.${slot.category}` as Key)}</p>}
            {slot.status === 'no_match' && !removed && <p className="small muted">{t('set.slotNoMatch')}</p>}
            {removed && <p className="small muted">{t('set.removed')}</p>}
            {item && !removed && (
              <>
                <ProductCard r={item} market={market} profile={setData[slot.category as ListCategory].profile} scentGoal={scentGoal} />
                {slot.options.length > 1 && (
                  <label className="replace">
                    <span className="small muted">{t('set.replace')}</span>
                    <select
                      className="select"
                      value={item.product.productId}
                      onChange={(e) => setPicks({ ...picks, [slot.category]: e.target.value })}
                    >
                      {slot.options.map((o) => (
                        <option key={o.product.productId} value={o.product.productId}>
                          {o.product.brand} · {o.product.nameEn}{o.product.subtype ? ` (${t(`subtype.${o.product.subtype}` as Key)})` : ''} · {o.price.usd !== null ? usdLabel(o.price.usd) : t('results.noPrice')}
                          {o.fitLevel ? ` · ${t(`fit.${o.fitLevel}` as Key)}` : ''}
                          {otherChosen(slot.category)?.pairedProductIds.includes(o.product.productId) ? ` · ${t('set.sameSeriesTag')}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
          </section>
        ))}
        <div className="total" aria-live="polite">
          <span>{t('set.total')}</span>
          <strong>{total === null ? t('set.totalUnknown') : usdLabel(total)}</strong>
        </div>
        {setCap !== null && (
          <p className={over ? 'small warn-text' : 'small muted'}>
            {over ? t('set.overBudget', { cap: usdLabel(setCap) }) : t('set.budget', { cap: usdLabel(setCap) })}
          </p>
        )}
        {advice?.suggestMask && <p className="small muted" style={{ marginTop: 8 }}>{t('set.maskPending')}</p>}
      </>
    );
  };

  const hiddenCount = view === 'set' ? data.shampoo.hidden + data.conditioner.hidden : data[view].hidden;

  return (
    <main className="shell">
      <header className="results-head">
        <div className="label">{t('results.kicker')}</div>
        <h1 className="h1" style={{ marginTop: 8 }}>{t(`results.title.${view}` as Key)}</h1>
        <div className="chips">
          <span className="tag">{city ? cityName(city, lang) : t('results.noCity')}</span>
          <span className="tag">{t('results.marketTag', { market })}</span>
          {profile && <span className="tag">{profile.name}</span>}
          <Link className="tag" to="/quiz">{t('results.editQuiz')}</Link>
        </div>
      </header>

      <div className="stack" style={{ marginTop: 16 }}>
        {alerts.length > 0 && (
          <div className="notice alert" role="alert">
            <strong>{t('results.medical')}</strong>
            {alerts.map((a) => <p key={a.code}>{tx(a.text)}</p>)}
          </div>
        )}
        {notes.length > 0 && (
          <div className="notice">
            <strong>{t('results.notes')}</strong>
            {notes.map((a) => <p key={a.code}>{tx(a.text)}</p>)}
          </div>
        )}
        {advice && (
          <div className="notice advice">
            <strong>{t('advice.title')}</strong>
            {advice.reasons.map((x, i) => <p key={i}>{tx(x)}</p>)}
            <p className="small muted">{t('advice.editable')}</p>
          </div>
        )}
        {TEST_MODE_DRAFT_SCORING && (
          <div className="notice test">
            <strong>{t('results.testData')}</strong>
            {t('results.testBanner')}
          </div>
        )}
        {(view === 'set'
          ? setData.shampoo.profile.concerns.length === 0 && setData.conditioner.profile.concerns.length === 0
          : data[view].profile.concerns.length === 0) && (
          <p className="small muted">{t('results.noNeeds')}</p>
        )}
        {!profile?.scalp && <p className="small muted">{t('results.noProfile')}</p>}
      </div>

      <div className="segmented tabs" role="tablist" style={{ marginTop: 20 }}>
        {(['shampoo', 'conditioner', 'set'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}>
            {t(`view.${v}` as Key)}
          </button>
        ))}
      </div>

      {view !== 'set' && (
        <div className="segmented small-seg" role="radiogroup" aria-label={t('sort.label')} style={{ marginTop: 12 }}>
          {(['fit', 'price'] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={sortBy === s} onClick={() => setSortBy(s)}>
              {t(`sort.${s}` as Key)}
            </button>
          ))}
        </div>
      )}

      {hiddenCount > 0 || showOthers ? (
        <div className="toggle-row" style={{ marginTop: 12 }}>
          <span>
            {t('results.showOthers', { n: hiddenCount })}
            <br />
            <span className="muted">{t('results.marketHint', { market })}</span>
          </span>
          <label className="switch">
            <input type="checkbox" checked={showOthers} onChange={(e) => setShowOthers(e.target.checked)} aria-label={t('results.showOthers', { n: hiddenCount })} />
            <span />
          </label>
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>{view === 'set' ? setView_() : listView(view)}</div>
    </main>
  );
}
