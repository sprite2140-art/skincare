// 产品卡片（洗发水、护发素及以后的品类通用）。
// 原则：卡片展示"用户需要知道什么"，不展示"系统是怎么判断的"；判断方法统一放在数据说明页（/data）。
//
// 详情以"用户的需求"为主线，每条信息只出现一次。
// 收起：产品图、品牌、名称、价格与规格、评分（评价数最多的平台）、适合等级（没选需求时为温和度）、
//       最多 2 个标签（奖项只在这里出现）、最多 2 条理由（与详情①的写法一致）、"在 [平台] 购买" + "详情"。
// 展开：① 结论 + 需求统计 → ② 需求对照 → ③ 需要注意 → ④ 在哪买 → ⑤ 成分 → ⑥ 怎么用 → ⑦ 评分明细（折叠）
//       → 同系列 · 数据说明。

import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ingredientIndex, products } from '../data/load';
import { COSING_RETRIEVED_ON, COSING_SOURCE } from '../data/cosing';
import { translateCosingFunctions } from '../data/cosingFunctions';
import { ratingCountText } from '../data/retail';
import type { Ingredient, Product, Region } from '../data/types';
import { useI18n, type Key } from '../i18n';
import { formatMoney } from '../scoring/budget';
import {
  cautionItems, hasAntiDandruffActive, keyIngredients, needRows, needSummary, primaryStore, scoreBreakdown, storeRows, topRating, type StoreRow,
} from '../scoring/cardData';
import { spaceCjk } from '../scoring/labels';
import { inMarket } from '../scoring/market';
import { recommendReasons } from '../scoring/reasons';
import { ingredientStatuses, type IngredientStatus, type ProductScore, type ScoringProfile } from '../scoring/score';
import type { FaceProductScore } from '../scoring/faceScore';
/** 卡片上最多显示的标签数 */
const MAX_CARD_TAGS = 2;

export function productName(p: Product, lang: string) {
  return lang === 'zh' ? spaceCjk(p.nameZh || p.nameEn) : p.nameEn || p.nameZh;
}

