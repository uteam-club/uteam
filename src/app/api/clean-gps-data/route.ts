import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { gpsReport, gpsProfile, playerMapping } from '@/db/schema';

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Проверяем, что пользователь - супер-админ
  if (token.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden - Only super admin can clean data' }, { status: 403 });
  }

  try {
    console.log('🧹 Начинаем полную очистку GPS данных...');
    
    // 1. Удаляем все GPS отчёты
    console.log('📄 Удаляем GPS отчёты...');
    const reportsResult = await db.delete(gpsReport);
    const reportsDeleted = reportsResult.rowCount || 0;
    console.log(`✅ Удалено отчётов: ${reportsDeleted}`);
    
    // 2. Удаляем все маппинги игроков
    console.log('🔗 Удаляем маппинги игроков...');
    const mappingsResult = await db.delete(playerMapping);
    const mappingsDeleted = mappingsResult.rowCount || 0;
    console.log(`✅ Удалено маппингов: ${mappingsDeleted}`);
    
    // 3. Удаляем все GPS профили
    console.log('📋 Удаляем GPS профили...');
    const profilesResult = await db.delete(gpsProfile);
    const profilesDeleted = profilesResult.rowCount || 0;
    console.log(`✅ Удалено профилей: ${profilesDeleted}`);
    
    console.log('🎉 Очистка завершена!');
    
    return NextResponse.json({
      success: true,
      message: 'Все GPS данные успешно удалены',
      deleted: {
        reports: reportsDeleted,
        mappings: mappingsDeleted,
        profiles: profilesDeleted
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при очистке GPS данных:', error);
    return NextResponse.json({ 
      error: 'Ошибка при очистке данных',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
