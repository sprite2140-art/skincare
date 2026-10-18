// 产品卡片（洗发水、护发素及以后的品类通用）。
// 原则：卡片展示"用户需要知道什么"，不展示"系统是怎么判断的"；判断方法统一放在数据说明页（/data）。
//
// 收起：产品图、品牌、名称、价格与规格、评分（评价数最多的平台）、适合等级（没选需求时为温和度）、
//       最多 2 个标签、最多 2 条推荐理由、"在 [平台] 购买" + "详情"。
// 展开：为什么推荐给你 → 在哪买 → 关键成分 → 香味与温和度 → 怎么用 → 同系列 · 数据说明；
//       评分明细收在最后一层折叠里。

import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ingredientIndex, products } from '../data/load';
import { COSING_RETRIEVED_ON, COSING_SOURCE } from '../data/cosing';
import { translateCosingFunctions } from '../data/cosingFunctions';
import { ratingCountText } from '../data/retail';
import type { Product, Region } from '../data/types';
import { useI18n, type Key } from '../i18n';
import { formatMoney } from '../scoring/budget';
import { hasAntiDandruffActive, irritantKinds, keyIngredients, primaryStore, storeRows, topRating, type StoreRow } from '../scoring/cardData';
import type { DimensionKey } from '../scoring/config';
import { joinNames } from '../scoring/labels';
import { inMarket } from '../scoring/market';
import { detailReasons, recommendReasons } from '../scoring/reasons';
import { ingredientStatuses, type Dimension, type IngredientStatus, type ProductScore, type ScoringProfile } from '../scoring/score';
import { MIN_RATING_COUNT } from '../data/retail';

const DIMENSIONS: DimensionKey[] = ['need', 'irritation', 'evidence', 'environment'];
/** 卡片上最多显示的标签数 */
const MAX_CARD_TAGS = 2;

export function productName(p: Product, lang: string) {
  return lang === 'zh' ? p.nameZh || p.nameEn : p.nameEn || p.nameZh;
}

/** 成分标签：中文界面显示中文名，英文 INCI 名在点开后的解释里；英文界面反之。所有成分同一样式 */
function IngredientChip({ name, status }: { name: string; status: IngredientStatus }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLSpanElement>(null);
  // 弹窗靠右的成分：向左移动，不超出屏幕
  useLayoutEffect(() => {
    const el = popRef.current;
    if (!open || !el) return;
    el.style.left = '0px';
    const overflow = el.getBoundingClientRect().right - (document.documentElement.clientWidth - 12);
    if (overflow > 0) el.style.left = `${-overflow}px`;
  }, [open]);
  // 名称未核对的成分不展示可能对错的成分库信息
  const ing = status === 'name_unverified' ? undefined : ingredientIndex.get(name);
  const display = lang === 'zh' && ing?.nameZh ? ing.nameZh : name;
  const other = lang === 'zh' ? (ing ? ing.inciName : name) : ing?.nameZh ?? '';
  const explain = ing ? (lang === 'zh' ? ing.explainZh : ing.explainEn) : '';
  const fns = ing?.cosingFunctions?.length ? translateCosingFunctions(ing.cosingFunctions, lang) : [];
  return (
    <span className="ing">
      <button type="button" className="ing-chip" aria-expanded={open} onClick={() => setOpen(!open)}>{display}</button>
      {open && (
        <span ref={popRef} className="ing-pop" role="dialog" aria-label={display}>
          <strong>{display}</strong>
          {other && other !== display && <span className="muted">{other}</span>}
          {explain && (
            <span>
              {explain}
              {ing!.reviewStatus !== 'verified' && <span className="muted">（{t('ing.explainDraft')}）</span>}
            </span>
          )}
          {fns.length > 0 && (
            <span>
              {t('ing.cosingFunctions')}：{fns.join(lang === 'zh' ? '、' : ', ')}
              <span className="muted ing-src">
                {t('ing.cosingSource', { d: COSING_RETRIEVED_ON })} · <a href={COSING_SOURCE} target="_blank" rel="noreferrer">CosIng</a>
              </span>
            </span>
          )}
          {ing?.euAllergen && <span>{t('ing.euAllergen')}</span>}
          {status === 'name_unverified' || status === 'unknown' ? <span className="muted">{t(`ing.${status}` as Key)}</span> : null}
          <button type="button" className="textbtn" onClick={() => setOpen(false)}>{t('ing.close')}</button>
        </span>
      )}
    </span>
  );
}

