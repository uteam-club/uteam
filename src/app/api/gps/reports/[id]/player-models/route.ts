import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport, gpsReportData, playerGameModel, player, gpsVisualizationProfile, gpsProfileColumn, gpsCanonicalMetric } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

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

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Получаем отчет
    const [report] = await db.select()
      .from(gpsReport)
      .where(
        and(
          eq(gpsReport.id, reportId),
          eq(gpsReport.clubId, session.user.clubId)
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
          eq(gpsVisualizationProfile.clubId, session.user.clubId)
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
        players: []
      });
    }

    // Получаем данные игроков из отчета
    const reportData = await db.select()
      .from(gpsReportData)
      .where(eq(gpsReportData.gpsReportId, reportId));

    // Получаем уникальных игроков из отчета
    const playerIds = [...new Set(reportData.map(row => row.playerId))];

    if (playerIds.length === 0) {
      return NextResponse.json({
        players: []
      });
    }

    // Получаем информацию об игроках
    const players = await db.select({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      jerseyNumber: player.number,
      photo: player.imageUrl
    })
    .from(player)
    .where(inArray(player.id, playerIds));

    // Получаем игровые модели для всех игроков
    const gameModels = await db.select()
      .from(playerGameModel)
      .where(
        and(
          inArray(playerGameModel.playerId, playerIds),
          eq(playerGameModel.clubId, session.user.clubId)
        )
      );

    // Создаем мапу игровых моделей по playerId
    const gameModelMap = new Map();
    gameModels.forEach(model => {
      gameModelMap.set(model.playerId, model);
    });

    // Обрабатываем каждого игрока
    const playersWithModels = players.map(player => {
      const playerReportData = reportData.filter(row => row.playerId === player.id);
      const gameModel = gameModelMap.get(player.id);

      // Получаем время игры игрока
      const durationData = playerReportData.find(row => 
        row.canonicalMetric === 'duration' || 
        row.canonicalMetric === 'time_on_field'
      );

      let actualDuration = 90; // По умолчанию 90 минут
      if (durationData) {
        const timeValue = String(durationData.value);
        if (typeof timeValue === 'string') {
          // Парсим время в формате HH:MM:SS или MM:SS
          const timeParts = timeValue.split(':');
          if (timeParts.length === 3) {
            const hours = parseInt(timeParts[0]) || 0;
            const minutes = parseInt(timeParts[1]) || 0;
            const seconds = parseInt(timeParts[2]) || 0;
            actualDuration = hours * 60 + minutes + seconds / 60;
          } else if (timeParts.length === 2) {
            const minutes = parseInt(timeParts[0]) || 0;
            const seconds = parseInt(timeParts[1]) || 0;
            actualDuration = minutes + seconds / 60;
          }
        } else if (typeof timeValue === 'number') {
          actualDuration = timeValue;
        }
      }

      // Собираем текущие метрики игрока
      const currentMetrics: Record<string, number> = {};
      playerReportData.forEach(row => {
        if (AVERAGEABLE_METRICS.includes(row.canonicalMetric)) {
          const value = parseFloat(row.value);
          if (!isNaN(value)) {
            currentMetrics[row.canonicalMetric] = value;
          }
        }
      });

      // Получаем метрики из игровой модели (нормализованные к 90 минутам)
      const modelMetrics = gameModel?.metrics || {};

      // Приводим игровую модель к реальному времени игры
      const adjustedModelMetrics: Record<string, number> = {};
      Object.entries(modelMetrics).forEach(([metricCode, value]) => {
        // Нормализация: (значение_модели / 90) × реальное_время
        const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        adjustedModelMetrics[metricCode] = (numericValue / 90) * actualDuration;
      });

      // Формируем метрики для отображения
      const displayMetrics = averageableColumns.map(column => {
        const currentValue = currentMetrics[column.canonicalMetricCode!] || 0;
        const modelValue = adjustedModelMetrics[column.canonicalMetricCode!] || 0;
        
        // Вычисляем процентную разницу
        const percentageDiff = modelValue > 0 
          ? ((currentValue - modelValue) / modelValue) * 100 
          : 0;

        return {
          canonicalMetricCode: column.canonicalMetricCode,
          displayName: column.displayName,
          displayUnit: column.displayUnit,
          currentValue,
          modelValue,
          percentageDiff
        };
      });

      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        jerseyNumber: player.jerseyNumber,
        photo: player.photo,
        actualDuration,
        hasGameModel: !!gameModel,
        gameModelInfo: gameModel ? {
          calculatedAt: gameModel.calculatedAt,
          matchesCount: gameModel.matchesCount,
          totalMinutes: gameModel.totalMinutes
        } : null,
        metrics: displayMetrics
      };
    });

    return NextResponse.json({
      players: playersWithModels
    });

  } catch (error) {
    console.error('Error fetching player models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player models', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
