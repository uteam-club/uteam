import { db } from './db';
import { playerGameModel } from '@/db/schema/playerGameModel';
import { gpsReport } from '@/db/schema/gpsReport';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { match } from '@/db/schema/match';
import { player } from '@/db/schema/player';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { gpsCanonicalMetric } from '@/db/schema/gpsCanonicalMetric';

interface GameModelResult {
  playerId: string;
  matchesCount: number;
  totalMinutes: number;
  metrics: Record<string, number>;
  matchIds: string[];
}

/**
 * Рассчитывает игровую модель для игрока
 * @param playerId ID игрока
 * @param clubId ID клуба
 * @returns Результат расчета или null если недостаточно данных
 */
export async function calculatePlayerGameModel(
  playerId: string, 
  clubId: string
): Promise<GameModelResult | null> {
  try {
    console.log(`🔍 Расчет игровой модели для игрока ${playerId}...`);
    
    // 1. Получаем список усредняемых метрик из БД
    const averageableMetrics = await db
      .select({ code: gpsCanonicalMetric.code })
      .from(gpsCanonicalMetric)
      .where(and(
        eq(gpsCanonicalMetric.isActive, true),
        eq(gpsCanonicalMetric.isAverageable, true)
      ));

    const averageableMetricCodes = averageableMetrics.map(m => m.code);
    console.log(`📊 Найдено усредняемых метрик: ${averageableMetricCodes.length}`);
    
    // 2. Получаем данные игрока
    const [playerData] = await db
      .select()
      .from(player)
      .where(eq(player.id, playerId));

    if (!playerData) {
      console.log(`❌ Игрок ${playerId} не найден`);
      return null;
    }
    
    console.log(`👤 Игрок найден: ${playerData.firstName} ${playerData.lastName}, команда: ${playerData.teamId}`);

    // 2. Получаем GPS отчеты для матчей клуба (фильтрация по игроку будет позже)
    const gpsReports = await db
      .select({
        id: gpsReport.id,
        eventId: gpsReport.eventId,
        createdAt: gpsReport.createdAt
      })
      .from(gpsReport)
      .where(and(
        eq(gpsReport.eventType, 'match'),
        eq(gpsReport.clubId, clubId)
      ))
      .orderBy(desc(gpsReport.createdAt));

    console.log(`📊 Найдено GPS отчетов: ${gpsReports.length}`);
    
    if (gpsReports.length === 0) {
      console.log(`❌ Нет GPS отчетов для клуба`);
      return null;
    }

    const reportIds = gpsReports.map(r => r.id);

    // 4. Обрабатываем каждый матч и собираем валидные матчи игрока
    const allPlayerMatches: Array<{
      matchId: string;
      durationMinutes: number;
      metrics: Record<string, number>;
      createdAt: Date;
    }> = [];

    for (const report of gpsReports) {
      // Получаем ВСЕ данные игрока за матч (не фильтруем по averageable, чтобы не потерять duration)
      const playerData = await db
        .select({
          canonicalMetric: gpsReportData.canonicalMetric,
          value: gpsReportData.value,
          unit: gpsReportData.unit
        })
        .from(gpsReportData)
        .where(and(
          eq(gpsReportData.gpsReportId, report.id),
          eq(gpsReportData.playerId, playerId)
        ));

      if (playerData.length === 0) continue;

      // Получаем время игры (в секундах)
      const durationData = playerData.find(d => d.canonicalMetric === 'duration');
      if (!durationData) continue;
      
      const durationSeconds = parseFloat(durationData.value);
      const durationMinutes = durationSeconds / 60; // Конвертируем в минуты
      
      // Проверяем, что игрок играл 60+ минут
      if (durationMinutes < 60) {
        console.log(`⏰ Игрок играл только ${durationMinutes.toFixed(1)} минут, пропускаем матч ${report.eventId}`);
        continue;
      }

      // 5. НОРМАЛИЗАЦИЯ К 1 МИНУТЕ (правильная логика)
      const matchMetrics: Record<string, number> = {};
      
      for (const data of playerData) {
        if (data.canonicalMetric === 'duration') continue;
        // учитываем только усредняемые метрики
        if (!averageableMetricCodes.includes(data.canonicalMetric)) continue;
        
        const value = parseFloat(data.value);
        if (isNaN(value) || value <= 0) continue;
        
        // ПРАВИЛЬНО: метрика за минуту = общая_метрика / минуты_игры
        const metricPerMinute = value / durationMinutes;
        matchMetrics[data.canonicalMetric] = metricPerMinute;
      }

      allPlayerMatches.push({
        matchId: report.eventId,
        durationMinutes,
        metrics: matchMetrics,
        createdAt: report.createdAt
      });

      console.log(`✅ Матч ${report.eventId}: ${durationMinutes.toFixed(1)} минут, ${Object.keys(matchMetrics).length} метрик`);
    }

    // 6. Берем только последние 10 матчей игрока с 60+ минутами
    const validMatches = allPlayerMatches
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // Сортируем по дате (новые сначала)
      .slice(0, 10); // Берем только последние 10

    // Проверяем, что есть хотя бы один валидный матч
    if (validMatches.length === 0) {
      console.log(`❌ Нет матчей с 60+ минутами игры`);
      return null;
    }

    console.log(`✅ Валидных матчей: ${validMatches.length}`);

    // 7. УСРЕДНЕНИЕ ПО ВСЕМ МАТЧАМ
    const averageMetrics: Record<string, number> = {};
    const metricSums: Record<string, number> = {};
    const metricCounts: Record<string, number> = {};

    for (const match of validMatches) {
      for (const [metricCode, valuePerMinute] of Object.entries(match.metrics)) {
        if (!metricSums[metricCode]) {
          metricSums[metricCode] = 0;
          metricCounts[metricCode] = 0;
        }
        
        metricSums[metricCode] += valuePerMinute;
        metricCounts[metricCode]++;
      }
    }

    // Вычисляем средние значения за минуту
    for (const metricCode of averageableMetricCodes) {
      if (metricCounts[metricCode] > 0) {
        averageMetrics[metricCode] = metricSums[metricCode] / metricCounts[metricCode];
      }
    }

    const totalMinutes = validMatches.reduce((sum, match) => sum + match.durationMinutes, 0);
    const validMatchIds = validMatches.map(match => match.matchId);

    console.log(`📈 Рассчитано ${Object.keys(averageMetrics).length} метрик за минуту`);
    console.log(`⏱️ Общее время игры: ${totalMinutes.toFixed(1)} минут`);

    return {
      playerId,
      matchesCount: validMatches.length,
      totalMinutes: Math.round(totalMinutes),
      metrics: averageMetrics, // Значения ЗА МИНУТУ!
      matchIds: validMatchIds
    };

  } catch (error) {
    console.error(`❌ Ошибка расчета игровой модели для игрока ${playerId}:`, error);
    return null;
  }
}

