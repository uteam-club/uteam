import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = headers();
  const host = headersList.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return { title: 'Uteam' };
  const club = await getClubBySubdomain(subdomain);
  return {
    title: club?.name || 'Uteam',
    description: club?.name ? `Платформа для клуба ${club.name}` : 'Uteam платформа для клубов',
  };
}

export default async function ClubLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const headersList = headers();
  const host = headersList.get('host') || '';
  const subdomain = getSubdomain(host);
  
  // Если нет поддомена, перенаправляем на главную
  if (!subdomain) {
    redirect('/');
  }
  
  // Если клуб не найден, отображаем соответствующий UI в дочернем компоненте
  return <>{children}</>;
} 