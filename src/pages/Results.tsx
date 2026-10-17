// 推荐结果：洗发水 / 护发素 / 洗护搭配。每款展示产品图、完整名称、规格价格、两条推荐理由和购买链接；
// 打分明细、成分、证据和使用说明折叠展示。没有符合条件的商品时明确提示，不自动放宽条件。

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredientIndex, products } from '../data/load';
import type { Category, Product, Region } from '../data/types';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import {
  EMPTY_HAIR, adviseCare, cityKey, moneyToUsd, scalpMedicalAlerts, toScoringProfile, type Answers, type ScalpAnswers,
} from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { formatMoney } from '../scoring/budget';
import { TEST_MODE_DRAFT_SCORING, type DimensionKey } from '../scoring/config';
import { filterByMarket, inMarket, marketForCity } from '../scoring/market';
import { recommendReasons } from '../scoring/reasons';
import { buildRoutine, routineTotal } from '../scoring/routine';
import {
  ingredientStatuses, rankProducts, type Dimension, type IngredientStatus, type ProductScore, type ScoringProfile,
} from '../scoring/score';

const EMPTY_SCALP: ScalpAnswers = { oilTiming: null, concerns: [], washFrequency: null };
const DIMENSIONS: DimensionKey[] = ['need', 'irritation', 'evidence', 'environment'];
const LEVEL_BARS = { high: 4, medium: 2, low: 1 } as const;
/** 本轮实现的品类；发膜、免洗护发乳、护发精油已预留数据结构 */
const LIST_CATEGORIES = ['shampoo', 'conditioner'] as const;
type ListCategory = (typeof LIST_CATEGORIES)[number];
type View = ListCategory | 'set';
type SortBy = 'fit' | 'price';