/** 占位图：按品类用不同的简洁图标，统一的柔和底色 */
function PlaceholderIcon({ kind }: { kind: 'shampoo' | 'conditioner' | 'cowash' | 'other' }) {
  switch (kind) {
    case 'shampoo': // 按压瓶
      return (
        <svg viewBox="0 0 48 64" aria-hidden="true">
          <path d="M20 6h10M25 6v6M19 12h12v6H19z" />
          <rect x="12" y="18" width="24" height="40" rx="7" />
          <path d="M18 34c4 3 8 3 12 0" />
        </svg>
      );
    case 'conditioner': // 软管
      return (
        <svg viewBox="0 0 48 64" aria-hidden="true">
          <path d="M14 8h20l-3 40H17z" />
          <rect x="18" y="48" width="12" height="8" rx="2" />
          <path d="M18 22h12" />
        </svg>
      );
    case 'cowash': // 罐
      return (
        <svg viewBox="0 0 48 64" aria-hidden="true">
          <rect x="10" y="20" width="28" height="8" rx="3" />
          <rect x="12" y="28" width="24" height="24" rx="5" />
          <path d="M18 40h12" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 64" aria-hidden="true">
          <rect x="17" y="6" width="14" height="8" rx="2" />
          <rect x="11" y="14" width="26" height="44" rx="7" />
        </svg>
      );
  }
}

/** 产品图：只展示写明来源、开放许可和署名的图片（如 Open Beauty Facts），否则用占位图；加载失败时也退回占位图 */
function ProductImage({ p }: { p: Product }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  if (!failed && p.imageUrl && p.imageSource && p.imageLicense && p.imageLicenseUrl && p.imageAttribution) {
    return (
      <figure className="pimg">
        <img src={p.imageUrl} alt={`${p.brand} ${p.nameEn}`} loading="lazy" onError={() => setFailed(true)} />
      </figure>
    );
  }
  const kind = p.subtype === 'co_wash' ? 'cowash' : p.category === 'shampoo' || p.category === 'conditioner' ? p.category : 'other';
  return (
    <figure className="pimg placeholder" aria-label={t('results.noImage')}>
      <PlaceholderIcon kind={kind} />
    </figure>
  );
}

function ExternalIcon() {
  return (
    <svg className="ext" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9 3h4v4M13 3L7 9M11 9v3.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5H7" />
    </svg>
  );
}

function firstSentence(s: string) {
  const m = s.match(/^.*?[。.](?=\s|$|[^0-9])/);
  return (m ? m[0] : s).replace(/（成分数据未核对）|\(ingredient data not yet verified\)/, '').trim();
}

function storeName(row: Pick<StoreRow, 'platform' | 'host'>, t: (k: Key) => string) {
  return row.platform === 'other' ? row.host : t(`platform.${row.platform}` as Key);
}

/** 评分明细里的一个维度（不显示"不计分""不适用""数据缺失"的维度） */
function DimensionRow({ k, d }: { k: DimensionKey; d: Dimension }) {
  const { t, tx } = useI18n();
  const levelKey = k === 'irritation' || k === 'evidence' ? `${k}.${d.level}` : `level.${d.level}`;
  return (
    <li className="dim">
      <div className="dim-row">
        <span className="dim-name">{t(`dim.${k}` as Key)}</span>
        <span className={`dim-level ${d.level}`}>{t(levelKey as Key)}</span>
      </div>
      <p className="dim-reason">{tx(d.reason)}</p>
    </li>
  );
}

