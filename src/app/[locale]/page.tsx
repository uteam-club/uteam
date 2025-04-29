import { redirect } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
 
export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  redirect(`/${locale}/auth/login`);
} 