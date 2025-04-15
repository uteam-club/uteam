import { getRequestConfig } from 'next-intl/server';

// Определяем доступные локали
export const locales = ['en', 'ru'];
export const defaultLocale = 'ru';

// Определяем тип для локалей
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'Europe/Moscow'
  };
}); 