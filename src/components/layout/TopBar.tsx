'use client';

import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { 
  BellIcon, 
  UserCircleIcon, 
  ChevronDownIcon, 
  ArrowRightOnRectangleIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import Link from 'next/link';

interface TopBarProps {
  userName: string;
  userRole: string;
}

export default function TopBar({ userName, userRole }: TopBarProps) {
  const common = useTranslations('common');
  const navigation = useTranslations('navigation');
  const pathname = usePathname();
  const locale = pathname.split('/')[1];
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: `/${locale}/auth/login` });
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
    if (langMenuOpen) setLangMenuOpen(false);
  };

  const toggleLangMenu = () => {
    setLangMenuOpen(!langMenuOpen);
    if (userMenuOpen) setUserMenuOpen(false);
  };

  return (
    <div className="bg-vista-dark-secondary h-16 fixed top-0 right-0 left-64 shadow-md z-10 px-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-medium text-vista-light">
          {common('welcome')}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Переключение языка */}
        <div className="relative">
          <button 
            className="text-vista-light/80 hover:text-vista-light p-2 rounded-full flex items-center"
            onClick={toggleLangMenu}
          >
            <LanguageIcon className="w-5 h-5 mr-1" />
            <span className="uppercase">{locale}</span>
            <ChevronDownIcon className="w-4 h-4 ml-1" />
          </button>
          
          {langMenuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-vista-dark-secondary rounded shadow-lg z-20">
              <div className="py-1">
                <Link 
                  href={pathname.replace(/^\/[^/]+/, '/en')} 
                  className="block px-4 py-2 text-vista-light hover:bg-vista-dark/30"
                  onClick={() => setLangMenuOpen(false)}
                >
                  English
                </Link>
                <Link 
                  href={pathname.replace(/^\/[^/]+/, '/ru')} 
                  className="block px-4 py-2 text-vista-light hover:bg-vista-dark/30"
                  onClick={() => setLangMenuOpen(false)}
                >
                  Русский
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Кнопка уведомлений */}
        <button className="text-vista-light/80 hover:text-vista-light p-2 rounded-full">
          <BellIcon className="w-5 h-5" />
        </button>

        {/* Меню пользователя */}
        <div className="relative">
          <button 
            className="flex items-center text-vista-light/80 hover:text-vista-light"
            onClick={toggleUserMenu}
          >
            <UserCircleIcon className="w-8 h-8 mr-2" />
            <span className="mr-1">{userName}</span>
            <ChevronDownIcon className="w-4 h-4" />
          </button>
          
          {userMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-vista-dark-secondary rounded shadow-lg z-20">
              <div className="py-1">
                <div className="px-4 py-2 text-sm text-vista-light/60">
                  {userRole}
                </div>
                <Link 
                  href={`/${locale}/dashboard/profile`} 
                  className="block px-4 py-2 text-vista-light hover:bg-vista-dark/30"
                >
                  <span className="flex items-center">
                    <UserCircleIcon className="w-5 h-5 mr-2" />
                    {navigation('profile')}
                  </span>
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-vista-light hover:bg-vista-dark/30"
                >
                  <span className="flex items-center">
                    <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
                    {common('logout')}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 