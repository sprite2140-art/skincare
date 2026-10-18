// 免责声明与隐私说明。文案在 i18n（about.*），条目数固定；改内容只改 zh.json / en.json。

import { Link } from 'react-router-dom';
import { useI18n, type Key } from '../i18n';
import { COSING_RETRIEVED_ON } from '../data/cosing';
import { TEST_MODE_DRAFT_SCORING } from '../scoring/config';

const DISCLAIMER = ['notMedical', 'doctor', 'rules', 'claims', 'fragrance', 'productInfo', 'links'] as const;
const PRIVACY = ['local', 'noAccount', 'noTracking', 'hosting', 'external', 'delete'] as const;

export default function About() {
  const { t } = useI18n();
  return (
    <main className="shell about">
      <div className="label">{t('about.kicker')}</div>
      <h1 className="h1" style={{ marginTop: 8 }}>{t('about.title')}</h1>

      <section>
        <h2 className="h2">{t('about.disclaimer')}</h2>
        <ul className="about-list">
          {DISCLAIMER.map((k) => <li key={k}>{t(`about.d.${k}` as Key)}</li>)}
          {TEST_MODE_DRAFT_SCORING && <li>{t('about.d.testMode')}</li>}
        </ul>
      </section>

      <section>
        <h2 className="h2">{t('about.privacy')}</h2>
        <ul className="about-list">
          {PRIVACY.map((k) => <li key={k}>{t(`about.p.${k}` as Key)}</li>)}
        </ul>
        <p className="small"><Link to="/profile">{t('about.p.manage')}</Link></p>
      </section>

      <section>
        <h2 className="h2">{t('about.sources')}</h2>
        <ul className="about-list">
          <li>{t('about.s.cosing', { d: COSING_RETRIEVED_ON })}</li>
          <li>{t('about.s.products')}</li>
          <li>{t('about.s.water')}</li>
          <li>{t('about.s.open')}</li>
        </ul>
      </section>
    </main>
  );
}
