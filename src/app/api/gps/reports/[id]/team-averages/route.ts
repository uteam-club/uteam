import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport, gpsReportData, gpsVisualizationProfile, gpsProfileColumn, gpsCanonicalMetric, training, trainingCategory, match } from '@/db/schema';
import { eq, and, gte, desc, inArray, ne } from 'drizzle-orm';
import { canAccessGpsReport } from '@/lib/gps-permissions';
import { AVERAGEABLE_METRICS } from '@/lib/gps-constants';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = params.id;
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    
    // Проверяем права доступа к GPS отчету
    const canAccess = await canAccessGpsReport(
      session.user.id,
      session.user.clubId,
      null,
      'view'
    );
    
    if (!canAccess) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'У вас нет прав для просмотра GPS отчетов' 
      }, { status: 403 });
    }

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Получаем отчет
    const [report] = await db.select()
      .from(gpsReport)
      .where(
        and(
          eq(gpsReport.id, reportId),
          eq(gpsReport.clubId, session.user.clubId || 'default-club')
        )
      );

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Получаем профиль визуализации
    const [profile] = await db.select()
      .from(gpsVisualizationProfile)
      .where(
        and(
          eq(gpsVisualizationProfile.id, profileId),
          eq(gpsVisualizationProfile.clubId, session.user.clubId || 'default-club')
        )
      );

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Получаем колонки профиля с информацией о канонических метриках
    const profileColumns = await db.select({
      id: gpsProfileColumn.id,
      canonicalMetricId: gpsProfileColumn.canonicalMetricId,
      displayName: gpsProfileColumn.displayName,
      displayUnit: gpsProfileColumn.displayUnit,
      displayOrder: gpsProfileColumn.displayOrder,
      isVisible: gpsProfileColumn.isVisible,
      canonicalMetricCode: gpsCanonicalMetric.code,
      canonicalMetricName: gpsCanonicalMetric.name,
      canonicalUnit: gpsCanonicalMetric.canonicalUnit,
    })
    .from(gpsProfileColumn)
    .leftJoin(gpsCanonicalMetric, eq(gpsProfileColumn.canonicalMetricId, gpsCanonicalMetric.id))
    .where(eq(gpsProfileColumn.profileId, profileId));


    // Фильтруем только метрики, которые можно усреднять и сортируем по displayOrder
    const averageableColumns = profileColumns
      .filter(column => 
        column.canonicalMetricCode && AVERAGEABLE_METRICS.includes(column.canonicalMetricCode)
      )
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));


    if (averageableColumns.length === 0) {
      return NextResponse.json({
        currentAverages: {},
        historicalAverages: {},
        metrics: []
      });
    }

    // Получаем данные текущего отчета
    const currentReportData = await db.select()
      .from(gpsReport)
      .where(eq(gpsReport.id, reportId));

    if (currentReportData.length === 0) {
      return NextResponse.json({
        currentAverages: {},
        historicalAverages: {},
        metrics: []
      });
    }

    const currentReport = currentReportData[0];
    const isMatch = currentReport.eventType === 'match';

    // Получаем данные игроков для текущего отчета
    const currentReportDataRows = await db.select()
      .from(gpsReportData)
      .where(eq(gpsReportData.gpsReportId, reportId));

    // Вычисляем текущие средние значения
    const currentAverages: Record<string, number> = {};
    
    for (const column of averageableColumns) {
      const values: number[] = [];
      
      for (const dataRow of currentReportDataRows) {
        if (dataRow.canonicalMetric === column.canonicalMetricCode) {
          const value = parseFloat(dataRow.value);
          if (!isNaN(value)) {
            values.push(value);
          }
        }
      }
      
      if (values.length > 0 && column.canonicalMetricCode) {
        currentAverages[column.canonicalMetricCode] = values.reduce((sum, val) => sum + val, 0) / values.length;
      } else if (column.canonicalMetricCode) {
        currentAverages[column.canonicalMetricCode] = 0;
      }
    }

    // Получаем информацию о текущем событии
    
    let currentEventInfo = null;
    let historicalReports = [];
    
    if (isMatch) {
      // Для матчей получаем информацию о матче
      const [currentMatch] = await db.select({
        id: match.id,
        teamId: match.teamId
      })
      .from(match)
      .where(eq(match.id, currentReport.eventId));
      

      if (!currentMatch) {
        return NextResponse.json({
          currentAverages,
          historicalAverages: {},
          metrics: averageableColumns.map(col => ({
            canonicalMetricCode: col.canonicalMetricCode,
            displayName: col.displayName,
            displayUnit: col.displayUnit,
            canAverage: true
          }))
        });
      }

      // Получаем последние 10 матчей той же команды по дате проведения матча
      historicalReports = await db.select({
        id: gpsReport.id
      })
      .from(gpsReport)
      .leftJoin(match, eq(gpsReport.eventId, match.id))
      .where(and(
        eq(gpsReport.eventType, 'match'),
        eq(match.teamId, currentMatch.teamId),
        ne(gpsReport.id, reportId) // Исключаем текущий отчет
      ))
      .orderBy(desc(match.date))
      .limit(10);
      
      currentEventInfo = {
        type: 'match',
        teamId: currentMatch.teamId,
        matchCount: historicalReports.length
      };
      
    } else {
      // Для тренировок получаем информацию о тренировке и категории
      const [currentTraining] = await db.select({
        categoryId: training.categoryId,
        categoryName: trainingCategory.name
      })
      .from(training)
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(eq(training.id, currentReport.eventId));
      

      if (!currentTraining) {
        return NextResponse.json({
          currentAverages,
          historicalAverages: {},
          metrics: averageableColumns.map(col => ({
            canonicalMetricCode: col.canonicalMetricCode,
            displayName: col.displayName,
            displayUnit: col.displayUnit,
            canAverage: true
          }))
        });
      }

      // Получаем исторические данные за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      historicalReports = await db.select({
        id: gpsReport.id
      })
      .from(gpsReport)
      .leftJoin(training, eq(gpsReport.eventId, training.id))
      .where(and(
        eq(gpsReport.eventType, 'training'),
        eq(training.categoryId, currentTraining.categoryId),
        gte(gpsReport.createdAt, thirtyDaysAgo)
      ))
      .orderBy(desc(gpsReport.createdAt));
      
      currentEventInfo = {
        type: 'training',
        categoryId: currentTraining.categoryId,
        categoryName: currentTraining.categoryName,
        trainingCount: historicalReports.length
      };
    }

    // Получаем ID всех исторических отчетов
    const historicalReportIds = historicalReports.map(r => r.id);

    // Получаем данные игроков для всех исторических отчетов
    const historicalReportDataRows = historicalReportIds.length > 0 
      ? await db.select()
          .from(gpsReportData)
          .where(inArray(gpsReportData.gpsReportId, historicalReportIds))
      : [];

    // Вычисляем исторические средние значения
    const historicalAverages: Record<string, number> = {};
    
    for (const column of averageableColumns) {
      const values: number[] = [];
      
      for (const dataRow of historicalReportDataRows) {
        if (dataRow.canonicalMetric === column.canonicalMetricCode) {
          const value = parseFloat(dataRow.value);
          if (!isNaN(value)) {
            values.push(value);
          }
        }
      }
      
      if (values.length > 0 && column.canonicalMetricCode) {
        historicalAverages[column.canonicalMetricCode] = values.reduce((sum, val) => sum + val, 0) / values.length;
      } else if (column.canonicalMetricCode) {
        historicalAverages[column.canonicalMetricCode] = 0;
      }
    }

    // Проверяем, есть ли исторические данные для сравнения
    const hasHistoricalData = Object.values(historicalAverages).some(value => value > 0);

    // Подсчитываем количество игроков в текущем отчете
    const playerCount = currentReportDataRows.length;

    // Подсчитываем количество событий и отчетов
    // eventCount - количество уникальных матчей/тренировок
    // reportCount - количество отчетов (может быть больше, если на одно событие несколько отчетов)
    const eventCount = historicalReports.length;
    const reportCount = historicalReportIds.length;

    // Формируем информацию для отображения
    let categoryInfo = null;
    if (isMatch) {
      categoryInfo = {
        name: `Последние ${eventCount} матчей`,
        eventCount,
        reportCount,
        type: 'match'
      };
    } else {
      categoryInfo = {
        name: currentEventInfo?.categoryName || 'Тренировки',
        eventCount,
        reportCount,
        type: 'training'
      };
    }

    return NextResponse.json({
      currentAverages,
      historicalAverages,
      metrics: averageableColumns.map(col => ({
        canonicalMetricCode: col.canonicalMetricCode,
        displayName: col.displayName,
        displayUnit: col.displayUnit,
        canAverage: true
      })),
      playerCount,
      categoryInfo,
      hasHistoricalData
    });

  } catch (error) {
    console.error('Error fetching team averages:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fetch team averages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
