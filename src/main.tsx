import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import { ProfileProvider } from './profile/ProfileContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </I18nProvider>
  </StrictMode>,
);
