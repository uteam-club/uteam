'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  UsersIcon, 
  CalendarIcon, 
  ClipboardDocumentListIcon, 
  DocumentTextIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

export default function DashboardSidebar() {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const locale = pathname.split('/')[1]; // Извлекаем локаль из URL

  const sidebarItems: SidebarItem[] = [
    {
      icon: <HomeIcon className="w-5 h-5" />,
      label: t('home'),
      href: `/${locale}/dashboard`,
    },
    {
      icon: <UsersIcon className="w-5 h-5" />,
      label: t('teams'),
      href: `/${locale}/dashboard/teams`,
    },
    {
      icon: <CalendarIcon className="w-5 h-5" />,
      label: t('events'),
      href: `/${locale}/dashboard/events`,
    },
    {
      icon: <ClipboardDocumentListIcon className="w-5 h-5" />,
      label: t('tasks'),
      href: `/${locale}/dashboard/tasks`,
    },
    {
      icon: <DocumentTextIcon className="w-5 h-5" />,
      label: t('documents'),
      href: `/${locale}/dashboard/documents`,
    },
    {
      icon: <Cog6ToothIcon className="w-5 h-5" />,
      label: t('settings'),
      href: `/${locale}/dashboard/settings`,
    },
  ];

  return (
    <aside className="bg-vista-dark-secondary w-64 h-screen fixed left-0 top-0 overflow-y-auto shadow-md">
      <div className="p-6">
        <h2 className="text-vista-accent text-2xl font-bold">VISTA UTEAM</h2>
      </div>
      
      <nav className="mt-6">
        <ul>
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={`flex items-center px-6 py-3 hover:bg-vista-dark/50 transition-colors ${
                    isActive ? 'border-l-4 border-vista-accent bg-vista-dark/30' : ''
                  }`}
                >
                  <span className={`mr-3 ${isActive ? 'text-vista-accent' : 'text-vista-light/70'}`}>
                    {item.icon}
                  </span>
                  <span className={`${isActive ? 'text-vista-accent' : 'text-vista-light/90'}`}>
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