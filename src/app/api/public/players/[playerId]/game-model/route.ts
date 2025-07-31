import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gpsReport, player } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';

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

    // Получаем GPS отчеты для игрока с данным профилем
    const reports = await db
      .select()
      .from(gpsReport)
      .where(
        and(
          eq(gpsReport.profileId, profileId),
          eq(gpsReport.teamId, teamId),
          eq(gpsReport.isProcessed, true)
        )
      );

    if (reports.length === 0) {
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

    for (const report of reports) {
      if (!report.processedData || !Array.isArray(report.processedData)) continue;

      // Ищем игрока в данных отчета
      const playerRow = report.processedData.find((row: any) => 
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

        // Обрабатываем метрики
        Object.keys(playerRow).forEach(key => {
          if (key !== 'playerId' && key !== 'name' && key !== 'Time' && key !== 'time') {
            const value = parseFloat(playerRow[key]);
            if (!isNaN(value)) {
              if (!playerMetrics[key]) {
                playerMetrics[key] = { values: [], totalMinutes: 0 };
              }
              // Нормализуем к 90 минутам
              const normalizedValue = (value / playerMinutes) * 90;
              playerMetrics[key].values.push(normalizedValue);
              playerMetrics[key].totalMinutes += playerMinutes;
            }
          }
        });
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

    console.log('✅ Игровая модель рассчитана:', {
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