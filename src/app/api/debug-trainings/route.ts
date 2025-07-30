import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const clubId = token.clubId;

    console.log('🔍 Debug trainings - clubId:', clubId, 'teamId:', teamId);

    // 1. Получаем все тренировки команды
    const allTrainings = await db.execute(sql`
      SELECT 
        t."id", t."title", t."date", t."teamId"
      FROM "Training" t
      WHERE t."clubId" = ${clubId}::uuid
      ${teamId ? sql`AND t."teamId" = ${teamId}::uuid` : sql``}
      ORDER BY t."date" DESC
    `);

    console.log('📊 Все тренировки:', allTrainings.rows.length);

    // 2. Получаем все GPS отчеты для тренировок
    const allReports = await db.execute(sql`
      SELECT 
        gr."id", gr."name", gr."eventId", gr."eventType", gr."clubId"
      FROM "GpsReport" gr
      WHERE gr."clubId" = ${clubId}::uuid
      AND gr."eventType" = 'TRAINING'
    `);

    console.log('📊 Все GPS отчеты для тренировок:', allReports.rows.length);

    // 3. Получаем тренировки с отчетами (как в основном API)
    const trainingsWithReports = await db.execute(sql`
      SELECT 
        t."id", t."title", t."teamId", t."date",
        gr."id" as "reportId",
        gr."name" as "reportName"
      FROM "Training" t
      INNER JOIN "GpsReport" gr ON gr."eventId" = t."id" AND gr."eventType" = 'TRAINING' AND gr."clubId" = ${clubId}::uuid
      WHERE t."clubId" = ${clubId}::uuid
      ${teamId ? sql`AND t."teamId" = ${teamId}::uuid` : sql``}
      ORDER BY t."date" DESC
    `);

    console.log('📊 Тренировки с отчетами:', trainingsWithReports.rows.length);

    return NextResponse.json({
      clubId,
      teamId,
      allTrainings: allTrainings.rows,
      allReports: allReports.rows,
      trainingsWithReports: trainingsWithReports.rows,
      summary: {
        totalTrainings: allTrainings.rows.length,
        totalReports: allReports.rows.length,
        trainingsWithReports: trainingsWithReports.rows.length
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при диагностике тренировок:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 