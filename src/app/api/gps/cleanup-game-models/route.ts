import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { cleanupAllInvalidGameModels } from '@/lib/game-model-calculator-improved';
import { canAccessGpsReport } from '@/lib/gps-permissions';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем разрешение на управление GPS отчетами
    const canManage = await canAccessGpsReport(
      session.user.id,
      session.user.clubId || 'default-club',
      null,
      'edit'
    );

    if (!canManage) {
      return NextResponse.json({
        error: 'Forbidden',
        message: 'У вас нет прав для управления GPS отчетами'
      }, { status: 403 });
    }

    const clubId = session.user.clubId || 'default-club';
    
    console.log(`🧹 Запуск очистки недействительных игровых моделей для клуба ${clubId}...`);
    
    // Очищаем недействительные модели
    await cleanupAllInvalidGameModels(clubId);
    
    console.log(`✅ Очистка завершена для клуба ${clubId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Недействительные игровые модели очищены' 
    });

  } catch (error) {
    console.error('❌ Ошибка очистки игровых моделей:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Ошибка при очистке игровых моделей' 
      }, 
      { status: 500 }
    );
  }
}
