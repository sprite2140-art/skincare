import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useI18n } from './i18n';
import { ingredients, products } from './data/load';

function Home() {
  const { t } = useI18n();
  const verified = ingredients.filter((i) => i.reviewStatus === 'verified').length;
  return (
    <main>
      <p>{t('app.tagline')}</p>
      <p>{t('home.dataSummary', { products: products.length, ingredients: ingredients.length, verified })}</p>
      <p>{t('home.wip')}</p>
    </main>
  );
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  return (
    <BrowserRouter>
      <header>
        <h1>{t('app.title')}</h1>
        <button type="button" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
          {t('lang.switch')}
        </button>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
