import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/options';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Metadata } from 'next';

// Метаданные для панели управления
export const metadata: Metadata = {
  title: 'FDC VISTA | Панель управления',
  description: 'Панель управления FDC VISTA для управления командой и процессами',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

// Функция загрузки данных пользователя для предварительного кеширования
async function getUserData() {
  try {
    const session = await getServerSession(authOptions);
    return session;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    return null;
  }
}

export default async function DashboardRootLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  // Получаем данные пользователя и проверяем авторизацию
  const session = await getUserData();
  
  if (!session) {
    redirect(`/${locale}/auth/login`);
  }
  
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
} 