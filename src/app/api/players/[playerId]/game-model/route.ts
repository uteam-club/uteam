import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { playerGameModel, player, gpsReport, gpsReportData, match } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId } = params;

    // Проверяем, что игрок принадлежит к клубу пользователя
    const [playerData] = await db
      .select()
      .from(player)
      .where(eq(player.id, playerId));

    if (!playerData) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Получаем последнюю игровую модель
    const [gameModel] = await db
      .select()
      .from(playerGameModel)
      .where(and(
        eq(playerGameModel.playerId, playerId),
        eq(playerGameModel.clubId, session.user.clubId || 'default-club')
      ))
      .orderBy(desc(playerGameModel.calculatedAt))
      .limit(1);

    if (!gameModel) {
      return NextResponse.json({
        success: true,
        gameModel: null,
        message: 'No game model calculated yet'
      });
    }

    return NextResponse.json({
      success: true,
      gameModel: {
        id: gameModel.id,
        playerId: gameModel.playerId,
        calculatedAt: gameModel.calculatedAt,
        matchesCount: gameModel.matchesCount,
        totalMinutes: gameModel.totalMinutes,
        metrics: gameModel.metrics,
        matchIds: gameModel.matchIds,
        version: gameModel.version
      }
    });

  } catch (error) {
    console.error('Error fetching game model:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId } = params;

    // Проверяем, что игрок принадлежит к клубу пользователя
    const [playerData] = await db
      .select()
      .from(player)
      .where(eq(player.id, playerId));

    if (!playerData) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Реализуем реальную логику расчета игровой модели
    const gameModel = await calculatePlayerGameModel(playerId, session.user.clubId || 'default-club');

    if (!gameModel) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient data for game model calculation. Need at least 1 match with 60+ minutes.',
        gameModel: null
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Game model calculated successfully',
      gameModel
    });

  } catch (error) {
    console.error('Error recalculating game model:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Функция расчета игровой модели игрока
async function calculatePlayerGameModel(playerId: string, clubId: string) {
  try {
    // Список усредняемых метрик (48 метрик)
    const AVERAGEABLE_METRICS = [
      'hsr_percentage',
      'total_distance',
      'time_in_speed_zone1',
      'time_in_speed_zone2',
      'time_in_speed_zone3',
      'time_in_speed_zone4',
      'time_in_speed_zone5',
      'time_in_speed_zone6',
      'speed_zone1_entries',
      'speed_zone2_entries',
      'speed_zone3_entries',
      'speed_zone4_entries',
      'speed_zone5_entries',
      'speed_zone6_entries',
      'sprints_count',
      'acc_zone1_count',
      'player_load',
      'power_score',
      'work_ratio',
      'distance_zone1',
      'distance_zone2',
      'distance_zone3',
      'distance_zone4',
      'distance_zone5',
      'distance_zone6',
      'hsr_distance',
      'sprint_distance',
      'distance_per_min',
      'time_in_hr_zone1',
      'time_in_hr_zone2',
      'time_in_hr_zone3',
      'time_in_hr_zone4',
      'time_in_hr_zone5',
      'time_in_hr_zone6',
      'dec_zone1_count',
      'dec_zone2_count',
      'dec_zone3_count',
      'dec_zone4_count',
      'dec_zone5_count',
      'dec_zone6_count',
      'hml_distance',
      'explosive_distance',
      'acc_zone2_count',
      'acc_zone3_count',
      'acc_zone4_count',
      'acc_zone5_count',
      'acc_zone6_count',
      'impacts_count'
    ];

    // 1. Получаем GPS отчеты матчей для игрока

    // Получаем последние 10 матчей команды игрока
    const teamMatches = await db
      .select({
        id: match.id,
        teamId: match.teamId
      })
      .from(match)
      .where(eq(match.teamId, player.teamId))
      .orderBy(desc(match.date))
      .limit(10);

    if (teamMatches.length === 0) {
      return null;
    }

    const matchIds = teamMatches.map(m => m.id);

    // Получаем GPS отчеты для этих матчей
    const gpsReports = await db
      .select({
        id: gpsReport.id,
        eventId: gpsReport.eventId,
        createdAt: gpsReport.createdAt
      })
      .from(gpsReport)
      .where(and(
        eq(gpsReport.eventType, 'match'),
        eq(gpsReport.clubId, clubId),
        inArray(gpsReport.eventId, matchIds)
      ))
      .orderBy(desc(gpsReport.createdAt));

    if (gpsReports.length === 0) {
      return null;
    }

    const reportIds = gpsReports.map(r => r.id);

    // 2. Получаем данные игрока из всех отчетов
    const playerDataRows = await db
      .select()
      .from(gpsReportData)
      .where(and(
        eq(gpsReportData.playerId, playerId),
        inArray(gpsReportData.gpsReportId, reportIds)
      ));

    if (playerDataRows.length === 0) {
      return null;
    }

    // 3. Фильтруем матчи с игрой 60+ минут
    const validMatches: Array<{
      reportId: string;
      matchId: string;
      duration: number;
      metrics: Record<string, number>;
    }> = [];

    for (const report of gpsReports) {
      const reportData = playerDataRows.filter(row => row.gpsReportId === report.id);
      
      // Ищем данные о времени игры
      const durationData = reportData.find(row => 
        row.canonicalMetric === 'duration' || 
        row.canonicalMetric === 'time_on_field'
      );

      if (!durationData) continue;

      // Конвертируем время в минуты
      let durationMinutes = 0;
      const timeValue = durationData.value;
      
      if (typeof timeValue === 'string') {
        // Парсим время в формате HH:MM:SS или MM:SS
        const timeParts = timeValue.split(':');
        if (timeParts.length === 3) {
          const hours = parseInt(timeParts[0]) || 0;
          const minutes = parseInt(timeParts[1]) || 0;
          const seconds = parseInt(timeParts[2]) || 0;
          durationMinutes = hours * 60 + minutes + seconds / 60;
        } else if (timeParts.length === 2) {
          const minutes = parseInt(timeParts[0]) || 0;
          const seconds = parseInt(timeParts[1]) || 0;
          durationMinutes = minutes + seconds / 60;
        }
      } else if (typeof timeValue === 'number') {
        // Если значение уже в минутах
        durationMinutes = timeValue;
      }

      // Проверяем, что игрок сыграл 60+ минут
      if (durationMinutes < 60) continue;

      // Собираем метрики для этого матча
      const matchMetrics: Record<string, number> = {};
      
      for (const dataRow of reportData) {
        if (AVERAGEABLE_METRICS.includes(dataRow.canonicalMetric)) {
          const value = parseFloat(dataRow.value);
          if (!isNaN(value)) {
            matchMetrics[dataRow.canonicalMetric] = value;
          }
        }
      }

      validMatches.push({
        reportId: report.id,
        matchId: report.eventId,
        duration: durationMinutes,
        metrics: matchMetrics
      });
    }

    // Проверяем, что есть хотя бы один валидный матч
    if (validMatches.length === 0) {
      return null;
    }

    // 4. Нормализуем метрики к 90 минутам и усредняем
    const normalizedMetrics: Record<string, number> = {};
    const metricSums: Record<string, number> = {};
    const metricCounts: Record<string, number> = {};

    for (const match of validMatches) {
      for (const [metricCode, value] of Object.entries(match.metrics)) {
        // Нормализация: (значение_метрики / минуты_игры) × 90
        const normalizedValue = (value / match.duration) * 90;
        
        if (!metricSums[metricCode]) {
          metricSums[metricCode] = 0;
          metricCounts[metricCode] = 0;
        }
        
        metricSums[metricCode] += normalizedValue;
        metricCounts[metricCode]++;
      }
    }

    // Вычисляем средние значения
    for (const metricCode of AVERAGEABLE_METRICS) {
      if (metricCounts[metricCode] > 0) {
        normalizedMetrics[metricCode] = metricSums[metricCode] / metricCounts[metricCode];
      }
    }

    // 5. Сохраняем игровую модель в базу данных
    const totalMinutes = validMatches.reduce((sum, match) => sum + match.duration, 0);
    const validMatchIds = validMatches.map(match => match.matchId);

    const [newGameModel] = await db
      .insert(playerGameModel)
      .values({
        playerId,
        clubId,
        calculatedAt: new Date(),
        matchesCount: validMatches.length,
        totalMinutes: Math.round(totalMinutes),
        metrics: normalizedMetrics,
        matchIds: validMatchIds,
        version: 1
      })
      .returning();

    return {
      id: newGameModel.id,
      playerId: newGameModel.playerId,
      calculatedAt: newGameModel.calculatedAt,
      matchesCount: newGameModel.matchesCount,
      totalMinutes: newGameModel.totalMinutes,
      metrics: newGameModel.metrics,
      matchIds: newGameModel.matchIds,
      version: newGameModel.version
    };

  } catch (error) {
    console.error('Error calculating player game model:', error);
    throw error;
  }
}
