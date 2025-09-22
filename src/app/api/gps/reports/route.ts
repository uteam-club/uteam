import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema/gpsReport';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { gpsCanonicalMetric } from '@/db/schema/gpsCanonicalMetric';
import { team } from '@/db/schema/team';
import { training } from '@/db/schema/training';
import { match } from '@/db/schema/match';
import { trainingCategory } from '@/db/schema/trainingCategory';
import { playerGameModel } from '@/db/schema/playerGameModel';
import { eq, and, sql, desc, inArray, count } from 'drizzle-orm';
import { convertUnit } from '@/lib/unit-converter';
import { canAccessGpsReport } from '@/lib/gps-permissions';
import {
  validateRequiredFields,
  validateGpsData,
  sanitizeObject,
  validateFile,
  isValidId
} from '@/lib/validation';
import { GPS_CONSTANTS } from '@/lib/gps-constants';
import { ApiErrorHandler } from '@/lib/api-error-handler';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/pagination';
import { withApiCache } from '@/lib/api-cache-middleware';

export async function GET(request: NextRequest) {
  return withApiCache(request, async () => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Проверяем разрешение на просмотр GPS отчетов
      const canView = await canAccessGpsReport(
        session.user.id,
        session.user.clubId || 'default-club',
        null,
        'view'
      );

      if (!canView) {
        return NextResponse.json({
          error: 'Forbidden',
          message: 'У вас нет прав для просмотра GPS отчетов'
        }, { status: 403 });
      }

      // Парсим параметры пагинации
      const pagination = parsePaginationParams(request);

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const eventType = searchParams.get('eventType');
    const eventId = searchParams.get('eventId');

    // Строим условия фильтрации
    const conditions = [
      eq(gpsReport.clubId, session.user.clubId || 'default-club')
    ];

    if (teamId) {
      conditions.push(eq(gpsReport.teamId, teamId));
    }

    if (eventType) {
      conditions.push(eq(gpsReport.eventType, eventType as 'training' | 'match'));
    }

    if (eventId) {
      conditions.push(eq(gpsReport.eventId, eventId));
    }

    // Получаем отчеты с информацией о команде, тренировках и матчах
    const reports = await db
      .select({
        id: gpsReport.id,
        name: gpsReport.name,
        fileName: gpsReport.fileName,
        fileSize: gpsReport.fileSize,
        gpsSystem: gpsReport.gpsSystem,
        eventType: gpsReport.eventType,
        eventId: gpsReport.eventId,
        teamId: gpsReport.teamId,
        isProcessed: gpsReport.isProcessed,
        hasEdits: gpsReport.hasEdits,
        playersCount: gpsReport.playersCount,
        status: gpsReport.status,
        createdAt: gpsReport.createdAt,
        updatedAt: gpsReport.updatedAt,
        teamName: team.name,
        // Информация о тренировке
        trainingTitle: training.title,
        trainingType: training.type,
        trainingDate: training.date,
        trainingTime: training.time,
        trainingCategoryName: trainingCategory.name,
        // Информация о матче
        matchCompetitionType: match.competitionType,
        matchDate: match.date,
        matchTime: match.time,
        matchIsHome: match.isHome,
        matchOpponentName: match.opponentName,
        matchTeamGoals: match.teamGoals,
        matchOpponentGoals: match.opponentGoals,
      })
      .from(gpsReport)
      .leftJoin(team, eq(gpsReport.teamId, team.id))
      .leftJoin(training, eq(gpsReport.eventId, training.id))
      .leftJoin(match, eq(gpsReport.eventId, match.id))
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(and(...conditions))
      .orderBy(desc(gpsReport.createdAt));

    return NextResponse.json({ 
      success: true, 
      reports: reports.map(report => ({
        ...report,
        createdAt: report.createdAt?.toISOString(),
        updatedAt: report.updatedAt?.toISOString(),
        // Маппинг данных для тренировок
        trainingName: report.trainingTitle,
        trainingCategory: report.trainingCategoryName,
        trainingType: report.trainingType === 'TRAINING' ? 'training' : 'gym',
        trainingDate: report.trainingDate && report.trainingTime 
          ? `${report.trainingDate}T${report.trainingTime}:00` 
          : undefined,
        // Маппинг данных для матчей
        homeTeamName: report.matchIsHome ? report.teamName : report.matchOpponentName,
        awayTeamName: report.matchIsHome ? report.matchOpponentName : report.teamName,
        homeScore: report.matchIsHome ? report.matchTeamGoals : report.matchOpponentGoals,
        awayScore: report.matchIsHome ? report.matchOpponentGoals : report.matchTeamGoals,
        competitionType: report.matchCompetitionType?.toLowerCase() as 'friendly' | 'league' | 'cup',
        matchDate: report.matchDate && report.matchTime 
          ? `${report.matchDate}T${report.matchTime}:00` 
          : undefined,
      }))
    });

    } catch (error) {
      const errorResponse = ApiErrorHandler.createErrorResponse(error, 'GET GPS reports');
      return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем разрешение на создание GPS отчетов
    const canCreate = await canAccessGpsReport(
      session.user.id,
      session.user.clubId || 'default-club',
      null,
      'edit'
    );

    if (!canCreate) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'У вас нет прав для создания GPS отчетов' 
      }, { status: 403 });
    }

    // Получаем канонические метрики
    const canonicalMetrics = await db.select().from(gpsCanonicalMetric);
    
    const startTime = Date.now();
    
    // Используем стандартный парсинг FormData
    const formData = await request.formData();
    const formDataTime = Date.now() - startTime;
    
    // Валидация обязательных полей
    const requiredFields = ['teamId', 'eventType', 'eventId', 'parsedData', 'columnMappings', 'playerMappings'];
    const formDataObj = Object.fromEntries(formData.entries());
    
    if (!validateRequiredFields(formDataObj, requiredFields)) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }
    
    // Валидация ID
    const teamId = formData.get('teamId') as string;
    const eventId = formData.get('eventId') as string;
    
    if (!isValidId(teamId) || !isValidId(eventId)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Некорректный формат ID' },
        { status: 400 }
      );
    }
    
    const eventType = formData.get('eventType') as string;
    const gpsSystem = formData.get('gpsSystem') as string;
    const profileId = formData.get('profileId') as string;
    const columnMappings = sanitizeObject(JSON.parse(formData.get('columnMappings') as string));
    const playerMappings = sanitizeObject(JSON.parse(formData.get('playerMappings') as string));
    const parsedData = sanitizeObject(JSON.parse(formData.get('parsedData') as string));
    
    // Валидация parsedData
    if (!validateGpsData(parsedData)) {
      return NextResponse.json(
        { error: 'Invalid GPS data format', message: 'Некорректный формат GPS данных' },
        { status: 400 }
      );
    }
    
    // Получаем файл из FormData
    const file = formData.get('file') as File;
    const fileName = file?.name || 'unknown_file';
    
    // Валидация файла
    if (file) {
      const fileValidation = validateFile(file, GPS_CONSTANTS.MAX_FILE_SIZE_MB, GPS_CONSTANTS.SUPPORTED_FILE_TYPES);
      if (!fileValidation.valid) {
        return NextResponse.json(
          { error: 'File validation failed', message: fileValidation.error },
          { status: 400 }
        );
      }
    }

    // Проверяем, что данные корректны
    if (!Array.isArray(columnMappings)) {
      throw new Error('columnMappings must be an array');
    }
    if (!Array.isArray(playerMappings)) {
      throw new Error('playerMappings must be an array');
    }
    if (!parsedData || !parsedData.rows || !Array.isArray(parsedData.rows)) {
      throw new Error('parsedData must contain rows array');
    }

    // Создаем отчет
    const [newReport] = await db.insert(gpsReport).values({
      name: `${eventType === 'training' ? 'Тренировка' : 'Матч'} ${new Date().toLocaleDateString('ru-RU')}`,
      fileName: fileName,
      fileSize: file?.size || 0,
      gpsSystem,
      eventType: eventType as 'training' | 'match',
      eventId,
      profileId: profileId && profileId !== 'null' ? profileId : null,
      fileUrl: 'local-file', // Временное значение, так как файл не загружается в облако
      rawData: null,
      processedData: null,
      filePath: null,
      importMeta: null,
      gpsProfileId: null,
      trainingId: eventType === 'training' ? eventId : null,
      matchId: eventType === 'match' ? eventId : null,
      ingestError: null,
      errorMessage: null,
      profileSnapshot: null,
      canonVersion: null,
      metadata: {
        originalFileName: fileName,
        fileSize: fileSize,
        uploadedAt: new Date().toISOString(),
        parsedData: parsedData.metadata,
      },
      isProcessed: true,
      status: 'processed',
      processedAt: new Date(),
      playersCount: parsedData.playerNames?.length || 0,
      hasEdits: false,
      clubId: session.user.clubId || 'default-club',
      teamId,
      uploadedById: session.user.id,
    }).returning();

    // Обрабатываем данные из файла
    const activeMappings = columnMappings.filter((mapping: any) => 
      mapping.isActive && mapping.canonicalMetricId && mapping.canonicalMetricId.trim() !== ''
    );

    // Создаем кэш канонических метрик для быстрого доступа
    const canonicalMetricsCache = new Map();
    canonicalMetrics.forEach(metric => {
      canonicalMetricsCache.set(metric.id, metric);
    });
    // Проверяем playerMappings

    if (!Array.isArray(playerMappings)) {
      throw new Error('playerMappings must be an array');
    }

    // Сохраняем данные для каждого игрока
    let processedPlayers = 0;
    let totalMetrics = 0;
    const allReportData: any[] = [];


    for (const player of playerMappings) {
      if (!player.playerId || player.similarity === 'not_found' || player.similarity === 'none') {
        continue;
      }
      

      const playerMetrics: Record<string, { value: number | string; unit: string }> = {};
      
      // Находим строку данных для игрока
      // Ищем колонку, которая сопоставлена с метрикой "Имя игрока"
      const playerNameMapping = activeMappings.find((m: any) => {
        // Получаем название метрики из базы данных
        const metric = canonicalMetrics.find(cm => cm.id === m.canonicalMetricId);
        return metric?.name === 'Имя игрока' || metric?.code === 'athlete_name';
      });
      
      let playerRow = null;
      if (playerNameMapping) {
        // Ищем строку по имени игрока в соответствующей колонке
        playerRow = parsedData.rows.find((r: any) => 
          r[playerNameMapping.originalName] === player.filePlayerName
        );
      }
      
      if (!playerRow) {
        continue;
      }


      // Обрабатываем каждую активную колонку
      for (const mapping of activeMappings as any[]) {
        // Проверяем обязательные поля маппинга
        if (!mapping.canonicalMetricId || !mapping.sourceUnit || !mapping.originalName) {
          continue;
        }
        
        if (!playerRow[mapping.originalName]) {
          continue;
        }

        // Проверяем, что значение не пустое
        if (playerRow[mapping.originalName] === null || playerRow[mapping.originalName] === undefined || playerRow[mapping.originalName] === '') {
          continue;
        }

        // Для времени в различных форматах и позиции передаем строку, для остальных - число
        let rawValue: number | string = playerRow[mapping.originalName];
        
        const timeFormats = ['hh:mm:ss', 'hh:mm', 'mm:ss', 'ss', 'hh.mm.ss', 'hh,mm,ss', 'hh mm ss', 'hh.mm', 'mm.ss', 'hh:mm:ss.fff', 'hh:mm:ss,fff'];
        
        if (!timeFormats.includes(mapping.sourceUnit) && mapping.sourceUnit !== 'string') {
          rawValue = parseFloat(String(rawValue));
          if (isNaN(rawValue)) {
            continue;
          }
        }

        // Получаем каноническую единицу измерения для метрики из кэша
        const canonicalMetric = canonicalMetricsCache.get(mapping.canonicalMetricId);
        if (!canonicalMetric) {
          continue;
        }

        // Проверяем, что canonicalMetric.code существует
        if (!canonicalMetric.code) {
          continue;
        }

        // Конвертируем значение в каноническую единицу
        let canonicalValue: number;
        try {
          // Список поддерживаемых форматов времени
          const timeFormats = ['hh:mm:ss', 'hh:mm', 'mm:ss', 'ss', 'hh.mm.ss', 'hh,mm,ss', 'hh mm ss', 'hh.mm', 'mm.ss', 'hh:mm:ss.fff', 'hh:mm:ss,fff'];
          
          if (timeFormats.includes(mapping.sourceUnit)) {
            // Специальная обработка для времени в различных форматах
            canonicalValue = Number(convertUnit(rawValue, mapping.sourceUnit, canonicalMetric.canonicalUnit));
            if (isNaN(canonicalValue)) {
              continue;
            }
          } else if (mapping.sourceUnit === 'string') {
            // Для строковых значений (позиция) сохраняем как есть
            // Не добавляем в playerMetrics, обработаем отдельно
            continue;
          } else {
            canonicalValue = Number(convertUnit(Number(rawValue), mapping.sourceUnit, canonicalMetric.canonicalUnit));
          }
        } catch (error) {
          continue;
        }
        
        // Проверяем, что конвертация прошла успешно
        if (isNaN(canonicalValue)) {
          continue;
        }
        
        playerMetrics[canonicalMetric.code] = {
          value: canonicalValue,
          unit: canonicalMetric.canonicalUnit
        };
        
      }

      // Обрабатываем строковые значения (позиция, имя игрока) отдельно
      for (const mapping of activeMappings) {
        const canonicalMetric = canonicalMetrics.find(cm => cm.id === mapping.canonicalMetricId);
        if (!canonicalMetric) continue;
        
        if (mapping.sourceUnit === 'string') {
          const rawValue = playerRow[mapping.originalName];
          if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
            playerMetrics[canonicalMetric.code] = {
              value: String(rawValue),
              unit: 'string'
            };
          }
        }
      }

      // Добавляем данные игрока в общий массив для batch insert
      for (const [metricCode, metricData] of Object.entries(playerMetrics)) {
        allReportData.push({
          gpsReportId: newReport.id,
          playerId: player.playerId,
          canonicalMetric: metricCode,
          value: metricData.value.toString(),
          unit: metricData.unit,
        });
        totalMetrics++;
      }
      
      processedPlayers++;
    }



    // Выполняем batch insert всех данных отчета
    if (allReportData.length > 0) {
      try {
        await db.insert(gpsReportData).values(allReportData);
      } catch (error) {
        console.error('GPS Report API: Error in batch insert:', error);
        throw error;
      }
    }

    const totalTime = Date.now() - startTime;
    
    // Автоматический расчет игровых моделей для команды
    try {
      
      // Получаем игроков из GPS данных
      const playerIds = [...new Set(allReportData.map(row => row.playerId))];
      
      if (playerIds.length > 0) {
        // Получаем матчи команды
        const teamMatches = await db
          .select({ id: match.id })
          .from(match)
          .where(eq(match.teamId, teamId))
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
      console.error('⚠️ Ошибка при автоматическом расчете игровых моделей:', error);
      // Не прерываем выполнение, так как отчет уже создан
    }
    
    return NextResponse.json({ 
      success: true, 
      gpsReportId: newReport.id,
      message: 'GPS отчет успешно создан' 
    });

  } catch (error) {
    const errorResponse = ApiErrorHandler.createErrorResponse(error, 'POST GPS report');
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
  }
}