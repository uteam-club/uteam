'use client';

import { ReactNode , memo } from 'react';
import Navbar from './Navbar';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="bg-vista-dark-lighter min-h-screen text-vista-light">
      <Navbar />
      <Breadcrumbs />
      
      <main className="max-w-[99%] mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
} 

export default memo(DashboardLayout);
