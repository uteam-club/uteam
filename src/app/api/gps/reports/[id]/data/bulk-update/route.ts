import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema/gpsReport';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { gpsDataChangeLog } from '@/db/schema/gpsReportData';
import { match } from '@/db/schema/match';
import { playerGameModel } from '@/db/schema/playerGameModel';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { canAccessGpsData } from '@/lib/gps-permissions';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем разрешение на редактирование GPS данных
    const canEdit = await canAccessGpsData(
      session.user.id,
      session.user.clubId || 'default-club',
      null,
      'edit'
    );

    if (!canEdit) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'У вас нет прав для редактирования GPS данных' 
      }, { status: 403 });
    }

    const reportId = params.id;
    const { updates } = await request.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 });
    }

    // Проверяем, что отчет существует и принадлежит пользователю
    const [report] = await db
      .select()
      .from(gpsReport)
      .where(
        and(
          eq(gpsReport.id, reportId),
          eq(gpsReport.clubId, session.user.clubId || 'default-club')
        )
      )
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const changeLogEntries = [];

    // Обновляем каждое поле
    for (const update of updates) {
      const { dataId, value, reason } = update;

      // Получаем текущее значение
      const [currentData] = await db
        .select()
        .from(gpsReportData)
        .where(eq(gpsReportData.id, dataId));

      if (!currentData) {
        console.warn(`Data entry not found: ${dataId}`);
        continue;
      }

      const oldValue = currentData.value;
      const newValue = typeof value === 'number' ? value : parseFloat(value);

      if (isNaN(newValue)) {
        return NextResponse.json({ 
          error: `Invalid value for field ${currentData.canonicalMetric}: ${value}` 
        }, { status: 400 });
      }

      // Обновляем значение
      await db
        .update(gpsReportData)
        .set({
          value: newValue.toString(),
        })
        .where(eq(gpsReportData.id, dataId));

      // Создаем запись в истории изменений
      changeLogEntries.push({
        reportDataId: dataId,
        reportId: reportId,
        playerId: currentData.playerId,
        clubId: session.user.clubId || 'default-club',
        fieldName: currentData.canonicalMetric,
        fieldLabel: currentData.canonicalMetric, // Можно добавить маппинг на человекочитаемые названия
        oldValue: oldValue?.toString() || null,
        newValue: newValue.toString(),
        changedById: session.user.id,
        changedByName: session.user.name || 'Unknown User',
        changedAt: new Date(),
        changeReason: reason || 'Редактирование через модальное окно',
        changeType: 'manual',
      });
    }

    // Вставляем записи истории изменений
    if (changeLogEntries.length > 0) {
      await db.insert(gpsDataChangeLog).values(changeLogEntries);
    }

    // Обновляем статус отчета (отмечаем, что есть изменения)
    await db
      .update(gpsReport)
      .set({
        hasEdits: true,
        updatedAt: new Date(),
      })
      .where(eq(gpsReport.id, reportId));

    // Автоматический пересчет игровых моделей для команды
    try {
      
      // Получаем игроков из GPS данных отчета
      const reportData = await db.select()
        .from(gpsReportData)
        .where(eq(gpsReportData.gpsReportId, reportId));
      
      const playerIds = [...new Set(reportData.map(row => row.playerId))];
      
      if (playerIds.length > 0) {
        // Получаем матчи команды
        const teamMatches = await db
          .select({ id: match.id })
          .from(match)
          .where(eq(match.teamId, report.teamId))
          .orderBy(desc(match.date))
          .limit(10);

        if (teamMatches.length > 0) {
          const matchIds = teamMatches.map(m => m.id);
          
          // Получаем GPS отчеты для матчей
          const gpsReports = await db
            .select({ id: gpsReport.id, eventId: gpsReport.eventId })
            .from(gpsReport)
            .where(and(
              eq(gpsReport.eventType, 'match'),
              inArray(gpsReport.eventId, matchIds),
              eq(gpsReport.clubId, session.user.clubId || 'default-club')
            ));

          if (gpsReports.length > 0) {
            const reportIds = gpsReports.map(r => r.id);
            
            // Рассчитываем модели для каждого игрока
            let successCount = 0;
            for (const playerId of playerIds) {
              try {
                // Получаем данные игрока
                const playerData = await db
                  .select({
                    canonicalMetric: gpsReportData.canonicalMetric,
                    value: gpsReportData.value,
                    eventId: gpsReport.eventId
                  })
                  .from(gpsReportData)
                  .leftJoin(gpsReport, eq(gpsReportData.gpsReportId, gpsReport.id))
                  .where(and(
                    eq(gpsReportData.playerId, playerId),
                    inArray(gpsReportData.gpsReportId, reportIds),
                    eq(gpsReportData.canonicalMetric, 'duration')
                  ));

                if (playerData.length > 0) {
                  // Группируем по матчам
                  const matchData = new Map();
                  playerData.forEach(row => {
                    if (!matchData.has(row.eventId)) {
                      matchData.set(row.eventId, {});
                    }
                    matchData.get(row.eventId).duration = parseFloat(row.value) || 0;
                  });

                  // Фильтруем матчи с 60+ минутами
                  const validMatches: Array<{ eventId: string; duration: number }> = [];
                  matchData.forEach((metrics, eventId) => {
                    const duration = metrics.duration || 0;
                    if (duration >= 3600) { // 60 минут в секундах
                      validMatches.push({ eventId, duration });
                    }
                  });

                  if (validMatches.length > 0) {
                    const totalMinutes = validMatches.reduce((sum, { duration }) => sum + (duration / 60), 0);
                    
                    // Получаем все метрики для расчета модели
                    const allPlayerData = await db
                      .select({
                        canonicalMetric: gpsReportData.canonicalMetric,
                        value: gpsReportData.value,
                        eventId: gpsReport.eventId
                      })
                      .from(gpsReportData)
                      .leftJoin(gpsReport, eq(gpsReportData.gpsReportId, gpsReport.id))
                      .where(and(
                        eq(gpsReportData.playerId, playerId),
                        inArray(gpsReportData.gpsReportId, reportIds),
                        inArray(gpsReportData.canonicalMetric, [
                          'hsr_percentage', 'total_distance', 'time_in_speed_zone1', 'time_in_speed_zone2',
                          'time_in_speed_zone3', 'time_in_speed_zone4', 'time_in_speed_zone5', 'time_in_speed_zone6',
                          'speed_zone1_entries', 'speed_zone2_entries', 'speed_zone3_entries', 'speed_zone4_entries',
                          'speed_zone5_entries', 'speed_zone6_entries', 'sprints_count', 'acc_zone1_count',
                          'player_load', 'power_score', 'work_ratio', 'distance_zone1', 'distance_zone2',
                          'distance_zone3', 'distance_zone4', 'distance_zone5', 'distance_zone6',
                          'hsr_distance', 'sprint_distance', 'distance_per_min', 'time_in_hr_zone1',
                          'time_in_hr_zone2', 'time_in_hr_zone3', 'time_in_hr_zone4', 'time_in_hr_zone5',
                          'time_in_hr_zone6', 'dec_zone1_count', 'dec_zone2_count', 'dec_zone3_count',
                          'dec_zone4_count', 'dec_zone5_count', 'dec_zone6_count', 'hml_distance',
                          'explosive_distance', 'acc_zone2_count', 'acc_zone3_count', 'acc_zone4_count',
                          'acc_zone5_count', 'acc_zone6_count', 'impacts_count'
                        ])
                      ));

                    // Группируем данные по матчам
                    const matchMetrics = new Map();
                    allPlayerData.forEach(row => {
                      if (!matchMetrics.has(row.eventId)) {
                        matchMetrics.set(row.eventId, {});
                      }
                      matchMetrics.get(row.eventId)[row.canonicalMetric] = parseFloat(row.value) || 0;
                    });

                    // Рассчитываем средние метрики (нормализованные к 90 минутам)
                    const averageMetrics: Record<string, number> = {};
                    const metricKeys = Object.keys(matchMetrics.get(validMatches[0].eventId) || {});
                    
                    metricKeys.forEach(metric => {
                      if (metric === 'duration') return; // Пропускаем duration
                      
                      let totalValue = 0;
                      let validCount = 0;
                      
                      validMatches.forEach(({ eventId, duration }) => {
                        const matchData = matchMetrics.get(eventId);
                        if (matchData) {
                          const value = matchData[metric] || 0;
                          if (value > 0) {
                            // Нормализация к 90 минутам
                            const normalizedValue = (value / (duration / 60)) * 90;
                            totalValue += normalizedValue;
                            validCount++;
                          }
                        }
                      });
                      
                      if (validCount > 0) {
                        averageMetrics[metric] = totalValue / validCount;
                      }
                    });
                    
                    // Удаляем существующую модель
                    await db
                      .delete(playerGameModel)
                      .where(and(
                        eq(playerGameModel.playerId, playerId),
                        eq(playerGameModel.clubId, session.user.clubId || 'default-club')
                      ));
                    
                    // Сохраняем новую модель с рассчитанными метриками
                    await db.insert(playerGameModel).values({
                      playerId,
                      clubId: session.user.clubId || 'default-club',
                      matchesCount: validMatches.length,
                      totalMinutes: Math.round(totalMinutes),
                      metrics: averageMetrics,
                      matchIds: validMatches.map(m => m.eventId),
                      version: 1
                    });
                    
                    successCount++;
                  }
                }
              } catch (error) {
                console.error(`Ошибка расчета для игрока ${playerId}:`, error);
              }
            }
            
          }
        }
      }
    } catch (error) {
      console.error('⚠️ Ошибка при автоматическом пересчете игровых моделей:', error);
      // Не прерываем выполнение, так как данные уже обновлены
    }

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updates.length} fields`,
      updatedCount: updates.length
    });

  } catch (error) {
    console.error('Error updating GPS report data:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
