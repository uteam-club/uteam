import '@/styles/globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata = {
  title: 'FDC VISTA',
  description: 'Управление командами и процессами для клуба Vista',
  icons: {
    icon: '/images/UTEAM-08.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.className}>
      <body>{children}</body>
    </html>
  );
} 