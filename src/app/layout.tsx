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
        url: '/light.svg',
        href: '/light.svg',
      },
      {
        media: '(prefers-color-scheme: dark)',
        url: '/dark.svg',
        href: '/dark.svg',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className}>
        <NextAuthProvider>
          {children}
          <Toaster />
        </NextAuthProvider>
      </body>
    </html>
  );
}
