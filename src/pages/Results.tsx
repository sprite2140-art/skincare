// 洗发水推荐结果：综合分、各维度高/中/低和原因、提示、排除原因；点击成分看解释。

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredientIndex, products } from '../data/load';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import { scalpMedicalAlerts, toScalpScoringProfile, type ScalpAnswers } from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import type { DimensionKey } from '../scoring/config';
import { formatMoney } from '../scoring/budget';
import { rankProducts, type Dimension, type ProductScore } from '../scoring/score';

const EMPTY_SCALP: ScalpAnswers = { oilTiming: null, concerns: [], washFrequency: null };
const DIMENSIONS: DimensionKey[] = ['need', 'irritation', 'evidence', 'environment'];

function IngredientChip({ name }: { name: string }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const ing = ingredientIndex.get(name);
  const status = !ing ? 'unknown' : ing.reviewStatus === 'verified' ? 'verified' : 'draft';
  const display = ing && lang === 'zh' && ing.nameZh ? ing.nameZh : name;
  const explain = ing ? (lang === 'zh' ? ing.explainZh : ing.explainEn) : '';
  return (
    <span className="ing">
      <button type="button" className={`ing-chip ${status}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {display}
      </button>
      {open && (
        <span className="ing-pop" role="dialog" aria-label={display}>
          <strong>{ing ? `${ing.inciName}${ing.nameZh ? ` / ${ing.nameZh}` : ''}` : name}</strong>
          {explain && <span>{explain}</span>}
          <span className="muted small">{t(`ing.${status}` as Key)}</span>
          <button type="button" className="link" onClick={() => setOpen(false)}>{t('ing.close')}</button>
        </span>
      )}
    </span>
  );
}

function DimensionRow({ k, d }: { k: DimensionKey; d: Dimension }) {
  const { t, tx } = useI18n();
  // 刺激风险分数高表示风险低，换成更直观的说法
  const levelKey = d.level === null ? 'level.none' : k === 'irritation' ? `irritation.${d.level}` : `level.${d.level}`;
  return (
    <li className="dim">
      <span className="dim-name">{t(`dim.${k}` as Key)}</span>
      <span className={`level ${d.level ?? 'none'}`}>{t(levelKey as Key)}</span>
      <span className="dim-reason">{tx(d.reason)}</span>
    </li>
  );
}

function ProductCard({ r }: { r: ProductScore }) {
  const { t, tx, lang } = useI18n();
  const p = r.product;
  const name = lang === 'zh' ? p.nameZh || p.nameEn : p.nameEn || p.nameZh;
  return (
    <article className={r.excluded ? 'card product excluded' : 'card product'}>
      <header className="product-head">
        <div>
          <div className="muted small">{p.brand}</div>
          <h3>{name}</h3>
          <div className="tags">
            <span className="tag">{t('results.region')}: {p.region}{p.formulaNote ? `（${p.formulaNote}）` : ''}</span>
            {p.price !== null && (
              <span className="tag">
                {t('results.price')}: {formatMoney(p.price, p.currency, false)}
                {p.sizeMl !== null ? ` / ${t('results.size', { n: p.sizeMl })}` : ''}
              </span>
            )}
            <span className="tag">{t('results.transparency')}: {t(`transparency.${p.transparency}` as Key)}</span>
            <span className="tag">{t('results.cn')}: {t(`cn.${p.availableInCn}` as Key)}</span>
          </div>
        </div>
        <div className="score">
          {r.score !== null ? (
            <>
              <span className="score-num">{r.score}</span>
              <span className="muted small">{t('results.score')}</span>
            </>
          ) : (
            <span className="muted">{t('results.noScore')}</span>
          )}
        </div>
      </header>

      {r.exclusions.length > 0 && (
        <div className="flags bad">
          <strong>{t('results.why')}</strong>
          <ul>{r.exclusions.map((f, i) => <li key={i}>{tx(f.text)}</li>)}</ul>
        </div>
      )}

      {r.score !== null && <ul className="dims">{DIMENSIONS.map((k) => <DimensionRow key={k} k={k} d={r.dimensions[k]} />)}</ul>}

      {r.conflicts.length > 0 && (
        <div className="flags">
          <strong>{t('results.conflicts')}</strong>
          <ul>{r.conflicts.map((c, i) => <li key={i}>{tx(c.text)}</li>)}</ul>
        </div>
      )}

      {r.notices.length > 0 && (
        <div className="flags">
          <strong>{t('results.notices')}</strong>
          <ul>{r.notices.map((f, i) => <li key={i}>{tx(f.text)}</li>)}</ul>
        </div>
      )}

      <details>
        <summary>{t('results.ingredients')}</summary>
        <div className="ings">{p.inciList.map((n, i) => <IngredientChip key={`${n}-${i}`} name={n} />)}</div>
        {p.inciListOriginal && (
          <p className="small"><span className="muted">{t('results.original')}：</span>{p.inciListOriginal}</p>
        )}
      </details>
    </article>
  );
}

export default function Results() {
  const { t, tx } = useI18n();
  const { profile } = useProfiles();
  const p = profile ?? newProfile('');
  const scalp = p.scalp ?? EMPTY_SCALP;

  const ranked = useMemo(() => {
    const scoring = toScalpScoringProfile(p.base, scalp, 'shampoo', cities, []);
    return rankProducts(products, 'shampoo', scoring, { index: ingredientIndex, exchangeRates, budgetCaps });
  }, [p.base, scalp]);
  const alerts = scalpMedicalAlerts(scalp);
  const shown = ranked.filter((r) => !r.excluded);
  const excluded = ranked.filter((r) => r.excluded);

  return (
    <main>
      <div className="row between">
        <h2>{t('results.title')}</h2>
        <Link to="/quiz">{t('results.editQuiz')}</Link>
      </div>

      {alerts.length > 0 && (
        <div className="card alert" role="alert">
          <strong>{t('results.medical')}</strong>
          {alerts.map((a) => <p key={a.code}>{tx(a.text)}</p>)}
        </div>
      )}

      {!profile?.scalp && <p className="muted">{t('results.noProfile')}</p>}

      {ranked.length === 0 ? (
        <p>{t('results.empty')}</p>
      ) : (
        <p className="muted">{t('results.count', { n: ranked.length, ok: shown.length })}</p>
      )}

      {shown.map((r) => <ProductCard key={r.product.productId} r={r} />)}

      {excluded.length > 0 && (
        <details className="excluded-list">
          <summary>{t('results.excluded', { n: excluded.length })}</summary>
          {excluded.map((r) => <ProductCard key={r.product.productId} r={r} />)}
        </details>
      )}
    </main>
  );
}
