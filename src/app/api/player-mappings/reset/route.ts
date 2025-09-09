import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { playerMapping } from '@/db/schema';
import { and, eq, ilike } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { teamId, gpsSystem, reportName } = body as { 
      teamId: string; 
      gpsSystem?: string; 
      reportName?: string; 
    };

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // Строим условия для удаления
    const conditions = [
      eq(playerMapping.teamId, teamId),
      eq(playerMapping.clubId, token.clubId) // Только маппинги клуба пользователя
    ];

    // Добавляем фильтр по GPS системе, если указана
    if (gpsSystem && gpsSystem !== 'all') {
      conditions.push(eq(playerMapping.gpsSystem, gpsSystem));
    }

    // Добавляем фильтр по имени отчета, если указано
    if (reportName) {
      conditions.push(ilike(playerMapping.reportName, `%${reportName}%`));
    }

    // Примечание: eventType и eventId не поддерживаются в текущей схеме

    const whereClause = and(...conditions);

    // Логируем для диагностики
    if (process.env.GPS_DEBUG === '1') {
      console.log('[GPS-DEBUG] Resetting mappings with conditions:', {
        teamId,
        gpsSystem,
        reportName,
        clubId: token.clubId
      });
    }

    // Удаляем маппинги
    const result = await db
      .delete(playerMapping)
      .where(whereClause);

    const deletedCount = result.rowCount ?? 0;

    // Логируем результат
    if (process.env.GPS_DEBUG === '1') {
      console.log('[GPS-DEBUG] Deleted mappings:', deletedCount);
    }

    return NextResponse.json({ 
      ok: true, 
      deleted: deletedCount 
    });
  } catch (error) {
    console.error('Ошибка при массовом сбросе маппингов:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
