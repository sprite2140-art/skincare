// 城市水硬度：默认只显示"等级 · 数值 · 来源"和刻度条（USGS 分级、你的城市、参照城市）；
// 各条记录的口径、时期、范围说明和参照城市的出处收进"数据说明"折叠。
// 数据表里的内部取值（统计口径代码、not_stated_in_FAQ 之类）不直接显示。

import { referenceWater } from '../data/load';
import type { City, ReferenceWater, WaterRecord } from '../data/types';
import { USGS_BANDS, displayScope, formatPeriod, summarizeCityWater } from '../data/water';
import { useI18n, type Key } from '../i18n';

/** 刻度条右端（mg/L）；更高的数值画在最右端 */
const SCALE_MAX = 360;
const STATISTIC_KEYS = [
  'annual_mean', 'reported_annual_mean', 'single_sample', 'single_sample_calculated', 'single_sample_with_historical_range', 'single_snapshot',
  'monthly_mean', 'reported_typical_range', 'reported_annual_range', 'reported_average', 'supplier_reported_annual_mean',
  'official_approximate_citywide_average', 'not_available', 'quarterly_mean_and_range', 'annual_mean_and_max',
  'period_mean_and_range', 'annual_mean_and_range', 'not_found',
];
const round1 = (n: number) => Math.round(n * 10) / 10;
const pos = (v: number) => `${(Math.min(v, SCALE_MAX) / SCALE_MAX) * 100}%`;

function useStat() {
  const { t } = useI18n();
  // 未登记的口径不显示内部代码
  return (code: string) => (STATISTIC_KEYS.includes(code) ? t(`water.stat.${code}` as Key) : t('water.stat.other'));
}

function SourceLinks({ urls }: { urls: string[] }) {
  const { t } = useI18n();
  if (urls.length === 0) return null;
  return (
    <>
      {urls.map((u, i) => (
        <span key={u}>
          {i > 0 && ' · '}
          <a href={u} target="_blank" rel="noreferrer">{urls.length > 1 ? t('quiz.water.sourceN', { n: i + 1 }) : t('quiz.water.source')}</a>
        </span>
      ))}
    </>
  );
}

/** 一条水硬度记录：适用范围、口径、数值 / 范围、时期、来源 */
function WaterRecordRow({ r }: { r: WaterRecord }) {
  const { t, lang } = useI18n();
  const stat = useStat();
  const range = r.min !== null && r.max !== null ? `${round1(r.min)}–${round1(r.max)}` : '';
  const value = r.value !== null
    ? range ? t('water.valueRange', { v: round1(r.value), range }) : t('water.value', { v: round1(r.value) })
    : range ? t('water.rangeOnly', { range }) : t('water.noValue');
  const period = formatPeriod(r.period, lang);
  const scope = displayScope(r);
  return (
    <li>
      {scope && <div className="small"><strong style={{ fontWeight: 500 }}>{scope}</strong></div>}
      <div className="small">
        {stat(r.statisticType)} · {value}
        {r.hardnessClass !== 'unknown' && ` · ${t(`water.class.${r.hardnessClass}` as Key)}`}
      </div>
      <div className="small muted">
        {period && <>{t('quiz.water.period', { p: period })} · </>}
        <SourceLinks urls={r.sources} />
        {r.retrievedOn && ` · ${t('quiz.water.retrieved', { d: r.retrievedOn })}`}
      </div>
      {/* 资料备注只有中文，英文界面不显示 */}
      {r.note && lang === 'zh' && <div className="small muted">{r.note}</div>}
    </li>
  );
}

function refName(r: ReferenceWater, lang: string) {
  return lang === 'zh' && r.cityZh ? r.cityZh : r.city;
}

/** 参照城市的一条说明：数值、范围、时期、适用范围、来源 */
function ReferenceRow({ r }: { r: ReferenceWater }) {
  const { t, lang } = useI18n();
  const stat = useStat();
  const period = formatPeriod(r.period, lang);
  let value = t('water.noValue');
  if (r.value !== null) {
    const v = round1(r.value);
    if (r.minText && r.maxText) value = t('water.valueRange', { v, range: `${r.minText}–${r.maxText}` });
    else if (r.maxText) value = t('water.valueMax', { v, max: r.maxText });
    else value = t('water.value', { v });
  }
  return (
    <li>
      <div className="small"><strong style={{ fontWeight: 500 }}>{refName(r, lang)}</strong> · {stat(r.statisticType)} · {value}</div>
      {/* 适用范围和备注只有中文，英文界面不显示 */}
      {lang === 'zh' && r.scope && <div className="small muted">{r.scope}</div>}
      <div className="small muted">
        {period && <>{t('quiz.water.period', { p: period })} · </>}
        <SourceLinks urls={r.sources} />
      </div>
    </li>
  );
}