export default function ProductCard({ r, market, profile, scentGoal, compact }: {
  r: ProductScore; market: Region; profile: ScoringProfile; scentGoal: boolean; compact?: boolean;
}) {
  const { t, tx, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const p = r.product;
  const f = r.fragrance;
  const reasons = r.excluded ? [] : recommendReasons(r, profile, scentGoal);
  const top = topRating(p);
  const primary = primaryStore(p);
  const rows = storeRows(p);
  const free = f.status !== 'contains';
  // 标签统一样式、最多两个：co-wash > 无香 > 一个奖项
  const tags = [
    p.subtype ? t(`subtype.${p.subtype}` as Key) : null,
    free ? t('scentTag.free') : null,
    p.awards[0] ? `${p.awards[0].source} ${p.awards[0].year}` : null,
  ].filter((x): x is string => !!x).slice(0, MAX_CARD_TAGS);
  const gentleLevel = r.dimensions.irritation.level;

  return (
    <article className={r.excluded ? 'product excluded' : 'product'}>
      <div className="product-top">
        <ProductImage key={p.productId} p={p} />
        <div className="product-main">
          <div className="brand">{p.brand}</div>
          <h3 className="name">{productName(p, lang)}</h3>
          <div className="meta">
            {p.price !== null ? formatMoney(p.price, p.currency, false) : t('results.noPrice')}
            {p.sizeMl !== null ? ` · ${t('results.size', { n: p.sizeMl })}` : ''}
            {!inMarket(p, market) && ` · ${t('results.region')} ${p.region}`}
          </div>
          {top && (
            <div className="rating-line">
              <span aria-hidden="true">★</span> {top.rating.toFixed(1)} · <span className="nowrap">{t('card.ratingLine', { platform: t(`platform.${top.platform}` as Key), n: ratingCountText(top) })}</span>
            </div>
          )}
          {tags.length > 0 && <div className="tags">{tags.map((x, i) => <span key={i} className="tag">{x}</span>)}</div>}
        </div>
        {r.score !== null && !compact && (r.noNeeds ? (
          gentleLevel && (
            <div className="fitbadge gentle">
              <span className="fit-label">{t('results.gentle')}</span>
              <strong>{t(`gentle.${gentleLevel}` as Key)}</strong>
            </div>
          )
        ) : r.fitLevel && (
          <div className={`fitbadge ${r.fitLevel}`}><strong>{t(`fit.${r.fitLevel}` as Key)}</strong></div>
        ))}
      </div>

      {r.exclusions.length > 0 && (
        <div className="flags bad">
          <span className="label">{t('results.why')}</span>
          <ul>{r.exclusions.map((x, i) => <li key={i}>{tx(x.text)}</li>)}</ul>
        </div>
      )}
      {reasons.length > 0 && <ul className="reasons">{reasons.map((x, i) => <li key={i}>{tx(x)}</li>)}</ul>}
      {r.conflicts.length > 0 && (
        <div className="flags">
          <span className="label">{t('results.conflicts')}</span>
          <ul>{r.conflicts.map((c, i) => <li key={i}>{tx(c.text)}</li>)}</ul>
        </div>
      )}

      <div className="card-actions">
        {!compact && (primary ? (
          <a className="btn btn-primary" href={primary.url} target="_blank" rel="noreferrer nofollow">
            {t('card.buyAt', { store: storeName(primary, t) })}
          </a>
        ) : <span className="small muted">{t('results.noBuy')}</span>)}
        <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? t('card.hide') : t('card.details')}
        </button>
      </div>

      {open && <CardDetails r={r} profile={profile} scentGoal={scentGoal} rows={rows} />}
    </article>
  );
}

