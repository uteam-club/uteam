'use client';

import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const common = useTranslations('common');
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';
  
  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: `/${locale}/auth/login` });
  };
  
  return (
    <Button 
      onClick={handleSignOut}
      className={`bg-vista-error hover:bg-vista-error/90 text-white ${className || ''}`}
    >
      <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
      Выйти из системы
    </Button>
  );
} 