import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gpsReport, gpsProfile, match, playerMapping, playerMatchStat, player } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

// GET - получение игровой модели игрока для публичного доступа
export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const playerId = params.playerId;
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const teamId = searchParams.get('teamId');

    if (!playerId || !profileId || !teamId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log('🔍 Получаем игровую модель игрока для публичного доступа:', {
      playerId,
      profileId,
      teamId
    });

    // Проверяем, что игрок существует
    const [playerData] = await db
      .select()
      .from(player)
      .where(eq(player.id, playerId));

    if (!playerData) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Получаем GPS профиль
    const [profile] = await db
      .select()
      .from(gpsProfile)
      .where(eq(gpsProfile.id, profileId));

    if (!profile) {
      return NextResponse.json({ error: 'GPS profile not found' }, { status: 404 });
    }

    // Получаем матчи команды с GPS данными
    const matchesWithGps = await db
      .select({
        matchId: match.id,
        matchDate: match.date,
        reportId: gpsReport.id,
        reportName: gpsReport.name,
        processedData: gpsReport.processedData,
        eventType: gpsReport.eventType
      })
      .from(match)
      .leftJoin(gpsReport, and(
        eq(gpsReport.eventId, match.id),
        eq(gpsReport.eventType, 'MATCH'),
        eq(gpsReport.profileId, profileId),
        eq(gpsReport.teamId, teamId),
        eq(gpsReport.isProcessed, true)
      ))
      .where(
        and(
          eq(match.teamId, teamId),
          sql`${gpsReport.id} IS NOT NULL`
        )
      )
      .orderBy(desc(match.date));

    if (matchesWithGps.length === 0) {
      return NextResponse.json({
        averageMetrics: {},
        matchesCount: 0,
        totalMinutes: 0
      });
    }

    // Обрабатываем данные для расчета средних показателей
    const playerMetrics: Record<string, { values: number[]; totalMinutes: number }> = {};
    let totalMatches = 0;
    let totalMinutes = 0;

    for (const matchData of matchesWithGps) {
      if (!matchData.processedData || !Array.isArray(matchData.processedData)) continue;

      // Ищем игрока в данных отчета
      const playerRow = matchData.processedData.find((row: any) => 
        row.playerId === playerId || 
        row.name === `${playerData.firstName} ${playerData.lastName}` ||
        row.name === `${playerData.lastName} ${playerData.firstName}`
      );

      if (!playerRow) continue;

      // Парсим время игрока
      const timeValue = playerRow.Time || playerRow.time || '00:00:00';
      const timeParts = timeValue.split(':');
      const hours = parseInt(timeParts[0]) || 0;
      const minutes = parseInt(timeParts[1]) || 0;
      const seconds = parseInt(timeParts[2]) || 0;
      const playerMinutes = Math.round(hours * 60 + minutes + seconds / 60);

      // Учитываем только матчи где игрок сыграл 60+ минут
      if (playerMinutes >= 60) {
        totalMatches++;
        totalMinutes += playerMinutes;

        // Обрабатываем метрики из профиля
        if (profile.columnMapping && Array.isArray(profile.columnMapping)) {
          profile.columnMapping.forEach((col: any) => {
          const columnName = col.name || col.internalField || '';
          if (columnName && col.isVisible && columnName !== 'Player' && columnName !== 'Position' && columnName !== 'Time') {
            const dataKey = col.mappedColumn || columnName;
            const value = parseFloat(playerRow[dataKey]) || 0;
            if (!isNaN(value)) {
              if (!playerMetrics[columnName]) {
                playerMetrics[columnName] = { values: [], totalMinutes: 0 };
              }
              // Нормализуем к 90 минутам
              const normalizedValue = (value / playerMinutes) * 90;
              playerMetrics[columnName].values.push(normalizedValue);
              playerMetrics[columnName].totalMinutes += playerMinutes;
            }
          }
        });
        }
      }
    }

    // Рассчитываем средние значения
    const averageMetrics: Record<string, { average: number; matchesCount: number; totalMinutes: number }> = {};

    Object.keys(playerMetrics).forEach(metric => {
      const { values, totalMinutes: metricTotalMinutes } = playerMetrics[metric];
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        averageMetrics[metric] = {
          average,
          matchesCount: values.length,
          totalMinutes: metricTotalMinutes
        };
      }
    });

    console.log('✅ Игровая модель рассчитана для публичного доступа:', {
      playerId,
      matchesCount: totalMatches,
      metricsCount: Object.keys(averageMetrics).length
    });

    return NextResponse.json({
      averageMetrics,
      matchesCount: totalMatches,
      totalMinutes
    });
  } catch (error) {
    console.error('❌ Ошибка при получении игровой модели игрока:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 