/**
 * Сохраняет или обновляет игровую модель в базе данных
 * @param playerId ID игрока
 * @param clubId ID клуба
 * @param gameModel Результат расчета игровой модели
 */
export async function savePlayerGameModel(
  playerId: string,
  clubId: string,
  gameModel: GameModelResult
): Promise<void> {
  try {
    // Используем UPSERT для безопасного обновления
    await db
      .insert(playerGameModel)
      .values({
        playerId,
        clubId,
        calculatedAt: new Date(),
        matchesCount: gameModel.matchesCount,
        totalMinutes: gameModel.totalMinutes,
        metrics: gameModel.metrics,
        matchIds: gameModel.matchIds,
        version: 1
      })
      .onConflictDoUpdate({
        target: [playerGameModel.playerId, playerGameModel.clubId],
        set: {
          calculatedAt: new Date(),
          matchesCount: gameModel.matchesCount,
          totalMinutes: gameModel.totalMinutes,
          metrics: gameModel.metrics,
          matchIds: gameModel.matchIds,
          version: sql`${playerGameModel.version} + 1`,
          updatedAt: new Date()
        }
      });

    console.log(`✅ Игровая модель сохранена для игрока ${playerId}`);
  } catch (error) {
    console.error(`❌ Ошибка сохранения игровой модели для игрока ${playerId}:`, error);
    throw error;
  }
}

/**
 * Рассчитывает и сохраняет игровые модели для всех игроков команды
 * @param teamId ID команды
 * @param clubId ID клуба
 */
export async function calculateGameModelsForTeam(
  teamId: string,
  clubId: string
): Promise<void> {
  try {
    console.log(`🔍 Расчет игровых моделей для команды ${teamId}...`);
    
    // Получаем всех игроков команды
    const players = await db
      .select({ id: player.id })
      .from(player)
      .where(eq(player.teamId, teamId));

    console.log(`👥 Найдено игроков: ${players.length}`);

    let successCount = 0;
    let errorCount = 0;

    // Рассчитываем модель для каждого игрока
    for (const { id: playerId } of players) {
      try {
        const gameModel = await calculatePlayerGameModel(playerId, clubId);
        
        if (gameModel) {
          await savePlayerGameModel(playerId, clubId, gameModel);
          successCount++;
        } else {
          console.log(`⚠️ Недостаточно данных для игрока ${playerId}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка для игрока ${playerId}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Завершено: ${successCount} успешно, ${errorCount} ошибок`);
  } catch (error) {
    console.error(`❌ Ошибка расчета игровых моделей для команды ${teamId}:`, error);
    throw error;
  }
}
