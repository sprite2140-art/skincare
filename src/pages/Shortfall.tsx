// 推荐为空或太少时的说明（洗护、护肤结果页共用）：写明真实原因；预算内选择少时，可以看看高一档预算的产品（不自动放宽）。

import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { SHORTFALL_TEXT, shortfallCounts } from '../scoring/shortfall';
import type { ProductScore } from '../scoring/score';

/** 各原因的款数，例如"12 款超出你的预算" */
export function ShortfallReasons({ ranked }: { ranked: ProductScore[] }) {
  const { tx } = useI18n();
  const counts = shortfallCounts(ranked);
  if (counts.length === 0) return null;
  return (
    <ul className="list" style={{ marginTop: 6 }}>
      {counts.map(({ reason, n }) => <li key={reason}>{tx(SHORTFALL_TEXT[reason]).replace('{n}', String(n))}</li>)}
    </ul>
  );
}

/** 没有可推荐的产品：列出原因，不自动放宽条件 */
export function EmptyNotice({ ranked, quizPath, children }: { ranked: ProductScore[]; quizPath: string; children?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="notice" role="status">
      <strong>{t('shortfall.title')}</strong>
      <ShortfallReasons ranked={ranked} />
      <p>{t('shortfall.noLoosen')}</p>
      {children}
      <Link to={quizPath}>{t('results.editQuiz')}</Link>
    </div>
  );
}

/**
 * 预算内选择少（少于 3 款）：提示，并提供"看看稍高预算的选择"。
 * nextCap 为高一档预算的说明（如"$20 以内""不限"）；没有更高一档时不显示按钮
 */
export function FewOptions({ empty, nextCap, open, onToggle }: { empty: boolean; nextCap: string | null; open: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  if (nextCap === null) return null;
  return (
    <div className={empty ? '' : 'notice'} role={empty ? undefined : 'status'} style={empty ? { marginTop: 8 } : undefined}>
      {!empty && <strong>{t('few.title')}</strong>}
      <p>
        <button type="button" className="textbtn" aria-expanded={open} onClick={onToggle}>
          {open ? t('few.hide') : t('few.show', { cap: nextCap })}
        </button>
      </p>
    </div>
  );
}
