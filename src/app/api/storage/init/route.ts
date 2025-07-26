import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { getToken } from 'next-auth/jwt';
// import { initializeStorage } from '@/lib/yandex-storage';
export const dynamic = 'force-dynamic';
export const revalidate = 0;


// API-маршрут для инициализации хранилища файлов
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'adminPanel.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    // Проверка прав доступа (только администраторы)
    if (token.role !== 'ADMIN' && token.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }
    
    // Для Яндекс Object Storage отдельная инициализация не требуется
    return NextResponse.json({ success: true, message: 'Хранилище файлов готово к использованию' });
  } catch (error) {
    console.error('Ошибка при инициализации хранилища:', error);
    return NextResponse.json({ error: 'Ошибка при инициализации хранилища' }, { status: 500 });
  }
} 