/** 同系列产品名：卡片上已显示品牌，名称开头的品牌名去掉，避免重复 */
function seriesName(x: Product, lang: string) {
  const name = productName(x, lang);
  const norm = (v: string) => v.toLowerCase().replace(/[’']/g, "'");
  // 品牌全称；或全大写的品牌首词（如 MONDAY HAIRCARE 的产品名以 MONDAY 开头）
  const first = x.brand.split(/\s+/)[0];
  const brands = [x.brand, ...(first.length >= 4 && first === first.toUpperCase() ? [first] : [])];
  const hit = brands.find((b) => norm(name).startsWith(norm(b)) && name.length > b.length);
  return hit ? name.slice(hit.length).trim() : name;
}

/**
 * 成分名：中文界面显示中文名；没有中文名的显示 INCI 名，并用统一的"无中文名"样式（斜体）标出。
 * 英文界面都显示 INCI 名。
 */
function IngNames({ list }: { list: Ingredient[] }) {
  const { lang } = useI18n();
  return (
    <>
      {list.map((ing, i) => (
        <span key={ing.inciName}>
          {i > 0 && (lang === 'zh' ? '、' : ', ')}
          {lang === 'zh' && !ing.nameZh ? <span className="no-zh">{ing.inciName}</span> : lang === 'zh' ? spaceCjk(ing.nameZh) : ing.inciName}
        </span>
      ))}
    </>
  );
}

/** 成分标签：中文界面显示中文名，英文 INCI 名在点开后的解释里；英文界面反之。没有中文名的成分用"无中文名"样式 */
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
      <button type="button" className={lang === 'zh' && !ing?.nameZh ? 'ing-chip no-zh' : 'ing-chip'} aria-expanded={open} onClick={() => setOpen(!open)}>{display}</button>
      {open && (
        <span ref={popRef} className="ing-pop" role="dialog" aria-label={display}>
          <strong>{display}</strong>
          {other && other !== display && <span className="muted">{other}</span>}
          {explain && (
            <span>
              {explain}
              {ing!.reviewStatus !== 'verified' && !ing!.explainReviewed && <span className="muted">（{t('ing.explainDraft')}）</span>}
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

/** "需要注意"里列出的提示（洗护 + 护肤） */
const CAUTION_NOTICE_CODES = [
  'pregnancy_notice', 'rx_notice', 'budget_unchecked',
  'sunscreen_incomplete', 'water_resistance', 'active_start_slow', 'pregnancy_caution_use', 'below_range', 'above_range',
];

function firstSentence(s: string) {
  const m = s.match(/^.*?[。.](?=\s|$|[^0-9])/);
  return (m ? m[0] : s).replace(/（成分数据未核对）|\(ingredient data not yet verified\)/, '').trim();
}

function storeName(row: Pick<StoreRow, 'platform' | 'host'>, t: (k: Key) => string) {
  return row.platform === 'other' ? row.host : t(`platform.${row.platform}` as Key);
}

export default function ProductCard({ r, market, profile, scentGoal, compact, defaultOpen = false }: {
  r: ProductScore; market: Region; profile: ScoringProfile; scentGoal: boolean; compact?: boolean;
  /** 设计自查页（/qa）用：初始就展开详情 */
  defaultOpen?: boolean;
}) {
  const { t, tx, lang } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
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
            <span>
              {p.price !== null ? formatMoney(p.price, p.currency, false) : t('results.noPrice')}
              {p.sizeMl !== null ? ` · ${t('results.size', { n: p.sizeMl })}` : ''}
              {!inMarket(p, market) && ` · ${t('results.region')} ${p.region}`}
            </span>
            {p.price !== null && <span className="price-note">{t('card.priceNote')}</span>}
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
      {reasons.length > 0 && <ul className="list reasons">{reasons.map((x, i) => <li key={i}>{tx(x)}</li>)}</ul>}
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

      {open && <CardDetails r={r} profile={profile} rows={rows} foldsOpen={defaultOpen} />}
    </article>
  );
}

function CardDetails({ r, profile, rows, foldsOpen }: { r: ProductScore; profile: ScoringProfile; rows: StoreRow[]; foldsOpen: boolean }) {
  const { t, tx, lang } = useI18n();
  const p = r.product;
  const f = r.fragrance;
  const needs = needRows(r);
  const sum = needSummary(needs);
  const cautions = cautionItems(r, profile);
  const keys = keyIngredients(p, ingredientIndex, profile.concerns);
  const all = ingredientStatuses(p, ingredientIndex);
  const checked = [...new Set(p.ratings.map((x) => x.checkedOn).filter(Boolean))].sort().at(-1);
  const notices = r.notices.filter((n) => CAUTION_NOTICE_CODES.includes(n.code));
  // 含 A 醇类、过氧化苯甲酰、果酸、水杨酸类：温和度取决于耐受，不显示等级
  const tolerance = 'faceExtras' in r && (r as FaceProductScore).faceExtras.toleranceDependent;
  const missing = r.notices.find((n) => n.code === 'missing_data');
  const bc = p.brandClaims;
  const quote = bc.status === 'brand_page_quote' || bc.status === 'retail_mismatch' || lang !== 'zh' ? bc.quote || bc.text : bc.text;
  const showQuote = !!quote && needs.some((x) => x.basis === 'brand_claim');
  const paired = p.pairedProductIds.map((id) => products.find((x) => x.productId === id)).filter((x): x is Product => !!x);
  const bd = scoreBreakdown(r);
  const grouped = needs.some((x) => x.group !== null);
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <div className="card-details">
      {/* ① 需求统计（结论与收起状态的理由相同，展开后不再重复） */}
      {sum.total > 0 && (
        <section>
          <p>
            {profile.needScope
              ? t('card.needCountScoped', {
                step: t(`category.${profile.needScope.category}` as Key),
                needs: needs.map((x) => tx(x.label)).join(lang === 'zh' ? '、' : ', '),
                selected: profile.needScope.selected,
                met: sum.met, partial: sum.partial, none: sum.none,
              })
              : t('card.needCount', { n: sum.total, met: sum.met, partial: sum.partial, none: sum.none })}
            {sum.conditioner > 0 && t('card.needCountConditioner', { n: sum.conditioner })}
          </p>
        </section>
      )}

      {/* ② 需求对照：每个已选需求一行；洗发水分"头皮与清洁""发丝效果（主要看护发素）"两组 */}
      {needs.length > 0 && (
        <section>
          <h4 className="sec-title">{t('card.needTable')}</h4>
          <table className="tbl need-tbl">
            <thead>
              <tr><th>{t('card.need.col.need')}</th><th>{t('card.need.col.result')}</th><th>{t('card.need.col.basis')}</th></tr>
            </thead>
            {(grouped ? (['scalp', 'hair'] as const) : [null]).map((g) => {
              const list = needs.filter((x) => x.group === g);
              if (list.length === 0) return null;
              return (
                <tbody key={g ?? 'all'}>
                  {g && <tr className="tbl-group"><th colSpan={3}>{t(`card.needGroup.${g}` as Key)}</th></tr>}
                  {list.map((x) => (
                    <tr key={x.id}>
                      <td className="tbl-name">{tx(x.label)}</td>
                      <td>
                        {x.conditionerNote
                          ? <span className="status status-note">{t('card.result.conditioner')}</span>
                          : <span className={`status status-${x.result}`}>{t(`card.result.${x.result}` as Key)}</span>}
                      </td>
                      <td className="tbl-basis">
                        {x.evidence ? tx(x.evidence) : '—'}
                        {x.basis && <span className="basis-tag">{t(`basisTag.${x.basis}` as Key)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
          {showQuote && (
            <p className="note">
              {t('basis.brandClaim')}：“{quote.split('\n').map((x) => x.trim()).filter(Boolean).join(' / ')}”
              {bc.sourceUrl && <> · <a href={bc.sourceUrl} target="_blank" rel="noreferrer">{t('results.source')}</a></>}
            </p>
          )}
        </section>
      )}

      {/* ③ 需要注意：风险成分只在这里列一次，说明与温和度的扣分一致 */}
      <section>
        <h4 className="sec-title">{t('card.cautions')}</h4>
        <ul className="list">
          {r.dimensions.irritation.level && (
            <li>
              {tolerance
                ? t('card.gentleTolerance')
                : <>{t('results.gentle')}：{t(`gentle.${r.dimensions.irritation.level}` as Key)}</>}
              {cautions.length === 0 && !tolerance && <>{' · '}{f.unknownCount > 0 ? t('card.noIrritantsUnknown', { n: f.unknownCount }) : t('card.noIrritants')}</>}
            </li>
          )}
          {f.status !== 'contains' && (
            <li>{f.status === 'labeled_free' ? t('card.scent.labeled_free') : f.unknownCount > 0 ? t('card.scent.none_found_unknown', { n: f.unknownCount }) : t('card.scent.none_found')}</li>
          )}
          {cautions.map((c, i) => (
            <li key={i}>
              {tx(c.label)} · <IngNames list={c.ingredients} />
              <div className="note">{tx(c.note)}</div>
            </li>
          ))}
          {notices.map((n, i) => <li key={`n${i}`}>{firstSentence(tx(n.text))}</li>)}
        </ul>
        {missing && <p className="note">{tx(missing.text)}</p>}
      </section>

      {/* ④ 在哪买：评分和评价数只在这里出现；没有评分的平台只显示平台名 */}
      {rows.length > 0 && (
        <section>
          <h4 className="sec-title">{t('card.where')}</h4>
          <ul className="stores">
            {rows.map((row) => (
              <li key={row.platform + row.url}>
                <a className="store-row" href={row.url} target="_blank" rel="noreferrer nofollow">
                  <span className="store-name">{storeName(row, t)}</span>
                  <span className="store-rating">
                    {row.rating && <>★ {row.rating.rating.toFixed(1)} · {t('results.ratingCount', { n: ratingCountText(row.rating) })}</>}
                  </span>
                  <ExternalIcon />
                </a>
              </li>
            ))}
          </ul>
          {p.brandClaims.status === 'version_mismatch' && p.purchaseLinks.some((l) => l.platform === 'brand') && (
            <p className="note">{t('card.brandMismatch')}</p>
          )}
          {p.brandClaims.status === 'retail_mismatch' && rows.some((x) => x.platform !== 'brand') && (
            <p className="note">{t('card.retailMismatch')}</p>
          )}
          {checked && rows.some((x) => x.rating) && (
            <p className="note">
              <Link to="/data#ratings">{t('card.ratingFoot', { d: checked })}</Link>
            </p>
          )}
        </section>
      )}

      {/* ⑤ 成分：关键成分 → 全部成分（折叠）→ 包装原文 */}
      <section>
        <h4 className="sec-title">{t('card.ingredients')}</h4>
        {keys.length > 0 ? (
          <ul className="list">
            {keys.map((k) => <li key={k.ingredient.inciName}><span className="muted">{tx(k.role)}</span> · <IngNames list={[k.ingredient]} /></li>)}
          </ul>
        ) : <p className="note">{t('card.noKeyIngs')}</p>}
        <details className="sub">
          <summary>{t('card.allIngs', { n: all.length })}</summary>
          {lang === 'zh' && <p className="note">{t('card.noZhLegend')}</p>}
          <div className="ings">
            {all.map((x, i) => <IngredientChip key={`${x.name}-${i}`} name={x.name} status={x.status} />)}
          </div>
          {p.inciListOriginal && <p className="note">{t('results.original')}：{p.inciListOriginal}</p>}
        </details>
      </section>

      {/* ⑥ 怎么用：只有含去屑有效成分的洗发水才显示去屑说明 */}
      <section>
        <h4 className="sec-title">{t('card.usage')}</h4>
        <p>{t((p.subtype ? `usage.${p.subtype}` : `usage.${p.category}`) as Key)}</p>
        {p.category === 'shampoo' && !p.subtype && hasAntiDandruffActive(p, ingredientIndex) && <p>{t('usage.antiDandruff')}</p>}
        {/* 面部产品：品牌原文的用法（不从成分推测） */}
        {(p.face?.useFrequency || p.face?.faceStepNote) && (
          <p className="note">{t('usage.brandNote')}：{[p.face.useFrequency, p.face.faceStepNote].filter(Boolean).join(' · ')}</p>
        )}
      </section>

      {/* ⑦ 评分明细（折叠）：每行结构相同；不计分的维度数字列为"—"，原因写在表格下方 */}
      {r.score !== null && (
        <details className="sub" open={foldsOpen}>
          <summary>{t('card.scoreDetail')}</summary>
          <table className="tbl bd">
            <thead>
              <tr><th>{t('card.bd.dim')}</th><th className="num">{t('card.bd.score')}</th><th className="num">{t('card.bd.weight')}</th><th className="num">{t('card.bd.contrib')}</th></tr>
            </thead>
            <tbody>
              {bd.rows.map((x) => (
                <tr key={x.key} className={x.score === null ? 'off' : undefined}>
                  <td className="tbl-name">{t(`dim.${x.key}` as Key)}</td>
                  <td className="num">{x.score !== null ? Math.round(x.score) : '—'}</td>
                  <td className="num">{x.weight !== null ? pct(x.weight) : '—'}</td>
                  <td className="num">{x.contribution !== null ? x.contribution.toFixed(1) : '—'}</td>
                </tr>
              ))}
              {!r.noNeeds && (
                <tr className="tbl-total"><td className="tbl-name">{t('card.bd.total')}</td><td className="num" /><td className="num" /><td className="num">{bd.total}</td></tr>
              )}
            </tbody>
          </table>
          <ul className="list bd-notes">
            {bd.rows.filter((x) => x.key !== 'need' || x.score === null).filter((x) => x.key !== 'irritation' || x.score === null).map((x) => (
              <li key={x.key}>{t(`dim.${x.key}` as Key)}{lang === 'zh' ? '：' : ': '}{tx(x.dimension.reason)}</li>
            ))}
          </ul>
          {r.fitCapped && <p className="note">{t('card.bd.fitCapped')}</p>}
          <p className="note">{r.noNeeds ? t('card.bd.noNeeds') : t('card.bd.fitMap')}</p>
        </details>
      )}

      {/* 底部：同系列 · 数据说明 */}
      <p className="card-foot">
        {paired.length > 0 && (
          <>
            {t('results.paired')}{lang === 'zh' ? '：' : ': '}{paired.map((x) => seriesName(x, lang)).join(lang === 'zh' ? '、' : ', ')}
            {' · '}
          </>
        )}
        <Link to="/data">{t('card.dataNote')}</Link>
        {p.sourceUrls[0] && <> · <a href={p.sourceUrls[0]} target="_blank" rel="noreferrer">{t('results.dataSource')}</a></>}
        {p.imageUrl && p.imageAttribution && (
          <>
            {' · '}{t('results.imageCredit')}：{p.imageAttribution}，<a href={p.imageSource} target="_blank" rel="noreferrer">{t('results.imageSource')}</a>，<a href={p.imageLicenseUrl} target="_blank" rel="noreferrer">{p.imageLicense}</a>
          </>
        )}
      </p>
    </div>
  );
}