function IngredientChip({ name, status }: { name: string; status: IngredientStatus }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  // 名称未核对的成分显示为暂无数据，不展示可能对错的成分库信息
  const ing = status === 'name_unverified' ? undefined : ingredientIndex.get(name);
  const display = ing && lang === 'zh' && ing.nameZh ? ing.nameZh : name;
  const explain = ing ? (lang === 'zh' ? ing.explainZh : ing.explainEn) : '';
  return (
    <span className="ing">
      <button
        type="button"
        className={`ing-chip ${status === 'name_unverified' ? 'unknown' : status}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {display}
      </button>
      {open && (
        <span className="ing-pop" role="dialog" aria-label={display}>
          <strong>{ing ? `${ing.inciName}${ing.nameZh ? ` / ${ing.nameZh}` : ''}` : name}</strong>
          {explain && <span>{explain}</span>}
          <span className="muted">{t(`ing.${status}` as Key)}</span>
          <button type="button" className="textbtn" onClick={() => setOpen(false)}>{t('ing.close')}</button>
        </span>
      )}
    </span>
  );
}

function DimensionRow({ k, d }: { k: DimensionKey; d: Dimension }) {
  const { t, tx } = useI18n();
  // 刺激风险分数高表示风险低，换成更直观的说法
  const levelKey = d.level === null ? 'level.none' : k === 'irritation' ? `irritation.${d.level}` : `level.${d.level}`;
  const bars = d.level ? LEVEL_BARS[d.level] : 0;
  return (
    <li className="dim">
      <div className="dim-row">
        <span className="dim-name">{t(`dim.${k}` as Key)}</span>
        <span className="meter" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => <i key={i} className={i <= bars ? 'on' : ''} />)}
        </span>
        <span className={`dim-level ${d.level ?? 'none'}`}>{t(levelKey as Key)}</span>
      </div>
      <p className="dim-reason">{tx(d.reason)}</p>
    </li>
  );
}

/** 产品图：只有写明来源和使用许可的图片才展示，否则用统一占位图 */
function ProductImage({ p }: { p: Product }) {
  const { t } = useI18n();
  if (p.imageUrl && p.imageSource && p.imageLicense) {
    return (
      <figure className="pimg">
        <img src={p.imageUrl} alt={`${p.brand} ${p.nameEn}`} loading="lazy" />
      </figure>
    );
  }
  return (
    <figure className="pimg placeholder" aria-label={t('results.noImage')}>
      <svg viewBox="0 0 48 72" aria-hidden="true">
        <rect x="17" y="4" width="14" height="9" rx="2" />
        <rect x="9" y="13" width="30" height="55" rx="7" />
        <line x1="15" y1="34" x2="33" y2="34" />
        <line x1="15" y1="40" x2="28" y2="40" />
      </svg>
    </figure>
  );
}

function productName(p: Product, lang: string) {
  return lang === 'zh' ? p.nameZh || p.nameEn : p.nameEn || p.nameZh;
}

function ProductCard({ r, market, profile, scentGoal, compact }: {
  r: ProductScore; market: Region; profile: ScoringProfile; scentGoal: boolean; compact?: boolean;
}) {
  const { t, tx, lang } = useI18n();
  const p = r.product;
  const otherRegion = !inMarket(p, market);
  const reasons = r.excluded ? [] : recommendReasons(r, profile, scentGoal);
  const otherNotices = r.notices.filter((n) => n.code !== 'test_data');
  const f = r.fragrance;
  return (
    <article className={r.excluded ? 'product excluded' : 'product'}>
      <div className="product-top">
        <ProductImage p={p} />
        <div className="product-main">
          <div className="brand">{p.brand}</div>
          <h3 className="name">{productName(p, lang)}</h3>
          {lang === 'zh' && p.nameZh && p.nameEn && <div className="small muted">{p.nameEn}</div>}
          <div className="meta">
            <span>
              {p.price !== null ? formatMoney(p.price, p.currency, false) : t('results.noPrice')}
              {p.sizeMl !== null ? ` · ${t('results.size', { n: p.sizeMl })}` : ''}
            </span>
            {otherRegion && <span>{t('results.region')} {p.region} · {t('results.otherRegion')}</span>}
            {r.usesDraftData && <span className="flag">{t('results.testData')}</span>}
          </div>
          {p.awards.length > 0 && (
            <div className="tags" style={{ marginTop: 8 }}>
              {p.awards.map((a, i) => <span key={i} className="tag award">{a.source} {a.year}</span>)}
            </div>
          )}
        </div>
        {r.score !== null && !compact && (
          <div className="score">
            <div className="num">{r.score}</div>
            <div className="of">{t('results.score')}</div>
          </div>
        )}
      </div>

      {r.exclusions.length > 0 && (
        <div className="flags bad">
          <span className="label">{t('results.why')}</span>
          <ul>{r.exclusions.map((x, i) => <li key={i}>{tx(x.text)}</li>)}</ul>
        </div>
      )}

      {reasons.length > 0 && (
        <ul className="reasons">{reasons.map((x, i) => <li key={i}>{tx(x)}</li>)}</ul>
      )}

      {r.conflicts.length > 0 && (
        <div className="flags">
          <span className="label">{t('results.conflicts')}</span>
          <ul>{r.conflicts.map((c, i) => <li key={i}>{tx(c.text)}</li>)}</ul>
        </div>
      )}

      {!compact && (
        <div className="buy">
          {p.purchaseUrl ? (
            <a className="btn btn-block" href={p.purchaseUrl} target="_blank" rel="noreferrer nofollow">{t('results.buy')}</a>
          ) : (
            <span className="small muted">{t('results.noBuy')}</span>
          )}
        </div>
      )}

      <details className="more">
        <summary>{t('results.details')}</summary>
        {r.score !== null && <ul className="dims">{DIMENSIONS.map((k) => <DimensionRow key={k} k={k} d={r.dimensions[k]} />)}</ul>}
        <div className="flags">
          <span className="label">{t('results.basisTitle')}</span>
          <p className="small muted" style={{ marginTop: 6 }}>{t('results.basisNote')}</p>
          {p.keyActives.length > 0 && <p className="small" style={{ marginTop: 6 }}>{t('results.keyActives')}：{p.keyActives.join('；')}</p>}
          {!p.keyActivesDisclosed && <p className="small" style={{ marginTop: 6 }}>{t('results.keyActivesNone')}</p>}
        </div>
        <div className="flags">
          <span className="label">{t('results.fragrance')}</span>
          <p className="small" style={{ marginTop: 6 }}>
            {t(`fragrance.${f.status}` as Key)}
            {f.fragrance.length > 0 && `：${f.fragrance.join('、')}`}
          </p>
          {f.essentialOils.length > 0 && <p className="small">{t('fragrance.oils')}：{f.essentialOils.join('、')}</p>}
          {f.unknownCount > 0 && <p className="small muted">{t('fragrance.unknown', { n: f.unknownCount })}</p>}
          <p className="small muted">{t('fragrance.disclaimer')}</p>
        </div>
        {p.awards.length > 0 && (
          <div className="flags">
            <span className="label">{t('results.awards')}</span>
            <ul>
              {p.awards.map((a, i) => (
                <li key={i}>
                  {a.source} · {a.year} · {a.title}
                  {a.url && <> · <a href={a.url} target="_blank" rel="noreferrer">{t('results.source')}</a></>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {otherNotices.length > 0 && (
          <div className="flags">
            <span className="label">{t('results.notices')}</span>
            <ul>{otherNotices.map((x, i) => <li key={i}>{tx(x.text)}</li>)}</ul>
          </div>
        )}
        <div className="flags">
          <span className="label">{t('results.ingredients')}</span>
          <div className="ings">
            {ingredientStatuses(p, ingredientIndex).map((s, i) => <IngredientChip key={`${s.name}-${i}`} name={s.name} status={s.status} />)}
          </div>
          {p.inciListOriginal && <p className="small muted" style={{ marginTop: 10 }}>{t('results.original')}：{p.inciListOriginal}</p>}
        </div>
        <div className="flags">
          <span className="label">{t('results.usage')}</span>
          <p className="small" style={{ marginTop: 6 }}>{t(`usage.${p.category}` as Key)}</p>
          <p className="small muted">{t('usage.followLabel')}</p>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          {t('results.transparency')}：{t(`transparency.${p.transparency}` as Key)}
          {p.sourceUrls[0] && <> · <a href={p.sourceUrls[0]} target="_blank" rel="noreferrer">{t('results.dataSource')}</a></>}
        </p>
      </details>
    </article>
  );
}

function usdLabel(usd: number) {
  return formatMoney(usd, 'USD', false);
}

export default function Results() {
  const { t, tx } = useI18n();
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

  const data = useMemo(() => {
    const out = {} as Record<ListCategory, { ranked: ProductScore[]; total: number; hidden: number; profile: ScoringProfile }>;
    for (const cat of LIST_CATEGORIES) {
      const all = products.filter((x) => x.category === cat);
      const { shown, hiddenCount } = filterByMarket(all, market, showOthers);
      const scoring = toScoringProfile(answers, cat, { cities, exchangeRates });
      const ranked = rankProducts(shown, cat, scoring, { index: ingredientIndex, exchangeRates, budgetCaps, allowDraft: TEST_MODE_DRAFT_SCORING });
      out[cat] = { ranked, total: all.length, hidden: hiddenCount, profile: scoring };
    }
    return out;
    // answers 来自 profile，profile 变化时重新计算
  }, [profile, market, showOthers]);

  const setCap = base.budgetMode === 'set' ? moneyToUsd(base.setBudget, exchangeRates) : null;
  const routine = useMemo(
    () => buildRoutine(['shampoo', 'conditioner'], { shampoo: data.shampoo.ranked, conditioner: data.conditioner.ranked }, setCap),
    [data, setCap],
  );
  const alerts = scalpMedicalAlerts(scalp);

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
    const shown = sorted(d.ranked.filter((r) => !r.excluded));
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
                <ProductCard r={item} market={market} profile={data[slot.category as ListCategory].profile} scentGoal={scentGoal} />
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
                          {o.product.brand} · {o.product.nameEn} · {o.price.usd !== null ? usdLabel(o.price.usd) : t('results.noPrice')} · {o.score}
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
          <span className="tag">{city ? city.city : t('results.noCity')}</span>
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
