import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import he from './he.json';

const KEY = 'dragonbrush.lang';

function initialLang(): 'en' | 'he' {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'he') return saved;
  } catch {
    // ignore
  }
  return navigator.language.startsWith('he') || navigator.language.startsWith('iw') ? 'he' : 'en';
}

function applyDir(lng: string) {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'he' ? 'rtl' : 'ltr';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, he: { translation: he } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnObjects: true,
});

applyDir(i18n.language);
i18n.on('languageChanged', (lng) => {
  applyDir(lng);
  try {
    localStorage.setItem(KEY, lng);
  } catch {
    // ignore
  }
});

export function toggleLanguage() {
  i18n.changeLanguage(i18n.language === 'he' ? 'en' : 'he');
}

export default i18n;
