'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  ClockIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const analyticsItems = [
  {
    icon: <ChartBarIcon className="w-5 h-5" />,
    label: 'Обзор',
    href: '/dashboard/analytics',
  },
  {
    icon: <HeartIcon className="w-5 h-5" />,
    label: 'Состояние утро',
    href: '/dashboard/analytics/morning-survey',
  },
  {
    icon: <ClockIcon className="w-5 h-5" />,
    label: 'Оценка RPE',
    href: '/dashboard/analytics/rpe-survey',
  },
  {
    icon: <UserGroupIcon className="w-5 h-5" />,
    label: 'Посещаемость',
    href: '/dashboard/analytics/attendance',
  },
];

export function AnalyticsNavigation() {
  const pathname = usePathname();

  return (
    <div className="bg-vista-dark/30 border border-vista-secondary/30 rounded-lg p-4 mb-6">
      <nav className="flex flex-wrap gap-2">
        {analyticsItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-vista-primary text-white"
                  : "text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/30"
              )}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 