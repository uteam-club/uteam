import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/club.service';

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
  
  // Получаем информацию о клубе по поддомену
  const club = await getClubBySubdomain(subdomain);
  
  // Если клуб не найден, отображаем соответствующий UI в дочернем компоненте
  return <>{children}</>;
} 