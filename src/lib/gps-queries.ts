// Оптимизированные запросы к БД для GPS системы

import { db } from './db';
import { 
  gpsReport, 
  gpsReportData, 
  gpsVisualizationProfile, 
  gpsProfileColumn, 
  gpsCanonicalMetric,
  playerGameModel,
  training,
  trainingCategory,
  match,
  team,
  player
} from '@/db/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { dbCache, gpsCacheKeys, invalidateGpsCache } from './db-cache';

// Экспортируем invalidateGpsCache для использования в других файлах
export { invalidateGpsCache };

// Оптимизированный запрос для получения канонических метрик
export async function getCanonicalMetrics(cacheKey: string, isAll: boolean = false): Promise<any[]> {
  // Проверяем кэш
  const cached = dbCache.get<any[]>(cacheKey);
  if (cached) return cached;

  const query = db
    .select({
      id: gpsCanonicalMetric.id,
      code: gpsCanonicalMetric.code,
      name: gpsCanonicalMetric.name,
      description: gpsCanonicalMetric.description,
      category: gpsCanonicalMetric.category,
      dimension: gpsCanonicalMetric.dimension,
      canonicalUnit: gpsCanonicalMetric.canonicalUnit,
      supportedUnits: gpsCanonicalMetric.supportedUnits,
      isDerived: gpsCanonicalMetric.isDerived,
      formula: gpsCanonicalMetric.formula,
    })
    .from(gpsCanonicalMetric)
    .where(eq(gpsCanonicalMetric.isActive, true));

  const result = await query;
  
  // Кэшируем результат
  dbCache.set(cacheKey, result, 10 * 60 * 1000); // 10 минут
  
  return result;
}

// Оптимизированный запрос для получения профилей визуализации
export async function getVisualizationProfiles(cacheKey: string, clubId: string): Promise<any[]> {
  const cached = dbCache.get<any[]>(cacheKey);
  if (cached) return cached;

  const result = await db
    .select()
    .from(gpsVisualizationProfile)
    .where(eq(gpsVisualizationProfile.clubId, clubId));

  dbCache.set(cacheKey, result, 5 * 60 * 1000); // 5 минут
  return result;
}

// Оптимизированный запрос для получения профиля с колонками
export async function getProfileWithColumns(cacheKey: string, profileId: string, clubId: string) {
  const cached = dbCache.get(cacheKey);
  if (cached) return cached;

  // Получаем профиль
  const [profile] = await db
    .select()
    .from(gpsVisualizationProfile)
    .where(
      and(
        eq(gpsVisualizationProfile.id, profileId),
        eq(gpsVisualizationProfile.clubId, clubId)
      )
    );

  if (!profile) return null;

  // Получаем колонки профиля с информацией о канонических метриках
  const columns = await db
    .select({
      id: gpsProfileColumn.id,
      canonicalMetricId: gpsProfileColumn.canonicalMetricId,
      canonicalMetricCode: gpsCanonicalMetric.code,
      canonicalMetricName: gpsCanonicalMetric.name,
      displayName: gpsProfileColumn.displayName,
      displayUnit: gpsProfileColumn.displayUnit,
      displayOrder: gpsProfileColumn.displayOrder,
    })
    .from(gpsProfileColumn)
    .leftJoin(
      gpsCanonicalMetric,
      eq(gpsProfileColumn.canonicalMetricId, gpsCanonicalMetric.id)
    )
    .where(eq(gpsProfileColumn.profileId, profileId))
    .orderBy(gpsProfileColumn.displayOrder);

  const result = { profile, columns };
  dbCache.set(cacheKey, result, 5 * 60 * 1000);
  return result;
}

// Оптимизированный запрос для получения отчета с данными
export async function getReportWithData(cacheKey: string, reportId: string, clubId: string) {
  const cached = dbCache.get(cacheKey);
  if (cached) return cached;

  // Получаем отчет
  const [report] = await db
    .select({
      id: gpsReport.id,
      name: gpsReport.name,
      fileName: gpsReport.fileName,
      gpsSystem: gpsReport.gpsSystem,
      eventType: gpsReport.eventType,
      teamId: gpsReport.teamId,
      teamName: team.name,
      eventId: gpsReport.eventId,
      playersCount: gpsReport.playersCount,
      createdAt: gpsReport.createdAt,
    })
    .from(gpsReport)
    .leftJoin(team, eq(gpsReport.teamId, team.id))
    .where(
      and(
        eq(gpsReport.id, reportId),
        eq(gpsReport.clubId, clubId)
      )
    );

  if (!report) return null;

  // Получаем данные отчета
  const reportData = await db
    .select()
    .from(gpsReportData)
    .where(eq(gpsReportData.gpsReportId, reportId));

  const result = { report, reportData };
  dbCache.set(cacheKey, result, 2 * 60 * 1000); // 2 минуты
  return result;
}

