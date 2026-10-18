import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { useI18n, type Key } from './i18n';
import { ingredients, products } from './data/load';
import { useProfiles } from './profile/ProfileContext';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import ProfilePage from './pages/ProfilePage';
import About from './pages/About';

function Home() {
  const { t } = useI18n();
  const { profile } = useProfiles();
  const verified = ingredients.filter((i) => i.reviewStatus === 'verified').length;
  return (
    <main className="shell">
      <section className="hero">
        <div className="label">{t('home.kicker')}</div>
        <h1 className="display" style={{ marginTop: 12 }}>{t('home.title')}</h1>
        <p>{t('app.tagline')}</p>
        <div className="stack" style={{ marginTop: 28 }}>
          <Link className="btn btn-primary btn-block" to="/quiz">{t('home.start')}</Link>
          {profile?.scalp && <Link className="btn btn-block" to="/results">{t('home.seeResults')}</Link>}
        </div>
      </section>

      <ol className="steps">
        {(['1', '2', '3'] as const).map((n) => (
          <li key={n}>
            <span className="num">0{n}</span>
            <span>
              <strong style={{ fontWeight: 500 }}>{t(`home.step${n}.title` as Key)}</strong>
              <br />
              <span className="small muted">{t(`home.step${n}.body` as Key)}</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="small muted" style={{ marginTop: 24 }}>
        {t('home.privacy')} <Link to="/about">{t('nav.about')}</Link>
      </p>
      <p className="small muted" style={{ marginTop: 6 }}>
        {t('home.dataSummary', { products: products.length, ingredients: ingredients.length, verified })}
      </p>
    </main>
  );
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const { saveFailed } = useProfiles();
  return (
    <BrowserRouter>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="wordmark">{t('app.title')}</Link>
          <nav className="topnav">
            <NavLink to="/results">{t('nav.results')}</NavLink>
            <NavLink to="/profile">{t('nav.profile')}</NavLink>
          </nav>
          <button type="button" className="textbtn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
            {t('lang.switch')}
          </button>
        </div>
      </header>
      {saveFailed && <p className="warn">{t('profile.saveFailed')}</p>}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/results" element={<Results />} />
        {/* 旧链接兼容 */}
        <Route path="/results/shampoo" element={<Results />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/about" element={<About />} />
      </Routes>
      <footer className="footer">
        <Link to="/about">{t('footer.about')}</Link>
      </footer>
    </BrowserRouter>
  );
}
