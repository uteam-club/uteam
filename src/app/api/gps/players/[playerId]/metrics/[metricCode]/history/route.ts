import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { gpsReport } from '@/db/schema/gpsReport';
import { eq, and, desc, gte } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string; metricCode: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId, metricCode } = params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const eventType = searchParams.get('eventType');

    // Вычисляем дату начала периода
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Строим условия фильтрации
    const conditions = [
      eq(gpsReportData.playerId, playerId),
      eq(gpsReportData.canonicalMetric, metricCode),
      gte(gpsReport.createdAt, startDate),
      eq(gpsReport.clubId, session.user.clubId || 'default-club')
    ];

    if (eventType) {
      conditions.push(eq(gpsReport.eventType, eventType as 'training' | 'match'));
    }

    // Получаем исторические данные игрока по метрике
    const historicalData = await db
      .select({
        value: gpsReportData.value,
        unit: gpsReportData.unit,
        createdAt: gpsReport.createdAt,
        reportName: gpsReport.name,
        eventType: gpsReport.eventType,
      })
      .from(gpsReportData)
      .innerJoin(gpsReport, eq(gpsReportData.gpsReportId, gpsReport.id))
      .where(and(...conditions))
      .orderBy(desc(gpsReport.createdAt));

    // Преобразуем данные в нужный формат
    const formattedData = historicalData.map(item => ({
      value: parseFloat(item.value),
      unit: item.unit,
      date: item.createdAt.toISOString(),
      reportName: item.reportName,
      eventType: item.eventType,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      playerId,
      metricCode,
      period: `${days} days`,
      count: formattedData.length
    });

  } catch (error) {
    console.error('Error fetching player metric history:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
