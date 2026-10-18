// 推荐结果：洗发水 / 护发素 / 洗护搭配。每款展示产品图、完整名称、规格价格、两条推荐理由和购买链接；
// 打分明细、成分、证据和使用说明折叠展示。没有符合条件的商品时明确提示，不自动放宽条件。

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { budgetCaps, cities, exchangeRates, ingredientIndex, products } from '../data/load';
import { COSING_RETRIEVED_ON, COSING_SOURCE } from '../data/cosing';
import { translateCosingFunctions } from '../data/cosingFunctions';
import { MIN_RATING_COUNT, buyLinks, ratingCountText, visibleRatings } from '../data/retail';
import type { Category, Product, Region, Target } from '../data/types';
import { useI18n, type Key } from '../i18n';
import { useProfiles } from '../profile/ProfileContext';
import {
  EMPTY_HAIR, adviseCare, cityKey, moneyToUsd, scalpInfoNotes, scalpMedicalAlerts, toScoringProfile, type Answers, type ScalpAnswers,
} from '../profile/questionnaire';
import { newProfile } from '../profile/storage';
import { formatMoney } from '../scoring/budget';
import { TARGET_LABELS } from '../scoring/labels';
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
  const popRef = useRef<HTMLSpanElement>(null);
  // 弹窗靠右的成分：向左移动，不超出屏幕
  useLayoutEffect(() => {
    const el = popRef.current;
    if (!open || !el) return;
    el.style.left = '0px';
    const overflow = el.getBoundingClientRect().right - (document.documentElement.clientWidth - 12);
    if (overflow > 0) el.style.left = `${-overflow}px`;
  }, [open]);
  // 名称未核对的成分显示为暂无数据，不展示可能对错的成分库信息
  const ing = status === 'name_unverified' ? undefined : ingredientIndex.get(name);
  const display = ing && lang === 'zh' && ing.nameZh ? ing.nameZh : name;
  const explain = ing ? (lang === 'zh' ? ing.explainZh : ing.explainEn) : '';
  const fns = ing?.cosingFunctions?.length ? translateCosingFunctions(ing.cosingFunctions, lang) : [];
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
        <span ref={popRef} className="ing-pop" role="dialog" aria-label={display}>
          <strong>{ing ? `${ing.inciName}${ing.nameZh ? ` / ${ing.nameZh}` : ''}` : name}</strong>
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
          {ing && !ing.riskTags.includes('fragrance') && ing.cosingFunctions?.some((f) => f === 'perfuming' || f === 'fragrance') && (
            <span className="muted">{t('ing.perfumingNotFragrance')}</span>
          )}
          {ing?.euAllergen && <span>{t('ing.euAllergen')}</span>}
          <span className="muted">{t(`ing.${status}` as Key)}</span>
          <button type="button" className="textbtn" onClick={() => setOpen(false)}>{t('ing.close')}</button>
        </span>
      )}
    </span>
  );
}

function DimensionRow({ k, d }: { k: DimensionKey; d: Dimension }) {
  const { t, tx } = useI18n();
  // 刺激风险分数高表示风险低，换成更直观的说法；证据强度低档显示"证据弱"
  // 不计分的维度不显示空刻度条：不适用（如水质不硬）显示"不适用"，数据缺失显示"数据缺失"
  const levelKey = d.level === null
    ? `dimState.${d.state ?? 'missing'}`
    : k === 'irritation' || k === 'evidence' ? `${k}.${d.level}` : `level.${d.level}`;
  const bars = d.level ? LEVEL_BARS[d.level] : 0;
  return (
    <li className="dim">
      <div className="dim-row">
        <span className="dim-name">{t(`dim.${k}` as Key)}</span>
        {d.level !== null ? (
          <span className="meter" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => <i key={i} className={i <= bars ? 'on' : ''} />)}
          </span>
        ) : <span />}
        <span className={`dim-level ${d.level ?? 'none'}`}>{t(levelKey as Key)}</span>
      </div>
      <p className="dim-reason">{tx(d.reason)}</p>
    </li>
  );
}

/** 占位图：按品类用不同的简洁图标和柔和底色 */
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

/** 产品图：只展示写明来源、开放许可和署名的图片（如 Open Beauty Facts），否则用占位图 */
function ProductImage({ p }: { p: Product }) {
  const { t } = useI18n();
  // 图片加载失败时退回占位图
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
    <figure className={`pimg placeholder ${kind}`} aria-label={t('results.noImage')}>
      <PlaceholderIcon kind={kind} />
    </figure>
  );
}

