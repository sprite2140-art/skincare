// 洗发水推荐结果：综合分、各维度高/中/低和原因、提示、排除原因；点击成分看解释。

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredientIndex, products } from '../data/load';
import type { Region } from '../data/types';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import { cityKey, scalpMedicalAlerts, toScalpScoringProfile, type ScalpAnswers } from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { formatMoney } from '../scoring/budget';
import { TEST_MODE_DRAFT_SCORING, type DimensionKey } from '../scoring/config';
import { filterByMarket, inMarket, marketForCity } from '../scoring/market';
import { ingredientStatuses, rankProducts, type Dimension, type IngredientStatus, type ProductScore } from '../scoring/score';

const EMPTY_SCALP: ScalpAnswers = { oilTiming: null, concerns: [], washFrequency: null };
const DIMENSIONS: DimensionKey[] = ['need', 'irritation', 'evidence', 'environment'];
const LEVEL_BARS = { high: 4, medium: 2, low: 1 } as const;

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

function ProductCard({ r, market }: { r: ProductScore; market: Region }) {
  const { t, tx, lang } = useI18n();
  const p = r.product;
  const otherRegion = !inMarket(p, market);
  const name = lang === 'zh' ? p.nameZh || p.nameEn : p.nameEn || p.nameZh;
  const otherNotices = r.notices.filter((n) => n.code !== 'test_data');
  return (
    <article className={r.excluded ? 'product excluded' : 'product'}>
      <div className="product-top">
        <div>
          <div className="brand">{p.brand}</div>
          <h3 className="name">{name}</h3>
          <div className="meta">
            {p.price !== null && (
              <span>{formatMoney(p.price, p.currency, false)}{p.sizeMl !== null ? ` · ${t('results.size', { n: p.sizeMl })}` : ''}</span>
            )}
            <span>{t('results.region')} {p.region}{otherRegion ? ` · ${t('results.otherRegion')}` : ''}</span>
            {r.usesDraftData && <span className="flag">{t('results.testData')}</span>}
          </div>
        </div>
        <div className="score">
          {r.score !== null ? (
            <>
              <div className="num">{r.score}</div>
              <div className="of">{t('results.score')}</div>
            </>
          ) : (
            <div className="of">{t('results.noScore')}</div>
          )}
        </div>
      </div>

      {r.exclusions.length > 0 && (
        <div className="flags bad">
          <span className="label">{t('results.why')}</span>
          <ul>{r.exclusions.map((f, i) => <li key={i}>{tx(f.text)}</li>)}</ul>
        </div>
      )}

      {r.score !== null && <ul className="dims">{DIMENSIONS.map((k) => <DimensionRow key={k} k={k} d={r.dimensions[k]} />)}</ul>}

      {r.conflicts.length > 0 && (
        <div className="flags">
          <span className="label">{t('results.conflicts')}</span>
          <ul>{r.conflicts.map((c, i) => <li key={i}>{tx(c.text)}</li>)}</ul>
        </div>
      )}

      <details className="more">
        <summary>{t('results.details')}</summary>
        {otherNotices.length > 0 && (
          <div className="flags">
            <span className="label">{t('results.notices')}</span>
            <ul>{otherNotices.map((f, i) => <li key={i}>{tx(f.text)}</li>)}</ul>
          </div>
        )}
        <div className="flags">
          <span className="label">{t('results.ingredients')}</span>
          <div className="ings">
            {ingredientStatuses(p, ingredientIndex).map((s, i) => <IngredientChip key={`${s.name}-${i}`} name={s.name} status={s.status} />)}
          </div>
          {p.inciListOriginal && <p className="small muted" style={{ marginTop: 10 }}>{t('results.original')}：{p.inciListOriginal}</p>}
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          {t('results.transparency')}：{t(`transparency.${p.transparency}` as Key)} · {t('results.cn')}：{t(`cn.${p.availableInCn}` as Key)}
        </p>
      </details>
    </article>
  );
}

export default function Results() {
  const { t, tx } = useI18n();
  const { profile } = useProfiles();
  const p = profile ?? newProfile('');
  const scalp = p.scalp ?? EMPTY_SCALP;

  const [showOthers, setShowOthers] = useState(false);
  const city = cities.find((c) => cityKey(c) === p.base.cityKey) ?? null;
  const market = marketForCity(city);
  const shampoos = products.filter((x) => x.category === 'shampoo');
  const { shown: inScope, hiddenCount } = filterByMarket(shampoos, market, showOthers);

  const ranked = useMemo(() => {
    const scoring = toScalpScoringProfile(p.base, scalp, 'shampoo', cities, []);
    return rankProducts(inScope, 'shampoo', scoring, {
      index: ingredientIndex,
      exchangeRates,
      budgetCaps,
      allowDraft: TEST_MODE_DRAFT_SCORING,
    });
    // inScope 只由 market 和 showOthers 决定
  }, [p.base, scalp, market, showOthers]);
  const alerts = scalpMedicalAlerts(scalp);
  const shown = ranked.filter((r) => !r.excluded);
  const excluded = ranked.filter((r) => r.excluded);

  return (
    <main className="shell">
      <header className="results-head">
        <div className="label">{t('results.kicker')}</div>
        <h1 className="h1" style={{ marginTop: 8 }}>{t('results.title')}</h1>
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
        {TEST_MODE_DRAFT_SCORING && (
          <div className="notice test">
            <strong>{t('results.testData')}</strong>
            {t('results.testBanner')}
          </div>
        )}
        {!profile?.scalp && <p className="small muted">{t('results.noProfile')}</p>}
      </div>

      <div className="toggle-row" style={{ marginTop: 16 }}>
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

      <p className="small muted" style={{ marginTop: 16 }}>
        {ranked.length === 0 ? t('results.empty') : t('results.count', { n: ranked.length, ok: shown.length })}
      </p>

      {shown.map((r) => <ProductCard key={r.product.productId} r={r} market={market} />)}

      {excluded.length > 0 && (
        <details className="excluded-list">
          <summary>{t('results.excluded', { n: excluded.length })}</summary>
          {excluded.map((r) => <ProductCard key={r.product.productId} r={r} market={market} />)}
        </details>
      )}
    </main>
  );
}
