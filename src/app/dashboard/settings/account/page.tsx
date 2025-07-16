'use client';

import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AccountPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-vista-light">{t('accountPage.title')}</h1>
      
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light">{t('accountPage.info')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-vista-primary/20 flex items-center justify-center text-vista-primary">
                {user?.name?.charAt(0) || t('accountPage.user_short')}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-vista-light">{user?.name || t('accountPage.user')}</h2>
                <p className="text-vista-light/70">{user?.email || t('accountPage.no_email')}</p>
                <p className="text-vista-light/70">{t('accountPage.role')}: {user?.role || t('accountPage.no_role')}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-vista-secondary/30">
              <Button 
                variant="destructive" 
                className="flex items-center gap-2" 
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                {t('accountPage.sign_out')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 