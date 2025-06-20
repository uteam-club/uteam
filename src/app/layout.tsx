import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NextAuthProvider } from '@/providers/auth-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'FDC Vista',
  description: 'Football Development Club Vista',
  icons: {
    icon: [
      {
        media: '(prefers-color-scheme: light)',
        url: '/dark.svg',
        href: '/dark.svg',
      },
      {
        media: '(prefers-color-scheme: dark)',
        url: '/light.svg',
        href: '/light.svg',
      },
    ],
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Favicon для светлой и тёмной темы */}
        <link rel="icon" href="/dark.svg" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/light.svg" media="(prefers-color-scheme: dark)" />
        {/* Fallback для старых браузеров */}
        <link rel="icon" href="/dark.svg" />
      </head>
      <body className={inter.className}>
        <NextAuthProvider>
          {children}
          <Toaster />
        </NextAuthProvider>
      </body>
    </html>
  );
}
