import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { getToken } from 'next-auth/jwt';
// import { initializeStorage } from '@/lib/yandex-storage';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH'];

// API-маршрут для инициализации хранилища файлов
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  try {
    // Проверка аутентификации и прав доступа (только администраторы)
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }
    
    // Для Яндекс Object Storage отдельная инициализация не требуется
    return NextResponse.json({ success: true, message: 'Хранилище файлов готово к использованию' });
  } catch (error) {
    console.error('Ошибка при инициализации хранилища:', error);
    return NextResponse.json({ error: 'Ошибка при инициализации хранилища' }, { status: 500 });
  }
} 