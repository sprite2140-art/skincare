import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { useI18n } from './i18n';
import { ingredients, products } from './data/load';
import { useProfiles } from './profile/ProfileContext';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import ProfilePage from './pages/ProfilePage';

function Home() {
  const { t } = useI18n();
  const { profile } = useProfiles();
  const verified = ingredients.filter((i) => i.reviewStatus === 'verified').length;
  return (
    <main>
      <p className="lead">{t('app.tagline')}</p>
      <p className="muted">{t('home.v01')}</p>
      <div className="row">
        <Link className="button primary" to="/quiz">{t('home.start')}</Link>
        {profile?.scalp && <Link className="button" to="/results/shampoo">{t('home.seeResults')}</Link>}
      </div>
      <p className="muted small">{t('home.privacy')}</p>
      <p className="muted small">{t('home.dataSummary', { products: products.length, ingredients: ingredients.length, verified })}</p>
    </main>
  );
}

/** 档案切换：多份档案（"我" / "帮别人测"） */
function ProfileSwitcher() {
  const { t } = useI18n();
  const { store, profile, switchTo, add } = useProfiles();
  if (store.profiles.length === 0) return null;
  return (
    <div className="switcher">
      <label className="small muted" htmlFor="profile-switch">{t('profile.current')}</label>
      <select id="profile-switch" value={profile?.id ?? ''} onChange={(e) => switchTo(e.target.value)}>
        {store.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button type="button" className="link" onClick={() => add(t('profile.newName', { n: store.profiles.length + 1 }))}>
        + {t('profile.add')}
      </button>
    </div>
  );
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const { saveFailed } = useProfiles();
  return (
    <BrowserRouter>
      <header className="top">
        <Link to="/" className="brand">{t('app.title')}</Link>
        <nav>
          <NavLink to="/quiz">{t('nav.quiz')}</NavLink>
          <NavLink to="/results/shampoo">{t('nav.results')}</NavLink>
          <NavLink to="/profile">{t('nav.profile')}</NavLink>
        </nav>
        <button type="button" className="link" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
          {t('lang.switch')}
        </button>
      </header>
      <ProfileSwitcher />
      {saveFailed && <p className="warn">{t('profile.saveFailed')}</p>}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/results/shampoo" element={<Results />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}
