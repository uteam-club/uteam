import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSubdomain } from '@/lib/utils';

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