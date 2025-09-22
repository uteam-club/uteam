import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { gpsReport } from '@/db/schema/gpsReport';
import { player } from '@/db/schema/player';
import { gpsVisualizationProfile } from '@/db/schema/gpsColumnMapping';
import { gpsProfileColumn } from '@/db/schema/gpsColumnMapping';
import { gpsCanonicalMetric } from '@/db/schema/gpsCanonicalMetric';
import { training } from '@/db/schema/training';
import { trainingCategory } from '@/db/schema/trainingCategory';
import { match } from '@/db/schema/match';
import { team } from '@/db/schema/team';
import { eq, inArray, and } from 'drizzle-orm';
import { convertUnit, formatValue, getPrecision } from '@/lib/unit-converter';

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

    // Загружаем профиль визуализации
    const [profile] = await db
      .select()
      .from(gpsVisualizationProfile)
      .where(
        and(
          eq(gpsVisualizationProfile.id, profileId),
          eq(gpsVisualizationProfile.clubId, session.user.clubId || 'default-club')
        )
      );

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Получаем колонки профиля с информацией о канонических метриках
    const profileColumns = await db
      .select({
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
      .where(eq(gpsProfileColumn.profileId, profileId))
      .orderBy(gpsProfileColumn.displayOrder);


    // Получаем данные отчета
    const reportData = await db.select()
      .from(gpsReportData)
      .where(eq(gpsReportData.gpsReportId, reportId));

    
    // Проверяем, какие метрики есть в данных
    const availableMetrics = [...new Set(reportData.map(item => item.canonicalMetric))];
    
    // Проверяем, есть ли position и duration
    const hasPosition = reportData.some(item => item.canonicalMetric === 'position');
    const hasDuration = reportData.some(item => item.canonicalMetric === 'duration');

    // Получаем информацию об отчете
    const [report] = await db.select()
      .from(gpsReport)
      .where(eq(gpsReport.id, reportId));

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }


    // Получаем информацию о событии (тренировке или матче)
    let eventInfo = null;
    
    try {
      if (report.eventType === 'training') {
        const [trainingData] = await db.select({
          id: training.id,
          title: training.title,
          date: training.date,
          time: training.time,
          categoryId: training.categoryId,
          categoryName: trainingCategory.name,
          type: training.type,
        })
        .from(training)
        .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
        .where(eq(training.id, report.eventId));
        
        eventInfo = trainingData;
      } else if (report.eventType === 'match') {
        const [matchData] = await db.select({
          id: match.id,
          date: match.date,
          time: match.time,
          competitionType: match.competitionType,
          isHome: match.isHome,
          teamGoals: match.teamGoals,
          opponentGoals: match.opponentGoals,
          opponentName: match.opponentName,
          teamName: team.name,
        })
        .from(match)
        .leftJoin(team, eq(match.teamId, team.id))
        .where(eq(match.id, report.eventId));
        
        eventInfo = matchData;
      }
    } catch (error) {
      console.error('Error loading event info:', error);
      // Продолжаем без информации о событии
    }

    // Если нет данных, возвращаем пустой массив
    if (reportData.length === 0) {
      return NextResponse.json({
        report: {
          id: report.id,
          name: report.name,
          fileName: report.fileName,
          gpsSystem: report.gpsSystem,
          eventType: report.eventType,
          isProcessed: report.isProcessed,
          playersCount: report.playersCount,
          createdAt: report.createdAt,
        },
        data: [],
      });
    }

    // Получаем уникальные ID игроков
    const playerIds = [...new Set(reportData.map(item => item.playerId))];
    
    
    // Создаем мапу игроков
    const playerMap = new Map();
    
    if (playerIds.length > 0) {
      // Получаем информацию об игроках
      const players = await db.select({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
      }).from(player).where(inArray(player.id, playerIds));
      
      
      for (const p of players) {
        playerMap.set(p.id, `${p.firstName} ${p.lastName}`);
      }
    }
    
    // Создаем мапу для быстрого поиска колонок профиля по коду метрики
    const profileColumnsMap = new Map();
    for (const col of profileColumns) {
      if (col.canonicalMetricCode) {
        profileColumnsMap.set(col.canonicalMetricCode, col);
      }
    }

    // Группируем данные по игрокам
    const playersData = new Map();
    
    for (const item of reportData) {
      const playerId = item.playerId;
      
      if (!playersData.has(playerId)) {
        playersData.set(playerId, {
          id: `player-${playerId}`,
          playerId: playerId,
          playerName: playerMap.get(playerId) || `Player ${playerId.slice(-4)}`,
          playerData: {},
          isEdited: false, // TODO: определить из истории изменений
          lastEditedAt: null, // TODO: получить из истории изменений
        });
      }
      
      // Находим соответствующую колонку профиля
      const profileColumn = profileColumnsMap.get(item.canonicalMetric);
      
      if (profileColumn) {
        // Специальная обработка для строковых метрик (athlete_name, position)
        if (profileColumn.canonicalMetricCode === 'athlete_name' || profileColumn.canonicalMetricCode === 'position') {
          // Для строковых метрик не конвертируем, просто сохраняем как есть
          playersData.get(playerId).playerData[profileColumn.canonicalMetricCode] = {
            value: item.value, // Сохраняем как строку
            unit: profileColumn.displayUnit,
            displayName: profileColumn.displayName,
            displayOrder: profileColumn.displayOrder,
            isVisible: profileColumn.isVisible,
            canonicalMetric: item.canonicalMetric,
          };
        } else {
          // Конвертируем значение в единицы измерения профиля
          let convertedValue = parseFloat(item.value);
          let displayUnit = profileColumn.displayUnit;
          
          // Если единицы измерения отличаются, конвертируем
          if (item.unit !== displayUnit) {
            const converted = convertUnit(convertedValue, item.unit, displayUnit);
            if (typeof converted === 'number' && !isNaN(converted)) {
              convertedValue = converted;
            } else {
              console.warn(`Failed to convert ${item.canonicalMetric} from ${item.unit} to ${displayUnit}`);
              // Используем исходное значение, если конвертация не удалась
              displayUnit = item.unit;
            }
          }
          
          // Добавляем метрику к данным игрока по canonicalMetricCode для правильного поиска
          playersData.get(playerId).playerData[profileColumn.canonicalMetricCode] = {
            value: convertedValue,
            unit: displayUnit,
            displayName: profileColumn.displayName,
            displayOrder: profileColumn.displayOrder,
            isVisible: profileColumn.isVisible,
            canonicalMetric: item.canonicalMetric, // Сохраняем оригинальный код для совместимости
          };
        }
      } else {
        // Если метрика не найдена в профиле, добавляем как есть
        playersData.get(playerId).playerData[item.canonicalMetric] = {
          value: parseFloat(item.value),
          unit: item.unit,
          displayName: item.canonicalMetric,
          displayOrder: 999, // Низкий приоритет для неизвестных метрик
          isVisible: false, // Скрываем неизвестные метрики
          canonicalMetric: item.canonicalMetric,
        };
      }
    }

    // Преобразуем Map в массив
    const visualizationData = Array.from(playersData.values());


    return NextResponse.json({
      report: {
        id: report.id,
        name: report.name,
        fileName: report.fileName,
        gpsSystem: report.gpsSystem,
        eventType: report.eventType,
        isProcessed: report.isProcessed,
        playersCount: report.playersCount,
        createdAt: report.createdAt,
      },
      event: eventInfo,
      profile: {
        id: profile.id,
        name: profile.name,
        description: profile.description,
        columns: profileColumns.map(col => ({
          id: col.id,
          canonicalMetricId: col.canonicalMetricId,
          canonicalMetricCode: col.canonicalMetricCode,
          canonicalMetricName: col.canonicalMetricName,
          displayName: col.displayName,
          displayUnit: col.displayUnit,
          displayOrder: col.displayOrder,
          isVisible: col.isVisible,
        }))
      },
      data: visualizationData,
    });

  } catch (error) {
    console.error('Error fetching report visualization data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
