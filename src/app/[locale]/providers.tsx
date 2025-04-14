'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';

type ProviderProps = {
  children: ReactNode;
  locale: string;
  messages: Record<string, any>;
};

export function Providers({ children, locale, messages }: ProviderProps) {
  return (
    <NextIntlClientProvider 
      locale={locale} 
      messages={messages} 
      timeZone="Europe/Moscow"
    >
      {children}
    </NextIntlClientProvider>
  );
} 