// Оптимизированный запрос для получения командных средних
export async function getTeamAverages(
  cacheKey: string, 
  reportId: string, 
  profileId: string, 
  clubId: string
) {
  const cached = dbCache.get(cacheKey);
  if (cached) return cached;

  // Получаем профиль с колонками
  const profileData = await getProfileWithColumns(
    gpsCacheKeys.profile(profileId, clubId),
    profileId,
    clubId
  );

  if (!profileData) return null;

  // Получаем данные отчета
  const reportData = await getReportWithData(
    gpsCacheKeys.reportData(reportId, clubId),
    reportId,
    clubId
  );

  if (!reportData) return null;

  // Вычисляем средние значения
  const averages = profileData.columns.map(column => {
    const values = reportData.reportData
      .filter(row => row.canonicalMetricCode === column.canonicalMetricCode)
      .map(row => parseFloat(row.value) || 0);

    const average = values.length > 0 
      ? values.reduce((sum, val) => sum + val, 0) / values.length 
      : 0;

    return {
      metricCode: column.canonicalMetricCode,
      metricName: column.canonicalMetricName,
      displayName: column.displayName,
      displayUnit: column.displayUnit,
      average,
      count: values.length
    };
  });

  const result = {
    report: reportData.report,
    averages,
    totalPlayers: reportData.report.playersCount
  };

  dbCache.set(cacheKey, result, 2 * 60 * 1000);
  return result;
}

// Оптимизированный запрос для получения игровых моделей
export async function getPlayerGameModels(
  cacheKey: string,
  reportId: string,
  profileId: string,
  clubId: string
) {
  const cached = dbCache.get(cacheKey);
  if (cached) return cached;

  // Получаем профиль с колонками
  const profileData = await getProfileWithColumns(
    gpsCacheKeys.profile(profileId, clubId),
    profileId,
    clubId
  );

  if (!profileData) return null;

  // Получаем данные отчета
  const reportData = await getReportWithData(
    gpsCacheKeys.reportData(reportId, clubId),
    reportId,
    clubId
  );

  if (!reportData) return null;

  // Получаем информацию об игроках
  const players = await db
    .select({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
    })
    .from(player)
    .where(eq(player.teamId, reportData.report.teamId));

  // Группируем данные по игрокам
  const playerData = players.map(player => {
    const playerMetrics = reportData.reportData
      .filter(row => row.playerId === player.id)
      .reduce((acc, row) => {
        acc[row.canonicalMetricCode] = parseFloat(row.value) || 0;
        return acc;
      }, {} as Record<string, number>);

    return {
      ...player,
      metrics: playerMetrics
    };
  });

  const result = {
    report: reportData.report,
    players: playerData,
    profileColumns: profileData.columns
  };

  dbCache.set(cacheKey, result, 2 * 60 * 1000);
  return result;
}

// Оптимизированный запрос для получения событий
export async function getEvents(cacheKey: string, teamId: string, clubId: string) {
  const cached = dbCache.get(cacheKey);
  if (cached) return cached;

  // Получаем существующие GPS отчеты
  const existingReports = await db
    .select({
      eventId: gpsReport.eventId,
      eventType: gpsReport.eventType,
    })
    .from(gpsReport)
    .where(eq(gpsReport.teamId, teamId));

  const existingEventIds = new Set(
    existingReports.map(r => `${r.eventType}:${r.eventId}`)
  );

  // Получаем тренировки
  const trainings = await db
    .select({
      id: training.id,
      name: training.title,
      date: training.date,
      type: sql<string>`'training'`,
    })
    .from(training)
    .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
    .where(
      and(
        eq(training.teamId, teamId),
        eq(training.status, 'completed')
      )
    )
    .orderBy(desc(training.date));

  // Получаем матчи
  const matches = await db
    .select({
      id: match.id,
      name: sql<string>`${match.opponentName} || ' (' || ${match.date} || ')'`,
      date: match.date,
      type: sql<string>`'match'`,
    })
    .from(match)
    .where(
      and(
        eq(match.teamId, teamId),
        eq(match.status, 'completed')
      )
    )
    .orderBy(desc(match.date));

  // Фильтруем события без GPS отчетов
  const events = [
    ...trainings.filter(t => !existingEventIds.has(`training:${t.id}`)),
    ...matches.filter(m => !existingEventIds.has(`match:${m.id}`))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const result = { events };
  dbCache.set(cacheKey, result, 5 * 60 * 1000);
  return result;
}

// Оптимизированный запрос для получения игроков команды
export async function getTeamPlayers(cacheKey: string, teamId: string, clubId: string) {
  const cached = dbCache.get(cacheKey);
  if (cached) return cached;

  const players = await db
    .select({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      jerseyNumber: player.jerseyNumber,
    })
    .from(player)
    .where(eq(player.teamId, teamId))
    .orderBy(player.firstName, player.lastName);

  const result = { players };
  dbCache.set(cacheKey, result, 10 * 60 * 1000); // 10 минут
  return result;
}
