import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ru from './locales/ru/translation.json';
import en from './locales/en/translation.json';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: typeof window !== 'undefined' && localStorage.getItem('lang') ? localStorage.getItem('lang')! : 'ru',
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n; 