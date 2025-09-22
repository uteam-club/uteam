import { db } from './db';
import { playerGameModel, player, gpsReport, gpsReportData, match } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

// Список усредняемых метрик (48 метрик) + duration для расчета времени игры
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
  'impacts_count',
  'duration' // Добавляем duration для расчета времени игры
];

// Функция расчета игровой модели игрока
export async function calculatePlayerGameModel(playerId: string, clubId: string) {
  try {
    console.log(`🔍 Расчет игровой модели для игрока ${playerId}...`);
    
    // Получаем данные игрока
    const [playerData] = await db
      .select()
      .from(player)
      .where(eq(player.id, playerId));

    if (!playerData) {
      console.log(`❌ Игрок ${playerId} не найден`);
      return null;
    }
    
    console.log(`👤 Игрок найден: ${playerData.firstName} ${playerData.lastName}, команда: ${playerData.teamId}`);

    // Получаем последние 10 матчей команды игрока
    const teamMatches = await db
      .select({
        id: match.id,
        teamId: match.teamId
      })
      .from(match)
      .where(eq(match.teamId, playerData.teamId))
      .orderBy(desc(match.date))
      .limit(10);

    console.log(`🏆 Найдено матчей команды: ${teamMatches.length}`);
    
    if (teamMatches.length === 0) {
      console.log(`❌ Нет матчей для команды ${playerData.teamId}`);
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
        inArray(gpsReport.eventId, matchIds),
        eq(gpsReport.clubId, clubId)
      ))
      .orderBy(desc(gpsReport.createdAt));

    console.log(`📊 Найдено GPS отчетов: ${gpsReports.length}`);
    
    if (gpsReports.length === 0) {
      console.log(`❌ Нет GPS отчетов для матчей команды`);
      return null;
    }

    const reportIds = gpsReports.map(r => r.id);

    // Получаем данные игрока из GPS отчетов
    const playerReportData = await db
      .select({
        canonicalMetric: gpsReportData.canonicalMetric,
        value: gpsReportData.value,
        reportId: gpsReportData.gpsReportId,
        eventId: gpsReport.eventId
      })
      .from(gpsReportData)
      .leftJoin(gpsReport, eq(gpsReportData.gpsReportId, gpsReport.id))
      .where(and(
        eq(gpsReportData.playerId, playerId),
        inArray(gpsReportData.gpsReportId, reportIds),
        inArray(gpsReportData.canonicalMetric, AVERAGEABLE_METRICS)
      ));

    console.log(`📈 Найдено записей данных игрока: ${playerReportData.length}`);
    
    if (playerReportData.length === 0) {
      console.log(`❌ Нет данных GPS для игрока ${playerId}`);
      return null;
    }

    // Группируем данные по матчам
    const matchData = new Map();
    playerReportData.forEach(row => {
      if (!matchData.has(row.eventId)) {
        matchData.set(row.eventId, {});
      }
      const matchMetrics = matchData.get(row.eventId);
      matchMetrics[row.canonicalMetric] = parseFloat(row.value) || 0;
    });

    // Фильтруем матчи где игрок играл 60+ минут
    const validMatches: Array<{ eventId: string; metrics: Record<string, number>; duration: number }> = [];
    for (const [eventId, metrics] of matchData) {
      const duration = metrics.duration || 0;
      if (duration >= 3600) { // 60 минут в секундах
        validMatches.push({ eventId, metrics, duration });
      }
    }

    if (validMatches.length === 0) {
      return null;
    }

    // Рассчитываем средние метрики (нормализованные к 90 минутам)
    const averageMetrics: Record<string, number> = {};
    const metricKeys = Object.keys(validMatches[0].metrics);
    
    metricKeys.forEach(metric => {
      if (metric === 'duration') return; // Пропускаем duration
      
      let totalValue = 0;
      let validCount = 0;
      
      validMatches.forEach(({ metrics, duration }) => {
        const value = metrics[metric] || 0;
        if (value > 0) {
          // Нормализация к 90 минутам
          const normalizedValue = (value / (duration / 60)) * 90;
          totalValue += normalizedValue;
          validCount++;
        }
      });
      
      if (validCount > 0) {
        averageMetrics[metric] = totalValue / validCount;
      }
    });

    // Сохраняем игровую модель
    const totalMinutes = validMatches.reduce((sum, { duration }) => sum + (duration / 60), 0);
    const matchIdsUsed = validMatches.map(({ eventId }) => eventId);

    const [savedModel] = await db
      .insert(playerGameModel)
      .values({
        playerId,
        clubId,
        matchesCount: validMatches.length,
        totalMinutes: Math.round(totalMinutes),
        metrics: averageMetrics,
        matchIds: matchIdsUsed,
        version: 1
      })
      .onConflictDoUpdate({
        target: [playerGameModel.playerId, playerGameModel.clubId],
        set: {
          matchesCount: validMatches.length,
          totalMinutes: Math.round(totalMinutes),
          metrics: averageMetrics,
          matchIds: matchIdsUsed,
          calculatedAt: new Date(),
          updatedAt: new Date()
        }
      })
      .returning();

    return savedModel;

  } catch (error) {
    console.error('Error calculating player game model:', error);
    return null;
  }
}

// Функция для автоматического расчета моделей для всех игроков команды
export async function autoCalculateGameModelsForTeam(teamId: string, clubId: string) {
  try {
    console.log(`🔄 Автоматический расчет игровых моделей для команды ${teamId}...`);

    // Получаем всех игроков команды
    const teamPlayers = await db
      .select({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName
      })
      .from(player)
      .where(eq(player.teamId, teamId));

    console.log(`📊 Найдено игроков в команде: ${teamPlayers.length}`);

    let successCount = 0;
    let errorCount = 0;

    // Рассчитываем модели для каждого игрока
    for (const player of teamPlayers) {
      try {
        const gameModel = await calculatePlayerGameModel(player.id, clubId);
        if (gameModel) {
          console.log(`✅ Модель рассчитана для ${player.firstName} ${player.lastName}: ${gameModel.matchesCount} матчей`);
          successCount++;
        } else {
          console.log(`⚠️ Недостаточно данных для ${player.firstName} ${player.lastName}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Ошибка для ${player.firstName} ${player.lastName}:`, error);
        errorCount++;
      }
    }

    console.log(`🎉 Расчет завершен: ${successCount} успешно, ${errorCount} ошибок`);
    return { successCount, errorCount, totalPlayers: teamPlayers.length };

  } catch (error) {
    console.error('Error in autoCalculateGameModelsForTeam:', error);
    return { successCount: 0, errorCount: 0, totalPlayers: 0 };
  }
}
