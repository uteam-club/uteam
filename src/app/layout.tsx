import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NextAuthProvider } from '@/providers/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { headers } from 'next/headers';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { ClubContextProvider } from '@/providers/club-provider';
import I18nProvider from '@/providers/i18n-provider';
import PermissionsProviderWrapper from '@/providers/permissions-provider';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export async function generateMetadata() {
  const host = headers().get('host') || '';
  const subdomain = getSubdomain(host);
  const club = subdomain ? await getClubBySubdomain(subdomain) : null;
  console.log('generateMetadata:', { host, subdomain, club });
  return {
    title: club?.name || 'Uteam',
    description: club?.name ? `Платформа для клуба ${club.name}` : 'Uteam платформа для клубов',
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
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const host = headers().get('host') || '';
  const subdomain = getSubdomain(host);
  const club = subdomain ? await getClubBySubdomain(subdomain) : null;

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
        <I18nProvider>
        <NextAuthProvider>
          <PermissionsProviderWrapper>
            <ClubContextProvider initialClub={club}>
              {children}
            </ClubContextProvider>
          </PermissionsProviderWrapper>
          <Toaster />
        </NextAuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
