import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useI18n, type Key } from './i18n';
import { ingredients, products } from './data/load';
import { useProfiles } from './profile/ProfileContext';
import Quiz from './pages/Quiz';
import Results from './pages/Results';
import ProfilePage from './pages/ProfilePage';
import About from './pages/About';
import DataNotes from './pages/DataNotes';
import FaceQuiz from './pages/FaceQuiz';
import FaceResults from './pages/FaceResults';

/** 设计自查页只在开发环境打包和注册 */
const DesignQA = import.meta.env.DEV ? lazy(() => import('./pages/DesignQA')) : null;

function Home() {
  const { t } = useI18n();
  const { profile } = useProfiles();
  const verified = ingredients.filter((i) => i.reviewStatus === 'verified').length;
  return (
    <main className="shell">
      <section className="hero">
        <h1 className="display">{t('home.title')}</h1>
        <p>{t('app.tagline')}</p>
        <div className="stack" style={{ marginTop: 28 }}>
          <Link className="btn btn-primary btn-block" to="/quiz">{t('home.startHair')}</Link>
          <Link className="btn btn-primary btn-block" to="/skin/quiz">{t('home.startSkin')}</Link>
          {profile?.scalp && <Link className="btn btn-block" to="/results">{t('home.seeResults')}</Link>}
          {profile?.face && <Link className="btn btn-block" to="/skin">{t('home.seeSkinResults')}</Link>}
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

function NotFound() {
  const { t } = useI18n();
  return (
    <main className="shell stack-lg" style={{ paddingTop: 32 }}>
      <h1 className="h1">{t('notFound.title')}</h1>
      <p className="muted">{t('notFound.body')}</p>
      <Link className="btn btn-primary" to="/">{t('notFound.home')}</Link>
    </main>
  );
}

const PAGE_TITLES: Record<string, Key> = {
  '/': 'pageTitle.home',
  '/quiz': 'pageTitle.quiz',
  '/results': 'pageTitle.results',
  '/results/shampoo': 'pageTitle.results',
  '/skin/quiz': 'pageTitle.skinQuiz',
  '/skin': 'pageTitle.skin',
  '/profile': 'pageTitle.profile',
  '/about': 'pageTitle.about',
  '/data': 'pageTitle.data',
  // 设计自查页只在开发环境存在；生产环境 /qa 是 404，标题也按 404 显示
  ...(DesignQA ? { '/qa': 'pageTitle.qa' as Key } : {}),
};

/** 浏览器标题随页面变化；页面语言属性随界面语言变化（读屏软件按它选择发音） */
function DocumentMeta() {
  const { t, lang } = useI18n();
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);
  useEffect(() => {
    const key = PAGE_TITLES[pathname.replace(/\/+$/, '') || '/'] ?? 'pageTitle.notFound';
    const page = t(key);
    document.title = page ? `${page} · ${t('app.title')}` : t('app.title');
  }, [pathname, t]);
  return null;
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const { saveFailed } = useProfiles();
  return (
    <BrowserRouter>
      <DocumentMeta />
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="wordmark">{t('app.title')}</Link>
          <nav className="topnav">
            <NavLink to="/results">{t('nav.hairResults')}</NavLink>
            <NavLink to="/skin" end>{t('nav.skinResults')}</NavLink>
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
        <Route path="/skin/quiz" element={<FaceQuiz />} />
        <Route path="/skin" element={<FaceResults />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/about" element={<About />} />
        <Route path="/data" element={<DataNotes />} />
        {/* 设计自查页，不在导航中，只在开发环境可访问 */}
        {DesignQA && <Route path="/qa" element={<Suspense fallback={null}><DesignQA /></Suspense>} />}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="footer">
        <Link to="/data">{t('footer.data')}</Link>
        {' · '}
        <Link to="/about">{t('footer.about')}</Link>
      </footer>
    </BrowserRouter>
  );
}
