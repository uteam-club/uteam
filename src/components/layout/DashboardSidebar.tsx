'use client';

import { memo } from "react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClub } from '@/providers/club-provider';
import { 
  HomeIcon, 
  UsersIcon, 
  CalendarIcon, 
  PhotoIcon, 
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

function DashboardSidebar() {
  const pathname = usePathname();
  const { club } = useClub();

  const sidebarItems: SidebarItem[] = [
    {
      icon: <HomeIcon className="w-5 h-5" />,
      label: 'Главная',
      href: '/dashboard',
    },
    {
      icon: <UsersIcon className="w-5 h-5" />,
      label: 'Команды',
      href: '/dashboard/teams',
    },
    {
      icon: <CalendarIcon className="w-5 h-5" />,
      label: 'События',
      href: '/dashboard/events',
    },
    {
      icon: <PhotoIcon className="w-5 h-5" />,
      label: 'Медиа',
      href: '/dashboard/media',
    },
    {
      icon: <Cog6ToothIcon className="w-5 h-5" />,
      label: 'Настройки',
      href: '/dashboard/settings',
    },
  ];

  return (
    <aside className="bg-vista-dark w-64 h-screen fixed left-0 top-0 overflow-y-auto shadow-md">
      <div className="p-6">
        <h2 className="text-vista-primary text-2xl font-bold">
          {club ? club.name : 'UTEAM'}
        </h2>
      </div>
      
      <nav className="mt-6">
        <ul>
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={`flex items-center px-6 py-3 hover:bg-vista-secondary/50 transition-colors ${
                    isActive ? 'border-l-4 border-vista-primary bg-vista-secondary/30' : ''
                  }`}
                >
                  <span className={`mr-3 ${isActive ? 'text-vista-primary' : 'text-vista-light/70'}`}>
                    {item.icon}
                  </span>
                  <span className={`${isActive ? 'text-vista-primary' : 'text-vista-light/90'}`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
} 

export default memo(DashboardSidebar); 