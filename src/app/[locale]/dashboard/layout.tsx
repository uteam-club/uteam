import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/options';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default async function DashboardRootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect(`/${locale}/auth/login`);
  }
  
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
} 