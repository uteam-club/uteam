import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema/gpsReport';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { playerGameModel } from '@/db/schema/playerGameModel';
import { player } from '@/db/schema/player';
import { gpsCanonicalMetric } from '@/db/schema/gpsCanonicalMetric';
import { gpsVisualizationProfile, gpsProfileColumn } from '@/db/schema/gpsColumnMapping';
import { eq, and } from 'drizzle-orm';
import { calculateGameModelsForTeam } from '@/lib/game-model-calculator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = params.id;
    
    // Получаем информацию об отчете
    const [report] = await db
      .select({ 
        id: gpsReport.id,
        teamId: gpsReport.teamId, 
        clubId: gpsReport.clubId,
        eventType: gpsReport.eventType,
        eventId: gpsReport.eventId
      })
      .from(gpsReport)
      .where(and(
        eq(gpsReport.id, reportId),
        eq(gpsReport.clubId, session.user.clubId || 'default-club')
      ));

    if (!report) {
      return NextResponse.json({ 
        error: 'GPS отчет не найден или у вас нет доступа к нему' 
      }, { status: 404 });
    }

    if (report.eventType !== 'match') {
      return NextResponse.json({ 
        error: 'Игровые модели можно рассчитать только для матчей' 
      }, { status: 400 });
    }

    console.log(`🔄 Пересчет игровых моделей для команды ${report.teamId}...`);

    // Рассчитываем игровые модели для команды
    await calculateGameModelsForTeam(report.teamId, report.clubId);

    return NextResponse.json({ 
      success: true,
      message: 'Игровые модели успешно пересчитаны',
      teamId: report.teamId,
      clubId: report.clubId
    });

  } catch (error) {
    console.error('Error recalculating player game models:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = params.id;
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }
    
    // Получаем информацию об отчете
    const [report] = await db
      .select({ 
        id: gpsReport.id,
        teamId: gpsReport.teamId, 
        clubId: gpsReport.clubId,
        eventType: gpsReport.eventType,
        eventId: gpsReport.eventId
      })
      .from(gpsReport)
      .where(and(
        eq(gpsReport.id, reportId),
        eq(gpsReport.clubId, session.user.clubId || 'default-club')
      ));

    if (!report) {
      return NextResponse.json({ 
        error: 'GPS отчет не найден или у вас нет доступа к нему' 
      }, { status: 404 });
    }

    // Получаем профиль визуализации с кастомными названиями метрик
    const [profile] = await db
      .select()
      .from(gpsVisualizationProfile)
      .where(and(
        eq(gpsVisualizationProfile.id, profileId),
        eq(gpsVisualizationProfile.clubId, session.user.clubId || 'default-club')
      ));

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Получаем колонки профиля с кастомными названиями
    const profileColumns = await db
      .select({
        canonicalMetricId: gpsProfileColumn.canonicalMetricId,
        displayName: gpsProfileColumn.displayName,
        displayUnit: gpsProfileColumn.displayUnit,
        isVisible: gpsProfileColumn.isVisible,
        canonicalMetricCode: gpsCanonicalMetric.code,
      })
      .from(gpsProfileColumn)
      .leftJoin(gpsCanonicalMetric, eq(gpsProfileColumn.canonicalMetricId, gpsCanonicalMetric.id))
      .where(eq(gpsProfileColumn.profileId, profileId));

    console.log(`📊 Колонки профиля: ${profileColumns.length} записей`);

    // Создаем мапу кастомных названий метрик
    const customMetricsMap = new Map();
    profileColumns.forEach(column => {
      if (column.isVisible && column.canonicalMetricCode) {
        customMetricsMap.set(column.canonicalMetricCode, {
          displayName: column.displayName,
          displayUnit: column.displayUnit
        });
      }
    });

    // Получаем информацию о канонических метриках для fallback
    const canonicalMetrics = await db
      .select({
        code: gpsCanonicalMetric.code,
        name: gpsCanonicalMetric.name,
        unit: gpsCanonicalMetric.canonicalUnit,
      })
      .from(gpsCanonicalMetric)
      .where(eq(gpsCanonicalMetric.isActive, true));

    // Создаем мапу метрик для быстрого доступа (с приоритетом кастомных названий)
    const metricsMap = new Map();
    canonicalMetrics.forEach(metric => {
      const customMetric = customMetricsMap.get(metric.code);
      metricsMap.set(metric.code, {
        name: customMetric?.displayName || metric.name,
        unit: customMetric?.displayUnit || metric.unit
      });
    });

    // Получаем данные текущего матча для всех игроков
    const currentMatchData = await db
      .select({
        playerId: gpsReportData.playerId,
        canonicalMetric: gpsReportData.canonicalMetric,
        value: gpsReportData.value,
        unit: gpsReportData.unit
      })
      .from(gpsReportData)
      .where(eq(gpsReportData.gpsReportId, reportId));


    // Получаем игровые модели для команды
    const gameModels = await db
      .select({
        id: playerGameModel.id,
        playerId: playerGameModel.playerId,
        calculatedAt: playerGameModel.calculatedAt,
        matchesCount: playerGameModel.matchesCount,
        totalMinutes: playerGameModel.totalMinutes,
        metrics: playerGameModel.metrics,
        matchIds: playerGameModel.matchIds,
        version: playerGameModel.version
      })
      .from(playerGameModel)
      .where(and(
        eq(playerGameModel.clubId, report.clubId)
      ));

    // Получаем информацию об игроках
    const players = await db
      .select({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        imageUrl: player.imageUrl
      })
      .from(player)
      .where(eq(player.teamId, report.teamId));

    // Убираем старую логику с metricMapping - теперь используем metricsMap

    // Объединяем данные игроков с их игровыми моделями и данными текущего матча
    const playersWithModels = players.map(player => {
      console.log(`\n🔍 === ОБРАБОТКА ИГРОКА: ${player.firstName} ${player.lastName} ===`);
      
      const gameModel = gameModels.find(model => model.playerId === player.id);
      console.log(`🎯 Игровая модель: ${!!gameModel}`);
      
      // Получаем данные текущего матча для игрока
      const playerMatchData = currentMatchData.filter(data => data.playerId === player.id);
      console.log(`📊 Данные матча: ${playerMatchData.length} записей`);
      
      // Группируем данные по метрикам
      const matchMetrics: Record<string, { value: number; unit: string }> = {};
      playerMatchData.forEach(data => {
        const value = parseFloat(data.value);
        if (!isNaN(value)) {
          matchMetrics[data.canonicalMetric] = {
            value: value,
            unit: data.unit
          };
        }
      });

      // Создаем метрики для сравнения
      const comparisonMetrics: Array<{
        canonicalMetric: string;
        displayName: string;
        displayUnit: string;
        currentValue: number;
        modelValue: number;
        percentageDiff: number;
      }> = [];

      if (gameModel) {
        // Получаем время игры из данных матча
        const durationData = matchMetrics['duration'];
        const matchDurationMinutes = durationData ? durationData.value / 60 : 0;
        console.log(`⏱️ Время в матче: ${matchDurationMinutes.toFixed(1)} мин`);

        // ПРОВЕРЯЕМ: игрок должен играть 60+ минут для сравнения
        if (matchDurationMinutes >= 60) {
          console.log(`✅ Игрок играл 60+ минут, создаем сравнения...`);
          
          // Создаем метрики для сравнения - автоматически для всех метрик из игровой модели
          Object.entries(gameModel.metrics as Record<string, number>).forEach(([metricCode, modelValuePerMinute]) => {
            const matchData = matchMetrics[metricCode];
            const metricInfo = metricsMap.get(metricCode);
            
            if (matchData && metricInfo) {
              const currentValue = matchData.value; // Абсолютное значение из матча
              const modelValueForMatch = modelValuePerMinute * matchDurationMinutes; // Модель × время матча
              
              const percentageDiff = modelValueForMatch > 0 ? 
                ((currentValue - modelValueForMatch) / modelValueForMatch) * 100 : 0;

              console.log(`🔍 Метрика ${metricCode}:`);
              console.log(`  - Кастомное название: ${metricInfo.name}`);
              console.log(`  - Кастомная единица: ${metricInfo.unit}`);
              console.log(`  - Текущее значение: ${currentValue}`);
              console.log(`  - Модельное значение: ${modelValueForMatch}`);

              comparisonMetrics.push({
                canonicalMetric: metricCode,
                displayName: metricInfo.name,
                displayUnit: metricInfo.unit || 'unknown',
                currentValue: currentValue, // Абсолютное значение
                modelValue: modelValueForMatch, // Модель × время матча
                percentageDiff
              });
            }
          });
          
          console.log(`📈 Создано метрик для сравнения: ${comparisonMetrics.length}`);
        } else {
          console.log(`❌ Игрок играл менее 60 минут`);
        }
      } else {
        console.log(`❌ Нет игровой модели`);
      }

      return {
        ...player,
        gameModel: gameModel || null,
        matchData: matchMetrics,
        comparisonMetrics
      };
    });

    return NextResponse.json({ 
      success: true,
      players: playersWithModels,
      report: {
        id: report.id,
        teamId: report.teamId,
        clubId: report.clubId,
        eventType: report.eventType,
        eventId: report.eventId
      }
    });

  } catch (error) {
    console.error('Error getting player game models:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}