/** 卡片上最多显示的标签数 */
const MAX_CARD_TAGS = 2;

function productName(p: Product, lang: string) {
  return lang === 'zh' ? p.nameZh || p.nameEn : p.nameEn || p.nameZh;
}

/**
 * 效果依据：按类别分条列出（成品测试、产品定位、品牌宣称、主打成分），每条下面一句话说明它的可靠程度，
 * 不再用一整段说明文字。
 */
function BasisBlock({ p }: { p: Product }) {
  const { t, tx, lang } = useI18n();
  const bc = p.brandClaims;
  const targets = (list: readonly Target[]) => list.map((c) => tx(TARGET_LABELS[c])).join('、');
  // 中文概括只有中文；英文界面和"原文摘录"都显示原文
  const showQuote = bc.status === 'brand_page_quote' || lang !== 'zh';
  const claimText = showQuote ? bc.quote || bc.text : bc.text;
  return (
    <div className="flags">
      <span className="label">{t('results.basisTitle')}</span>
      <dl className="basis">
        {p.testedClaims.length > 0 && (
          <div>
            <dt>{t('basis.tested')}</dt>
            <dd>
              {p.testedClaims.map((c, i) => (
                <span key={i}>
                  {i > 0 && '；'}
                  {tx(TARGET_LABELS[c.target])}：{c.description}（{c.year}）
                  {c.url && <> · <a href={c.url} target="_blank" rel="noreferrer">{t('results.source')}</a></>}
                </span>
              ))}
              <span className="basis-note">{t('basis.testedNote')}</span>
            </dd>
          </div>
        )}
        {p.claimedBenefits.length > 0 && (
          <div>
            <dt>{t(`claimSource.${p.claimSource ?? 'data_classification'}` as Key)}</dt>
            <dd>
              {targets(p.claimedBenefits)}
              <span className="basis-note">{t(`basis.${p.claimSource ?? 'data_classification'}Note` as Key)}</span>
            </dd>
          </div>
        )}
        {claimText && (
          <div>
            <dt>{t('basis.brandClaim')}</dt>
            <dd>
              {showQuote
                ? <span className="quote">“{claimText.split('\n').map((x) => x.trim()).filter(Boolean).join(' / ')}”</span>
                : claimText}
              {bc.sourceUrl && <> · <a href={bc.sourceUrl} target="_blank" rel="noreferrer">{t('results.source')}</a></>}
              {bc.targets.length > 0 && <span className="basis-sub">{t('results.brandClaimTargets')}：{targets(bc.targets)}</span>}
              <span className="basis-note">{t(showQuote ? 'basis.brandQuoteNote' : 'basis.brandSummaryNote')}</span>
            </dd>
          </div>
        )}
        {bc.status === 'version_mismatch' && (
          <div>
            <dt>{t('basis.brandClaim')}</dt>
            <dd className="muted">{t('results.brandClaimsMismatch')}</dd>
          </div>
        )}
        <div>
          <dt>{t('basis.keyActives')}</dt>
          <dd>
            {p.keyActives.length > 0
              ? p.keyActives.join('；')
              : t(p.keyActivesDisclosed ? 'basis.keyActivesMissing' : 'results.keyActivesNone')}
            <span className="basis-note">{t('basis.ingredientNote')}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
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
  const { primary, others } = buyLinks(p);
  const ratings = visibleRatings(p);
  // 标签统一样式、最多两个：co-wash > 无香 > 第一个奖项
  const tags = [
    p.subtype ? t(`subtype.${p.subtype}` as Key) : null,
    f.status === 'labeled_free' ? t('scentTag.labeled_free') : null,
    f.status === 'none_found' && f.unknownCount === 0 ? t('scentTag.none_found') : null,
    p.awards[0] ? `${p.awards[0].source} ${p.awards[0].year}` : null,
  ].filter((x): x is string => !!x).slice(0, MAX_CARD_TAGS);
  return (
    <article className={r.excluded ? 'product excluded' : 'product'}>
      <div className="product-top">
        <ProductImage key={p.productId} p={p} />
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
          </div>
          {tags.length > 0 && (
            <div className="tags">{tags.map((x, i) => <span key={i} className="tag">{x}</span>)}</div>
          )}
        </div>
        {r.score !== null && !compact && (r.noNeeds ? (
          // 没有选需求：不显示总分和适合等级，只显示温和度
          r.dimensions.irritation.level && (
            <div className={`fitbadge gentle ${r.dimensions.irritation.level}`}>
              <span className="fit-label">{t('results.gentle')}</span>
              <strong>{t(`gentle.${r.dimensions.irritation.level}` as Key)}</strong>
            </div>
          )
        ) : r.fitLevel && (
          <div className={`fitbadge ${r.fitLevel}`}>
            <strong>{t(`fit.${r.fitLevel}` as Key)}</strong>
          </div>
        ))}
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
          {primary ? (
            <a className="btn btn-primary btn-block" href={primary} target="_blank" rel="noreferrer nofollow">{t('results.buy')}</a>
          ) : (
            <span className="small muted">{t('results.noBuy')}</span>
          )}
          {others.length > 0 && (
            <p className="small muted buy-others">
              {t('results.otherStores')}：
              {others.map((l, i) => (
                <span key={l.platform + i}>
                  {i > 0 && ' · '}
                  <a href={l.url} target="_blank" rel="noreferrer nofollow">{t(`platform.${l.platform}` as Key)}</a>
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      <details className="more">
        <summary>{t('results.details')}</summary>
        {r.score !== null && !r.noNeeds && (
          <p className="small detail-score">{t('results.scoreLine', { n: r.score })}{r.evidenceCapped ? ` · ${t('results.capped')}` : ''}</p>
        )}
        {r.score !== null && <ul className="dims">{DIMENSIONS.map((k) => <DimensionRow key={k} k={k} d={r.dimensions[k]} />)}</ul>}
        {reasons.length > 0 && <p className="small muted">{t('results.reasonBasis')}</p>}
        <BasisBlock p={p} />
        {p.pairedProductIds.length > 0 && (
          <p className="small muted" style={{ marginTop: 12 }}>
            {t('results.paired')}：
            {p.pairedProductIds.map((id) => products.find((x) => x.productId === id)).filter(Boolean)
              .map((x) => {
                const name = productName(x!, lang);
                return name.toLowerCase().startsWith(x!.brand.toLowerCase()) ? name : `${x!.brand} ${name}`;
              }).join('；')}
          </p>
        )}
        {ratings.length > 0 && (
          <div className="flags">
            <span className="label">{t('results.ratings')}</span>
            <ul className="ratings">
              {ratings.map((x) => (
                <li key={x.platform}>
                  <a href={x.url} target="_blank" rel="noreferrer nofollow">{t(`platform.${x.platform}` as Key)}</a>
                  {' '}★ {x.rating} · {t('results.ratingCount', { n: ratingCountText(x) })}
                  <span className="muted"> · {t('results.checkedOn', { d: x.checkedOn })}</span>
                </li>
              ))}
            </ul>
            <p className="small muted">{t('results.ratingsNote', { n: MIN_RATING_COUNT })}</p>
          </div>
        )}
        <div className="flags">
          <span className="label">{t('results.fragrance')}</span>
          <p className="small" style={{ marginTop: 6 }}>{t(`fragrance.${f.status}` as Key)}</p>
          {f.allergens.length > 0 && <p className="small">{t('fragrance.allergens')}：{f.allergens.join('、')}</p>}
          {f.listed.length > 0 && <p className="small">{t('fragrance.cosing')}：{f.listed.join('、')}</p>}
          {(() => {
            const other = f.fragrance.filter((x) => !f.allergens.includes(x) && !f.listed.includes(x));
            return other.length > 0 && <p className="small">{t('fragrance.other')}：{other.join('、')}</p>;
          })()}
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
          <p className="small" style={{ marginTop: 6 }}>{t((p.subtype ? `usage.${p.subtype}` : `usage.${p.category}`) as Key)}</p>
          <p className="small muted">{t('usage.followLabel')}</p>
        </div>
        {p.imageUrl && p.imageAttribution && (
          <p className="small muted" style={{ marginTop: 12 }}>
            {t('results.imageCredit')}：{p.imageAttribution} · <a href={p.imageSource} target="_blank" rel="noreferrer">{t('results.imageSource')}</a>
            {' · '}<a href={p.imageLicenseUrl} target="_blank" rel="noreferrer">{p.imageLicense}</a>
          </p>
        )}
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

  // 单品列表（洗发水 / 护发素标签）按单买打分；洗护搭配标签按搭配打分（发丝效果只分给护发素），
  // 两者分开计算，切换标签时与显示的视图一致
  const score = (routineMode: boolean) => {
    const out = {} as Record<ListCategory, { ranked: ProductScore[]; total: number; hidden: number; profile: ScoringProfile }>;
    for (const cat of LIST_CATEGORIES) {
      const all = products.filter((x) => x.category === cat);
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
