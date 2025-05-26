'use client';

import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export default function AccountPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-vista-light">Настройки аккаунта</h1>
      
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light">Информация об аккаунте</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-vista-primary/20 flex items-center justify-center text-vista-primary">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-vista-light">{user?.name || 'Пользователь'}</h2>
                <p className="text-vista-light/70">{user?.email || 'Почта не указана'}</p>
                <p className="text-vista-light/70">Роль: {user?.role || 'Не указана'}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-vista-secondary/30">
              <Button 
                variant="destructive" 
                className="flex items-center gap-2" 
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                Выйти из системы
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 