'use client';
import TopBar from '@/components/layout/TopBar';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ClubContextProvider } from '@/providers/club-provider';
export default function DashboardLayout({ children }) {
    var _a, _b;
    const { data: session, status } = useSession();
    // Проверка аутентификации
    if (status === 'loading') {
        return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
    }
    if (status === 'unauthenticated') {
        redirect('/login');
        return null;
    }
    const userName = ((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name) || 'Пользователь';
    const userRole = ((_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.role) || 'Пользователь';
    return (<ClubContextProvider>
      <div className="bg-vista-dark-lighter min-h-screen text-vista-light">
        <TopBar userName={userName} userRole={userRole}/>
        
        <div className="pt-20 px-6">
          <main className="container mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ClubContextProvider>);
}
