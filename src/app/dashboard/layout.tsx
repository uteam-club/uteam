'use client';

import { ReactNode } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useClub } from '@/providers/club-provider';
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const { club } = useClub();
  const router = useRouter();

  useEffect(() => {
    if (session && club && session.user.clubId !== club.id) {
      signOut({ callbackUrl: '/login' });
      router.push('/login');
    }
  }, [session, club, router]);

  // Проверка аутентификации
  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  }
  
  if (status === 'unauthenticated') {
    redirect('/login');
    return null;
  }

  const userName = session?.user?.name || 'Пользователь';
  const userRole = session?.user?.role || 'Пользователь';

  return (
    <div className="bg-vista-dark-lighter min-h-screen text-vista-light">
      <TopBar userName={userName} userRole={userRole} />
      <div className="pt-20 px-6">
        <main className="container mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 