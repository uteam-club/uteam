import '@/styles/globals.css';
import { unstable_setRequestLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  unstable_setRequestLocale(locale);

  // Import messages for the current locale
  const messages = (await import(`../../messages/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <main className="min-h-screen bg-vista-dark">
          <Providers locale={locale} messages={messages}>
            {children}
          </Providers>
        </main>
      </body>
    </html>
  );
} 