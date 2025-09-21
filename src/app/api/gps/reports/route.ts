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
import { eq, and, sql, desc } from 'drizzle-orm';
import { convertUnit } from '@/lib/unit-converter';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('Error fetching GPS reports:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем канонические метрики
    const canonicalMetrics = await db.select().from(gpsCanonicalMetric);
    
    console.log('API: Getting formData...');
    const startTime = Date.now();
    
    // Используем ручной парсинг multipart для избежания блокировки
    const body = await request.text();
    const boundary = request.headers.get('content-type')?.split('boundary=')[1];
    
    if (!boundary) {
      throw new Error('No boundary found in content-type');
    }

    const parts = body.split(`--${boundary}`);
    const formData: Record<string, string> = {};
    let fileName = '';
    let fileSize = 0;

    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data')) {
        const nameMatch = part.match(/name="([^"]+)"/);
        const filenameMatch = part.match(/filename="([^"]+)"/);
        
        if (nameMatch) {
          const name = nameMatch[1];
          const value = part.split('\r\n\r\n')[1]?.split('\r\n')[0];
          
          if (filenameMatch) {
            fileName = filenameMatch[1];
            const fileStart = part.indexOf('\r\n\r\n') + 4;
            const fileEnd = part.lastIndexOf('\r\n');
            fileSize = fileEnd - fileStart;
          } else if (value) {
            formData[name] = value;
          }
        }
      }
    }

    const formDataTime = Date.now() - startTime;
    console.log(`API: FormData parsed in ${formDataTime}ms, processing...`);
    
    const teamId = formData.teamId;
    const eventType = formData.eventType;
    const eventId = formData.eventId;
    const gpsSystem = formData.gpsSystem;
    const profileId = formData.profileId;
    const columnMappings = JSON.parse(formData.columnMappings);
    const playerMappings = JSON.parse(formData.playerMappings);
    const parsedData = JSON.parse(formData.parsedData);
    
    console.log('API: Data parsed, starting processing...');
    console.log('API: Column mappings count:', columnMappings.length);
    console.log('API: Player mappings count:', playerMappings.length);
    console.log('API: Parsed data rows count:', parsedData.rows.length);

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
      fileSize: fileSize,
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

    console.log('API: Starting player processing...');
    console.log('API: Total players to process:', playerMappings.length);

    for (const player of playerMappings) {
      if (!player.playerId || player.similarity === 'not_found' || player.similarity === 'none') {
        console.log(`API: Skipping player ${player.filePlayerName} - no playerId or similarity: ${player.similarity}`);
        continue;
      }
      
      console.log(`API: Processing player ${player.filePlayerName}...`);

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
              console.log(`Failed to parse time: ${rawValue} with format: ${mapping.sourceUnit}`);
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
          console.log(`Error processing value: ${rawValue} with unit: ${mapping.sourceUnit}, error: ${error}`);
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
      console.log(`API: Player ${player.filePlayerName} processed with ${Object.keys(playerMetrics).length} metrics`);
    }

    console.log(`API: Processed ${processedPlayers} players with ${totalMetrics} total metrics`);


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
    console.log(`API: Report created successfully in ${totalTime}ms, returning response...`);
    
    return NextResponse.json({ 
      success: true, 
      gpsReportId: newReport.id,
      message: 'GPS отчет успешно создан' 
    });

  } catch (error) {
    console.error('Error creating GPS report:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}