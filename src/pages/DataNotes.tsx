// 数据说明：卡片上不重复的方法说明统一放在这里（依据类型、无香判断、温和度、零售商评分口径、打分方式等）。

import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n, type Key } from '../i18n';
import { MIN_RATING_COUNT } from '../data/retail';
import { TEST_MODE_DRAFT_SCORING } from '../scoring/config';

const SECTIONS: { id: string; items: string[] }[] = [
  { id: 'fit', items: ['1', '2', '3', '4', '5', '6', '7', '8'] },
  { id: 'basis', items: ['tested', 'ingredients', 'brand_claim', 'classification', 'award'] },
  { id: 'ingredients', items: ['1', '2', '3', '4'] },
  { id: 'evidence', items: ['1', '2', '3', '4', '5', '6'] },
  { id: 'fragrance', items: ['1', '2', '3'] },
  { id: 'gentle', items: ['1', '2', '3'] },
  { id: 'ratings', items: ['1', '2', '3', '4'] },
  { id: 'products', items: ['1', '2', '3', '4', '5', '6'] },
];

export default function DataNotes() {
  const { t } = useI18n();
  const { hash } = useLocation();
  // 从卡片链接到某一节时滚动到该节
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
  return (
    <main className="shell about">
      <div className="label">{t('data.kicker')}</div>
      <h1 className="h1" style={{ marginTop: 8 }}>{t('data.title')}</h1>
      <p className="lead">{t('data.intro')}</p>
      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id}>
          <h2 className="h2">{t(`data.${s.id}.title` as Key)}</h2>
          <ul className="about-list">
            {s.items.map((i) => <li key={i}>{t(`data.${s.id}.${i}` as Key, { n: MIN_RATING_COUNT })}</li>)}
            {s.id === 'fit' && TEST_MODE_DRAFT_SCORING && <li>{t('about.d.testMode')}</li>}
          </ul>
        </section>
      ))}
      <p className="small" style={{ marginTop: 28 }}><Link to="/about">{t('footer.about')}</Link></p>
    </main>
  );
}
