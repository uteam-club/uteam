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
import { player } from '@/db/schema/player';
import { trainingCategory } from '@/db/schema/trainingCategory';
import { playerGameModel } from '@/db/schema/playerGameModel';
import { eq, and, sql, desc, inArray, count } from 'drizzle-orm';
import { convertUnit } from '@/lib/unit-converter';
import { canAccessGpsReport } from '@/lib/gps-permissions';
import { invalidateRelatedCache } from '@/lib/gps-cache';
import {
  validateRequiredFields,
  validateGpsData,
  sanitizeObject,
  validateFile,
  isValidId
} from '@/lib/validation';
// GPS_CONSTANTS removed - using direct values
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
    console.log('🔍 GPS API: Начало обработки запроса');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ GPS API: Пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ GPS API: Пользователь авторизован:', session.user.id);

    // Проверяем разрешение на создание GPS отчетов
    const canCreate = await canAccessGpsReport(
      session.user.id,
      session.user.clubId || 'default-club',
      null,
      'edit'
    );

    if (!canCreate) {
      console.log('❌ GPS API: Нет прав на создание отчетов');
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'У вас нет прав для создания GPS отчетов' 
      }, { status: 403 });
    }

    console.log('✅ GPS API: Права на создание отчетов подтверждены');

    // Получаем канонические метрики
    const canonicalMetrics = await db.select().from(gpsCanonicalMetric);
    console.log('✅ GPS API: Загружено канонических метрик:', canonicalMetrics.length);
    
    const startTime = Date.now();
    
    // Используем стандартный парсинг FormData
    const formData = await request.formData();
    const formDataTime = Date.now() - startTime;
    console.log('✅ GPS API: FormData распарсен за', formDataTime, 'мс');
    
    // Валидация обязательных полей
    const requiredFields = ['teamId', 'eventType', 'eventId', 'parsedData', 'columnMappings', 'playerMappings'];
    const formDataObj = Object.fromEntries(formData.entries());
    
    console.log('🔍 GPS API: Проверка обязательных полей:', requiredFields);
    console.log('🔍 GPS API: Найденные поля:', Object.keys(formDataObj));
    
    if (!validateRequiredFields(formDataObj, requiredFields)) {
      const missingFields = requiredFields.filter(field => !formDataObj[field]);
      console.log('❌ GPS API: Отсутствуют поля:', missingFields);
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          message: 'Отсутствуют обязательные поля',
          missingFields 
        },
        { status: 400 }
      );
    }
    
    console.log('✅ GPS API: Все обязательные поля присутствуют');
    
    // Валидация ID
    const teamId = formData.get('teamId') as string;
    const eventId = formData.get('eventId') as string;
    
    console.log('🔍 GPS API: Проверка ID - teamId:', teamId, 'eventId:', eventId);
    
    if (!isValidId(teamId) || !isValidId(eventId)) {
      console.log('❌ GPS API: Некорректный формат ID');
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Некорректный формат ID' },
        { status: 400 }
      );
    }
    
    console.log('✅ GPS API: ID валидны');
    
    const eventType = formData.get('eventType') as string;
    const gpsSystem = formData.get('gpsSystem') as string;
    const profileId = formData.get('profileId') as string;
    
    console.log('🔍 GPS API: Парсинг JSON данных...');
    
    // Безопасный парсинг JSON с детальными ошибками
    let columnMappings, playerMappings, parsedData;
    
    try {
      const columnMappingsStr = formData.get('columnMappings') as string;
      console.log('🔍 GPS API: columnMappings строка:', columnMappingsStr?.substring(0, 100) + '...');
      columnMappings = sanitizeObject(JSON.parse(columnMappingsStr));
      console.log('✅ GPS API: columnMappings распарсен, элементов:', columnMappings?.length);
    } catch (error) {
      console.log('❌ GPS API: Ошибка парсинга columnMappings:', error);
      return NextResponse.json(
        { error: 'Invalid columnMappings JSON', message: 'Некорректный JSON для маппинга колонок' },
        { status: 400 }
      );
    }
    
    try {
      const playerMappingsStr = formData.get('playerMappings') as string;
      console.log('🔍 GPS API: playerMappings строка:', playerMappingsStr?.substring(0, 100) + '...');
      playerMappings = sanitizeObject(JSON.parse(playerMappingsStr));
      console.log('✅ GPS API: playerMappings распарсен, элементов:', playerMappings?.length);
    } catch (error) {
      console.log('❌ GPS API: Ошибка парсинга playerMappings:', error);
      return NextResponse.json(
        { error: 'Invalid playerMappings JSON', message: 'Некорректный JSON для маппинга игроков' },
        { status: 400 }
      );
    }
    
    try {
      const parsedDataStr = formData.get('parsedData') as string;
      console.log('🔍 GPS API: parsedData строка:', parsedDataStr?.substring(0, 100) + '...');
      parsedData = sanitizeObject(JSON.parse(parsedDataStr));
      console.log('✅ GPS API: parsedData распарсен, строк:', parsedData?.rows?.length);
    } catch (error) {
      console.log('❌ GPS API: Ошибка парсинга parsedData:', error);
      return NextResponse.json(
        { error: 'Invalid parsedData JSON', message: 'Некорректный JSON для GPS данных' },
        { status: 400 }
      );
    }
    
    // Валидация parsedData
    if (!validateGpsData(parsedData)) {
      console.log('❌ GPS API: Некорректный формат GPS данных');
      return NextResponse.json(
        { error: 'Invalid GPS data format', message: 'Некорректный формат GPS данных' },
        { status: 400 }
      );
    }
    
    console.log('✅ GPS API: GPS данные валидны');
    
    // Получаем файл из FormData
    const file = formData.get('file') as File;
    const fileName = file?.name || 'unknown_file';
    
    console.log('🔍 GPS API: Файл:', fileName, 'размер:', file?.size);
    console.log('🔍 GPS API: MIME-тип файла:', file?.type);
    console.log('🔍 GPS API: Расширение файла:', fileName?.split('.').pop());
    
    // Валидация файла
    if (file) {
      const fileValidation = validateFile(file, 10, ['.csv', '.xlsx', '.xls']);
      if (!fileValidation.valid) {
        console.log('❌ GPS API: Ошибка валидации файла:', fileValidation.error);
        return NextResponse.json(
          { error: 'File validation failed', message: fileValidation.error },
          { status: 400 }
        );
      }
    }
    
    console.log('✅ GPS API: Файл валиден');
    
    // Проверяем, что данные корректны
    if (!Array.isArray(columnMappings)) {
      console.log('❌ GPS API: columnMappings не является массивом');
      throw new Error('columnMappings must be an array');
    }
    if (!Array.isArray(playerMappings)) {
      console.log('❌ GPS API: playerMappings не является массивом');
      throw new Error('playerMappings must be an array');
    }
    if (!parsedData || !parsedData.rows || !Array.isArray(parsedData.rows)) {
      console.log('❌ GPS API: parsedData не содержит rows массив');
      throw new Error('parsedData must contain rows array');
    }
    
    console.log('✅ GPS API: Все данные валидны, создаем отчет...');

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
        fileSize: file?.size || 0,
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
      console.log('🔄 Запуск расчета игровых моделей для команды:', teamId);
      
      // Используем модуль для расчета игровых моделей
      const { calculateGameModelsForTeam } = await import('@/lib/game-model-calculator');
      await calculateGameModelsForTeam(teamId, session.user.clubId || 'default-club');
      
      console.log('✅ Игровые модели рассчитаны');
    } catch (error) {
      console.error('⚠️ Ошибка при автоматическом расчете игровых моделей:', error);
      // Не прерываем выполнение, так как отчет уже создан
    }

    // Инвалидируем кэш после создания отчета
    invalidateRelatedCache('gps-report', newReport.id);
    
    console.log('✅ GPS API: Отчет создан с ID:', newReport.id);
    console.log('✅ GPS API: Запрос успешно обработан');
    
    return NextResponse.json({ 
      success: true, 
      gpsReportId: newReport.id,
      message: 'GPS отчет успешно создан' 
    }, { status: 201 });

  } catch (error) {
    console.error('❌ GPS API: Критическая ошибка:', error);
    const errorResponse = ApiErrorHandler.createErrorResponse(error, 'POST GPS report');
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
  }
}