function CardDetails({ r, profile, scentGoal, rows }: { r: ProductScore; profile: ScoringProfile; scentGoal: boolean; rows: StoreRow[] }) {
  const { t, tx, lang } = useI18n();
  const p = r.product;
  const f = r.fragrance;
  const why = detailReasons(r, profile, scentGoal);
  const keys = keyIngredients(p, ingredientIndex, profile.concerns);
  const all = ingredientStatuses(p, ingredientIndex);
  const checked = [...new Set(p.ratings.map((x) => x.checkedOn).filter(Boolean))].sort().at(-1);
  const kinds = irritantKinds(p, ingredientIndex, profile.washFrequency === 'daily' && !profile.frequentStyling);
  const scored = DIMENSIONS.filter((k) => r.dimensions[k].score !== null);
  const notices = r.notices.filter((n) => n.code !== 'test_data' && n.code !== 'key_actives_missing');
  const bc = p.brandClaims;
  const quote = bc.status === 'brand_page_quote' || lang !== 'zh' ? bc.quote || bc.text : bc.text;
  const paired = p.pairedProductIds.map((id) => products.find((x) => x.productId === id)).filter((x): x is Product => !!x);
  const ingName = (raw: string) => {
    const ing = ingredientIndex.get(raw);
    return lang === 'zh' && ing?.nameZh ? ing.nameZh : raw;
  };

  return (
    <div className="card-details">
      {/* 1. 为什么推荐给你 */}
      <section>
        <h4 className="sec-title">{t('card.why')}</h4>
        <ul className="why">
          {why.map((x, i) => (
            <li key={i}>
              <span>{tx(x)}</span>
              {x.basis && <span className="basis-tag">{t(`basisTag.${x.basis}` as Key)}</span>}
            </li>
          ))}
          {p.awards.map((a, i) => (
            <li key={`a${i}`}>
              <span>
                {a.url ? <a href={a.url} target="_blank" rel="noreferrer">{a.source} {a.year}</a> : `${a.source} ${a.year}`}：{a.title}
              </span>
              <span className="basis-tag">{t('basisTag.award')}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. 在哪买 */}
      {rows.length > 0 && (
        <section>
          <h4 className="sec-title">{t('card.where')}</h4>
          <ul className="stores">
            {rows.map((row) => (
              <li key={row.platform + row.url}>
                <a className="store-row" href={row.url} target="_blank" rel="noreferrer nofollow">
                  <span className="store-name">{storeName(row, t)}</span>
                  <span className="store-rating">
                    {row.rating
                      ? <>★ {row.rating.rating.toFixed(1)} · {t('results.ratingCount', { n: ratingCountText(row.rating) })}</>
                      : row.lowCount ? t('card.lowRating', { n: MIN_RATING_COUNT }) : t('card.noRating')}
                  </span>
                  <ExternalIcon />
                </a>
              </li>
            ))}
          </ul>
          {checked && (
            <p className="note">
              <Link to="/data#ratings">{t('card.ratingFoot', { d: checked })}</Link>
            </p>
          )}
        </section>
      )}

      {/* 3. 关键成分 */}
      <section>
        <h4 className="sec-title">{t('card.keyIngs')}</h4>
        {keys.length > 0 ? (
          <ul className="keyings">
            {keys.map((k) => <li key={k.ingredient.inciName}><span className="muted">{tx(k.role)}</span> · {ingName(k.raw)}</li>)}
          </ul>
        ) : <p className="note">{t('card.noKeyIngs')}</p>}
        <details className="sub">
          <summary>{t('card.allIngs', { n: all.length })}</summary>
          <div className="ings">
            {all.map((s, i) => <IngredientChip key={`${s.name}-${i}`} name={s.name} status={s.status} />)}
          </div>
          {p.inciListOriginal && <p className="note">{t('results.original')}：{p.inciListOriginal}</p>}
        </details>
      </section>

      {/* 4. 香味与温和度 */}
      <section>
        <h4 className="sec-title">{t('card.scentGentle')}</h4>
        <dl className="kv">
          <div>
            <dt>{t('card.scent')}</dt>
            <dd>
              {f.status === 'labeled_free' && t('card.scent.labeled_free')}
              {f.status === 'none_found' && (f.unknownCount > 0 ? t('card.scent.none_found_unknown', { n: f.unknownCount }) : t('card.scent.none_found'))}
              {f.status === 'contains' && (f.fragrance.length > 0
                ? t('card.scent.contains', { list: f.fragrance.map(ingName).slice(0, 3).join(lang === 'zh' ? '、' : ', ') })
                : t('card.scent.oils', { list: f.essentialOils.map(ingName).slice(0, 3).join(lang === 'zh' ? '、' : ', ') }))}
            </dd>
          </div>
          {r.dimensions.irritation.level && (
            <div>
              <dt>{t('results.gentle')}</dt>
              <dd>
                {t(`gentle.${r.dimensions.irritation.level}` as Key)}
                {' · '}
                {kinds.length > 0 ? t('card.contains', { list: tx(joinNames(kinds)) }) : t('card.noIrritants')}
              </dd>
            </div>
          )}
          {notices.map((n, i) => (
            // 只显示提示的第一句，成分解释在成分弹窗里
            <div key={i}><dt>{t('card.notice')}</dt><dd>{firstSentence(tx(n.text))}</dd></div>
          ))}
        </dl>
      </section>

      {/* 5. 怎么用：只有含去屑有效成分的产品才显示去屑说明 */}
      <section>
        <h4 className="sec-title">{t('card.usage')}</h4>
        <p>{t((p.subtype ? `usage.${p.subtype}` : `usage.${p.category}`) as Key)}</p>
        {p.category === 'shampoo' && !p.subtype && hasAntiDandruffActive(p, ingredientIndex) && <p>{t('usage.antiDandruff')}</p>}
      </section>

      {/* 评分明细：最后一层折叠，只列计分的维度 */}
      {r.score !== null && (
        <details className="sub">
          <summary>{t('card.scoreDetail')}</summary>
          {!r.noNeeds && <p className="note">{t('results.scoreLine', { n: r.score })}</p>}
          <ul className="dims">{scored.map((k) => <DimensionRow key={k} k={k} d={r.dimensions[k]} />)}</ul>
          {quote && (
            <p className="note">
              {t('basis.brandClaim')}：“{quote.split('\n').map((x) => x.trim()).filter(Boolean).join(' / ')}”
              {bc.sourceUrl && <> · <a href={bc.sourceUrl} target="_blank" rel="noreferrer">{t('results.source')}</a></>}
            </p>
          )}
        </details>
      )}

      {/* 6. 底部：同系列 · 数据说明 */}
      <p className="card-foot">
        {paired.length > 0 && (
          <>
            {t('results.paired')}：{paired.map((x) => {
              const name = productName(x, lang);
              return name.toLowerCase().startsWith(x.brand.toLowerCase()) ? name : `${x.brand} ${name}`;
            }).join('、')}
            {' · '}
          </>
        )}
        <Link to="/data">{t('card.dataNote')}</Link>
        {p.sourceUrls[0] && <> · <a href={p.sourceUrls[0]} target="_blank" rel="noreferrer">{t('results.dataSource')}</a></>}
        {p.imageUrl && p.imageAttribution && (
          <>
            {' · '}{t('results.imageCredit')}：{p.imageAttribution}，<a href={p.imageLicenseUrl} target="_blank" rel="noreferrer">{p.imageLicense}</a>
          </>
        )}
      </p>
    </div>
  );
}
