import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gpsReport, gpsProfile, match, playerMapping, playerMatchStat, player, team } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

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

    // Проверяем, что игрок существует и получаем данные команды
    const [playerData] = await db
      .select({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        teamId: player.teamId
      })
      .from(player)
      .where(eq(player.id, playerId));

    if (!playerData) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    console.log('🔍 Данные игрока:', {
      id: playerData.id,
      firstName: playerData.firstName,
      lastName: playerData.lastName,
      teamId: playerData.teamId
    });

    // Получаем данные команды для получения clubId
    const [teamData] = await db
      .select({ clubId: team.clubId })
      .from(team)
      .where(eq(team.id, playerData.teamId));

    if (!teamData) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    console.log('🔍 Данные команды:', {
      teamId: playerData.teamId,
      clubId: teamData.clubId
    });

    // Получаем GPS профиль
    const [profile] = await db
      .select()
      .from(gpsProfile)
      .where(eq(gpsProfile.id, profileId));

    if (!profile) {
      return NextResponse.json({ error: 'GPS profile not found' }, { status: 404 });
    }

    // Проверяем, что у команды есть clubId
    if (!teamData.clubId) {
      console.error('❌ У команды нет clubId:', teamData);
      return NextResponse.json({ error: 'Team has no club association' }, { status: 400 });
    }

    // Получаем матчи команды с GPS данными (используем ту же логику что и основной API)
    console.log('🔍 Выполняем SQL запрос с параметрами:', {
      clubId: teamData.clubId,
      profileId,
      teamId
    });

    let matches: any[] = [];
    
    try {
      const matchesWithGps = await db.execute(sql`
        SELECT 
          m."id" as "matchid",
          m."date",
          gr."id" as "reportid",
          gr."processedData" as "processeddata"
        FROM "Match" m
        INNER JOIN "GpsReport" gr ON gr."eventId" = m."id" 
          AND gr."eventType" = 'MATCH' 
          AND gr."clubId" = ${teamData.clubId}::uuid
          AND gr."profileId" = ${profileId}::uuid
        WHERE m."teamId" = ${teamId}::uuid 
          AND m."clubId" = ${teamData.clubId}::uuid
        ORDER BY m."date" DESC
      `);
      
      console.log('✅ SQL запрос выполнен успешно');
      
      matches = (matchesWithGps as any).rows || [];
      console.log(`📊 Найдено ${matches.length} матчей с GPS отчетами для профиля ${profileId}`);
      
      if (matches.length === 0) {
        return NextResponse.json({
          averageMetrics: {},
          matchesCount: 0,
          totalMinutes: 0
        });
      }
    } catch (error) {
      console.error('❌ Ошибка при выполнении SQL запроса:', error);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // Обрабатываем только последние 10 матчей (как в основном API)
    const recentMatches = matches.slice(0, 10);
    console.log(`📊 Анализируем последние ${recentMatches.length} матчей`);

    // Обрабатываем данные для расчета средних показателей (как в основном API)
    const playerMatchData: Array<{
      matchId: string;
      date: string;
      minutesPlayed: number;
      metrics: Record<string, number>;
    }> = [];

    console.log(`🔍 Начинаем обработку ${recentMatches.length} матчей для игрока ${playerId}`);

    for (const matchData of recentMatches) {
      try {
        console.log(`🏈 Обрабатываем матч:`, {
          matchId: matchData.matchid,
          date: matchData.date,
          reportId: matchData.reportid,
          processedDataLength: matchData.processeddata?.length || 0
        });
        
        const processedData = matchData.processeddata || [];
        
        console.log(`🔍 Матч ${matchData.matchid}: найдено ${processedData.length} игроков`);
        
        // Получаем маппинг игроков для этого отчета (используем ту же логику что и основной API)
        const playerMappings = await db.select()
          .from(playerMapping)
          .where(and(
            eq(playerMapping.playerId, playerId),
            eq(playerMapping.teamId, teamId),
            eq(playerMapping.isActive, true)
          ));

        console.log(`🔗 Маппинги для игрока ${playerId}:`, playerMappings);

        // Ищем данные игрока в обработанных данных (используем ту же логику что и основной API)
        let playerData = null;
        
        // Сначала ищем по ID (если есть)
        playerData = processedData.find((player: any) => {
          const playerIdInData = player.playerId || player.player_id;
          return playerIdInData === playerId;
        });

        // Если не найден по ID, ищем по маппингу имен
        if (!playerData && playerMappings.length > 0) {
          for (const mapping of playerMappings) {
            // Ищем по имени из отчета
            playerData = processedData.find((player: any) => {
              const playerNameInData = player.name || player.Name || player.NAME || player.playerName;
              return playerNameInData === mapping.reportName;
            });
            
            if (playerData) {
              console.log(`✅ Найден игрок по маппингу: ${mapping.reportName} -> ${playerId}`);
              break;
            }
          }
        }

        console.log(`🔍 Ищем игрока ${playerId} в матче ${matchData.matchid}`);
        if (playerData) {
          console.log(`✅ Найден игрок в матче ${matchData.matchid}:`, Object.keys(playerData));
        } else {
          console.log(`❌ Игрок ${playerId} не найден в матче ${matchData.matchid}`);
          continue;
        }

        // Получаем время на поле из GPS данных (используем ту же логику что и основной API)
        let minutesPlayed = 90; // По умолчанию 90 минут
        
        // Получаем время из GPS данных (в профиле B-SIGHT столбец называется "Time")
        const gpsTime = playerData.Time || playerData.time || playerData.TIME || 
                       playerData.minutes || playerData.MINUTES || playerData.Minutes ||
                       playerData.duration || playerData.DURATION || playerData.Duration;
        
        // Функция для парсинга времени из формата "HH:MM:SS" в минуты (только целые минуты)
        const parseTimeToMinutes = (timeStr: string): number => {
          console.log(`🔧 Парсинг времени: "${timeStr}"`);
          
          if (!timeStr) {
            console.log(`🔧 Пустая строка времени`);
            return 0;
          }
          
          // Если строка содержит двоеточие, это формат времени
          if (timeStr.includes(':')) {
            const timeParts = timeStr.split(':');
            console.log(`🔧 Части времени:`, timeParts);
            
            if (timeParts.length === 3) {
              // Формат "HH:MM:SS" - берём только часы и минуты
              const hours = parseInt(timeParts[0]) || 0;
              const minutes = parseInt(timeParts[1]) || 0;
              const result = hours * 60 + minutes; // Игнорируем секунды
              console.log(`🔧 Формат HH:MM:SS: ${hours}ч ${minutes}м (секунды игнорируются) = ${result} минут`);
              return result;
            } else if (timeParts.length === 2) {
              // Формат "MM:SS" - берём только минуты
              const minutes = parseInt(timeParts[0]) || 0;
              console.log(`🔧 Формат MM:SS: ${minutes}м (секунды игнорируются) = ${minutes} минут`);
              return minutes;
            }
          }
          
          // Если это уже число (минуты)
          if (!isNaN(parseFloat(timeStr))) {
            const result = Math.floor(parseFloat(timeStr)); // Округляем вниз до целых минут
            console.log(`🔧 Числовое значение: ${result} (округлено вниз)`);
            return result;
          }
          
          console.log(`🔧 Неизвестный формат времени`);
          return 0;
        };
        
        if (gpsTime !== undefined) {
          minutesPlayed = parseTimeToMinutes(gpsTime);
          console.log(`⏱️ Время из GPS данных: "${gpsTime}" -> ${minutesPlayed} минут`);
        } else {
          // Если нет времени в GPS, берем из статистики матча
          const playerStatResult = await db.select()
            .from(playerMatchStat)
            .where(and(
              eq(playerMatchStat.matchId, matchData.matchid),
              eq(playerMatchStat.playerId, playerId)
            ));

          if (playerStatResult.length > 0 && playerStatResult[0].minutesPlayed > 0) {
            minutesPlayed = playerStatResult[0].minutesPlayed;
            console.log(`⏱️ Время из статистики матча: ${minutesPlayed} минут`);
          } else {
            console.log(`⏱️ Используем время по умолчанию: ${minutesPlayed} минут`);
          }
        }

        // Фильтруем только матчи где игрок сыграл 60+ минут (как в основном API)
        if (minutesPlayed >= 60) {
          console.log(`✅ Матч ${matchData.matchid}: игрок сыграл ${minutesPlayed} минут (>= 60)`);
          const metrics: Record<string, number> = {};
          
          console.log(`📊 Обрабатываем метрики для игрока в матче ${matchData.matchid}:`);
          console.log(`📋 Доступные данные игрока:`, Object.keys(playerData));
          
          // Извлекаем метрики из профиля (исключаем Max Speed из игровой модели)
          if (profile.columnMapping && Array.isArray(profile.columnMapping)) {
            profile.columnMapping.forEach((column: any) => {
              // Пропускаем Max Speed - не включаем в игровую модель
              if (column.name === 'Max speed' || column.mappedColumn === 'Max Speed') {
                console.log(`🔍 Пропускаем метрику "${column.name}" - исключена из игровой модели`);
                return;
              }
              
              console.log(`🔍 Проверяем метрику "${column.name}" (колонка "${column.mappedColumn}"):`);
              console.log(`   - isVisible: ${column.isVisible}`);
              console.log(`   - mappedColumn в данных: ${playerData[column.mappedColumn] !== undefined}`);
              console.log(`   - значение: ${playerData[column.mappedColumn]}`);
              
              if (column.isVisible && playerData[column.mappedColumn] !== undefined) {
                const rawValue = parseFloat(playerData[column.mappedColumn]) || 0;
                // Нормализуем на 90 минут
                const normalizedValue = minutesPlayed > 0 ? (rawValue / minutesPlayed) * 90 : 0;
                // Используем name для ключа метрики
                const displayKey = column.name;
                metrics[displayKey] = normalizedValue;
                
                console.log(`   ✅ Добавлена метрика "${displayKey}": ${rawValue} -> ${normalizedValue} (нормализовано)`);
              } else {
                console.log(`   ❌ Метрика "${column.name}" пропущена`);
              }
            });
          }

          console.log(`📊 Итоговые метрики для матча ${matchData.matchid}:`, metrics);
          playerMatchData.push({
            matchId: matchData.matchid,
            date: matchData.date,
            minutesPlayed,
            metrics
          });
        } else {
          console.log(`❌ Матч ${matchData.matchid}: игрок сыграл ${minutesPlayed} минут (< 60)`);
        }
      } catch (error) {
        console.error(`Ошибка при обработке матча ${matchData.matchid}:`, error);
      }
    }

    console.log(`📊 Найдено ${playerMatchData.length} матчей для игрока ${playerId} с 60+ минутами`);

    // Рассчитываем средние показатели (используем ту же логику что и основной API)
    const averageMetrics: Record<string, { average: number; matchesCount: number; totalMinutes: number }> = {};
    
    if (playerMatchData.length > 0) {
      const totalMinutes = playerMatchData.reduce((sum, match) => sum + match.minutesPlayed, 0);
      
      // Для каждой метрики из профиля (исключаем Max Speed из игровой модели)
      if (profile.columnMapping && Array.isArray(profile.columnMapping)) {
        profile.columnMapping.forEach((column: any) => {
          // Пропускаем Max Speed - не включаем в игровую модель
          if (column.name === 'Max speed' || column.mappedColumn === 'Max Speed') {
            return;
          }
          
          if (column.isVisible) {
            const displayKey = column.name;
            const values = playerMatchData
              .map(match => match.metrics[displayKey])
              .filter(value => value !== undefined && !isNaN(value));
            
            if (values.length > 0) {
              const average = values.reduce((sum, value) => sum + value, 0) / values.length;
              averageMetrics[displayKey] = {
                average,
                matchesCount: values.length,
                totalMinutes
              };
              
              // Детальные логи для Total Distance (как в основном API)
              if (column.name === 'Total distance') {
                console.log(`📏 РАСЧЁТ СРЕДНЕГО Total Distance:`);
                console.log(`   - Количество матчей: ${values.length}`);
                console.log(`   - Значения по матчам:`, values);
                console.log(`   - Сумма значений: ${values.reduce((sum, value) => sum + value, 0)}`);
                console.log(`   - Среднее значение: ${average}`);
                console.log(`   - Формула: ${values.join(' + ')} / ${values.length} = ${average}`);
              }
            }
          }
        });
      }
    }

    console.log('✅ Игровая модель рассчитана для публичного доступа:', {
      playerId,
      matchesCount: playerMatchData.length,
      metricsCount: Object.keys(averageMetrics).length
    });

    return NextResponse.json({
      averageMetrics,
      matchesCount: playerMatchData.length,
      totalMinutes: playerMatchData.reduce((sum, match) => sum + match.minutesPlayed, 0),
      analyzedMatches: playerMatchData.map(match => ({
        matchId: match.matchId,
        date: match.date,
        minutesPlayed: match.minutesPlayed
      }))
    });
  } catch (error) {
    console.error('❌ Ошибка при получении игровой модели игрока:', error);
    console.error('❌ Детали ошибки:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 