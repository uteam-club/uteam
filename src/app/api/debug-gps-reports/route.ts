import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔍 Диагностика GPS отчетов для клуба:', token.clubId);

    // Получаем все GPS отчеты клуба
    const reports = await db
      .select()
      .from(gpsReport)
      .where(eq(gpsReport.clubId, token.clubId));

    console.log('📊 Всего GPS отчетов в клубе:', reports.length);

    // Группируем по типу события
    const trainingReports = reports.filter(r => r.eventType === 'TRAINING');
    const matchReports = reports.filter(r => r.eventType === 'MATCH');

    console.log('🏃 Тренировки с отчетами:', trainingReports.length);
    console.log('⚽ Матчи с отчетами:', matchReports.length);

    // Показываем детали первых отчетов
    const sampleReports = reports.slice(0, 3).map(r => ({
      id: r.id,
      name: r.name,
      eventType: r.eventType,
      eventId: r.eventId,
      teamId: r.teamId,
      createdAt: r.createdAt
    }));

    return NextResponse.json({
      totalReports: reports.length,
      trainingReports: trainingReports.length,
      matchReports: matchReports.length,
      sampleReports,
      allReports: reports.map(r => ({
        id: r.id,
        name: r.name,
        eventType: r.eventType,
        eventId: r.eventId,
        teamId: r.teamId
      }))
    });

  } catch (error) {
    console.error('❌ Ошибка при диагностике GPS отчетов:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 