/** 刻度条：USGS 四档分级，你的城市（一个值为圆点，多个分区为一段），参照城市为小刻度 */
function WaterScale({ low, high, refs }: { low: number | null; high: number | null; refs: ReferenceWater[] }) {
  const { t, lang } = useI18n();
  return (
    <div className="wscale" aria-hidden="true">
      <div className="wscale-labels small">
        {USGS_BANDS.map((b) => {
          const lo = b.min === 0 ? 0 : b.min - 1;
          const hi = Math.min(b.max, SCALE_MAX);
          return <span key={b.key} style={{ left: pos((lo + hi) / 2) }}>{t(`water.band.${b.key}` as Key)}</span>;
        })}
      </div>
      <div className="wscale-bar">
        {USGS_BANDS.map((b) => (
          <span
            key={b.key}
            className={`wscale-band ${b.key}`}
            style={{ left: pos(b.min === 0 ? 0 : b.min - 1), width: `calc(${pos(Math.min(b.max, SCALE_MAX))} - ${pos(b.min === 0 ? 0 : b.min - 1)})` }}
          />
        ))}
        {refs.map((r) => <i key={r.city} className="wscale-ref" style={{ left: pos(r.value!) }} title={refName(r, lang)} />)}
        {low !== null && high !== null && (
          low === high
            ? <i className="wscale-you dot" style={{ left: pos(low) }} />
            : <i className="wscale-you span" style={{ left: pos(low), width: `calc(${pos(high)} - ${pos(low)})` }} />
        )}
      </div>
      <div className="wscale-ticks small muted">
        {[0, 60, 120, 180].map((v) => <span key={v} style={{ left: pos(v) }}>{v}</span>)}
        <span style={{ left: '100%' }}>{SCALE_MAX}+</span>
      </div>
    </div>
  );
}

/** 城市的水硬度 */
export default function WaterInfo({ city }: { city: City }) {
  const { t, lang } = useI18n();
  const known = city.waterHardness !== 'unknown';
  const sum = summarizeCityWater(city);
  const refs = referenceWater.filter((r) => r.value !== null).sort((a, b) => a.value! - b.value!);
  const missingRefs = referenceWater.filter((r) => r.value === null);
  const value = sum
    ? sum.low === sum.high
      ? t('water.valueShort', { v: round1(sum.low) })
      : t('water.valueSpan', { lo: round1(sum.low), hi: round1(sum.high) })
    : null;
  return (
    <div className="infobox" aria-live="polite">
      <div className="label">{t('quiz.water.title', { city: city.city })}</div>
      <p className="water-line">
        <strong>{known ? t(`water.${city.waterHardness}` as Key) : t('quiz.water.none')}</strong>
        {value && <> · {value}</>}
        {sum && sum.sources.length > 0 && (
          <> · {sum.sources.length <= 3
            ? <SourceLinks urls={sum.sources} />
            : <span className="muted">{t('quiz.water.sourcesBelow', { n: sum.sources.length })}</span>}
          </>
        )}
      </p>
      <WaterScale low={sum?.low ?? null} high={sum?.high ?? null} refs={refs} />
      <p className="small muted wscale-legend">
        {sum && <><span className="key-you" aria-hidden="true" />{t('quiz.water.you', { city: city.city })}　</>}
        <span className="key-ref" aria-hidden="true" />
        {t('quiz.water.refs')}：{refs.map((r) => `${refName(r, lang)} ${Math.round(r.value!)}`).join(' · ')}
      </p>
      <details className="more small">
        <summary>{t('quiz.water.detail')}</summary>
        {city.waterHardness === 'varies' && <p style={{ marginTop: 8 }}>{t('quiz.water.variesNote')}</p>}
        {city.water.length > 0 && (
          <>
            <div className="label" style={{ marginTop: 10 }}>{t('quiz.water.records', { city: city.city, n: city.water.length })}</div>
            <ul className="water-records">{city.water.map((r) => <WaterRecordRow key={r.regionId} r={r} />)}</ul>
          </>
        )}
        <div className="label" style={{ marginTop: 10 }}>{t('quiz.water.refsTitle')}</div>
        <ul className="water-records">
          {refs.map((r) => <ReferenceRow key={r.city} r={r} />)}
          {missingRefs.map((r) => (
            <li key={r.city} className="small muted">
              {refName(r, lang)} · {t('water.stat.not_found')} · <SourceLinks urls={r.sources} />
            </li>
          ))}
        </ul>
        <p className="muted" style={{ marginTop: 8 }}>{t('quiz.water.usgs')}</p>
        <p className="muted" style={{ marginTop: 6 }}>
          {t('quiz.water.caveat')}
          {city.reviewStatus !== 'verified' && ` ${t('quiz.water.unverified')}`}
        </p>
        <p className="muted" style={{ marginTop: 6 }}>{t('quiz.water.why')}</p>
      </details>
    </div>
  );
}
