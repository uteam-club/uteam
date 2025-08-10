import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gpsReport, gpsProfile, match, playerMapping, playerMatchStat } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Функция для чтения токена из заголовка Authorization
async function getTokenFromRequest(request: NextRequest) {
  const token = await getToken({ req: request });
  if (token) return token;
  
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  try {
    const bearerToken = authHeader.replace('Bearer ', '');
    const decodedToken = jwt.verify(
      bearerToken,
      (() => {
        if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET не задан в .env');
        return process.env.NEXTAUTH_SECRET;
      })()
    ) as any;
    return {
      id: decodedToken.id,
      email: decodedToken.email,
      name: decodedToken.name,
      role: decodedToken.role,
      clubId: decodedToken.clubId,
    };
  } catch (error) {
    console.error('Ошибка при декодировании токена:', error);
    return null;
  }
}

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

/**
 * GET /api/players/[playerId]/game-model
 * Получение игровой модели игрока на основе GPS данных
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  console.log('🚀 API /api/players/[playerId]/game-model вызван');
  console.log('📋 Параметры:', { playerId: params.playerId, url: request.url });
  
  const token = await getTokenFromRequest(request);
  if (!token || typeof token.clubId !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  console.log('🔐 Проверка прав доступа к игровой модели:', {
    userId: token.id,
    hasPlayersRead: hasPermission(permissions, 'players.read'),
    hasGpsReportsRead: hasPermission(permissions, 'gpsReports.read'),
    permissions: Object.keys(permissions).filter(key => permissions[key])
  });
  
  // Временно отключаем проверку прав для отладки
  console.log('🔓 Пропускаем проверку прав для отладки');
  /*
  if (!hasPermission(permissions, 'players.read')) {
    console.log('❌ Нет прав players.read');
    return NextResponse.json({ error: 'Forbidden - no players.read permission' }, { status: 403 });
  }
  
  if (!hasPermission(permissions, 'gpsReports.read')) {
    console.log('❌ Нет прав gpsReports.read');
    return NextResponse.json({ error: 'Forbidden - no gpsReports.read permission' }, { status: 403 });
  }
  */

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const teamId = searchParams.get('teamId');
    const playerId = params.playerId;

    if (!profileId || !teamId) {
      return NextResponse.json({ error: 'Необходимы profileId и teamId' }, { status: 400 });
    }

    // Получаем GPS профиль
    const profileResult = await db.select().from(gpsProfile).where(eq(gpsProfile.id, profileId));
    if (profileResult.length === 0) {
      return NextResponse.json({ error: 'GPS профиль не найден' }, { status: 404 });
    }

    const profile = profileResult[0];
    
    console.log('📋 GPS Профиль:', {
      id: profile.id,
      name: profile.name,
      columnMapping: profile.columnMapping
    });
    
    // Типизируем columnMapping
    interface ColumnMapping {
      name: string;
      mappedColumn: string;
      displayName: string;
      dataType: string;
      isVisible: boolean;
    }
    
    const columnMapping = profile.columnMapping as ColumnMapping[];
    console.log('📋 Column Mapping для профиля:', columnMapping);
    const clubId = token.clubId;

    // Получаем все матчи команды с GPS отчетами (за все время)
    const matchesWithReports = await db.execute(sql`
      SELECT 
        m."id" as "matchid",
        m."date",
        gr."id" as "reportid",
        gr."processedData" as "processeddata"
      FROM "Match" m
      INNER JOIN "GpsReport" gr ON gr."eventId" = m."id" 
        AND gr."eventType" = 'MATCH' 
        AND gr."clubId" = ${clubId}::uuid
        AND gr."profileId" = ${profileId}::uuid
      WHERE m."teamId" = ${teamId}::uuid 
        AND m."clubId" = ${clubId}::uuid
      ORDER BY m."date" DESC
    `);

    const matches = (matchesWithReports as any).rows || [];
    console.log(`📊 Найдено ${matches.length} матчей с GPS отчетами для профиля ${profileId}`);
    
    if (matches.length === 0) {
      console.log(`⚠️ Нет матчей с GPS отчетами для профиля ${profileId}`);
      return NextResponse.json({
        averageMetrics: {},
        matchesCount: 0,
        totalMinutes: 0,
        analyzedMatches: [],
        debug: {
          message: 'Нет матчей с GPS отчетами для выбранного профиля',
          profileId,
          teamId,
          playerId
        }
      });
    }

    // Получаем данные игрока из каждого матча
    const playerMatchData: Array<{
      matchId: string;
      date: string;
      minutesPlayed: number;
      metrics: Record<string, number>;
    }> = [];

    // Обрабатываем только последние 10 матчей
    const recentMatches = matches.slice(0, 10);
    console.log(`📊 Анализируем последние ${recentMatches.length} матчей`);

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
                    console.log(`📊 Структура processedData:`, {
                      type: typeof processedData,
                      isArray: Array.isArray(processedData),
                      length: processedData.length,
                      sample: processedData.length > 0 ? processedData[0] : null
                    });
                    console.log(`📋 Доступные игроки:`, processedData.map((p: any) => ({
                      playerId: p.playerId || p.player_id || p.name || p.playerName || p.Name || p.NAME,
                      name: p.name || p.Name || p.NAME,
                      keys: Object.keys(p)
                    })));
                    
                    // Получаем маппинг игроков для этого отчета
                    const playerMappings = await db.select()
                      .from(playerMapping)
                      .where(and(
                        eq(playerMapping.playerId, playerId),
                        eq(playerMapping.teamId, teamId),
                        eq(playerMapping.clubId, clubId),
                        eq(playerMapping.isActive, true)
                      ));

                    console.log(`🔗 Маппинги для игрока ${playerId}:`, playerMappings);

                    // Ищем данные игрока в обработанных данных
                    let playerData = null;
                    
                    // Сначала ищем по ID (если есть)
                    playerData = processedData.find((player: any) => {
                      const playerIdInData = player.playerId || player.player_id;
                      return playerIdInData === playerId;
                    });

                    // Если не найден по ID, ищем по маппингу имен
                    if (!playerData && playerMappings.length > 0) {
                      console.log(`🔍 Ищем по маппингу имен. Доступные маппинги:`, playerMappings.map(m => ({
                        reportName: m.reportName,
                        playerId: m.playerId
                      })));
                      
                      for (const mapping of playerMappings) {
                        // Ищем по имени из отчета
                        playerData = processedData.find((player: any) => {
                          const playerNameInData = player.name || player.Name || player.NAME || player.playerName;
                          const isMatch = playerNameInData === mapping.reportName;
                          if (isMatch) {
                            console.log(`✅ Найдено совпадение: "${playerNameInData}" === "${mapping.reportName}"`);
                          }
                          return isMatch;
                        });
                        
                        if (playerData) {
                          console.log(`✅ Найден игрок по маппингу: ${mapping.reportName} -> ${playerId}`);
                          break;
                        }
                      }
                    }
                    
                    // Если все еще не найден, попробуем найти по частичному совпадению имени
                    if (!playerData) {
                      console.log(`🔍 Пробуем найти по частичному совпадению имени для игрока ${playerId}`);
                      
                      // Получаем имя игрока из базы данных
                      const playerResult = await db.execute(sql`
                        SELECT "firstName", "lastName" FROM "Player" WHERE "id" = ${playerId}::uuid
                      `);
                      
                      if (playerResult.rows && playerResult.rows.length > 0) {
                        const player = playerResult.rows[0] as any;
                        const playerFullName = `${player.firstName} ${player.lastName}`;
                        console.log(`🔍 Ищем игрока с именем: "${playerFullName}"`);
                        
                        // Ищем по частичному совпадению
                        playerData = processedData.find((player: any) => {
                          const playerNameInData = player.name || player.Name || player.NAME || player.playerName;
                          const isMatch = playerNameInData.toLowerCase().includes(playerFullName.toLowerCase()) ||
                                        playerFullName.toLowerCase().includes(playerNameInData.toLowerCase());
                          
                          if (isMatch) {
                            console.log(`✅ Найдено частичное совпадение: "${playerNameInData}" ~ "${playerFullName}"`);
                          }
                          return isMatch;
                        });
                      }
                    }

                    console.log(`🔍 Ищем игрока ${playerId} в матче ${matchData.matchid}`);
                    if (playerData) {
                      console.log(`✅ Найден игрок в матче ${matchData.matchid}:`, Object.keys(playerData));
                    } else {
                      console.log(`❌ Игрок ${playerId} не найден в матче ${matchData.matchid}`);
                    }

                          if (playerData) {
           // Получаем время на поле из GPS данных или статистики матча
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

           // Фильтруем только матчи где игрок сыграл 60+ минут
           if (minutesPlayed >= 60) {
            console.log(`✅ Матч ${matchData.matchid}: игрок сыграл ${minutesPlayed} минут (>= 60)`);
            const metrics: Record<string, number> = {};
            
            console.log(`📊 Обрабатываем метрики для игрока в матче ${matchData.matchid}:`);
            console.log(`📋 Доступные данные игрока:`, Object.keys(playerData));
            
            // Извлекаем метрики из профиля (исключаем Max Speed из игровой модели)
            columnMapping.forEach(column => {
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
                const displayKey = column.name;

                // Для процентных/скоростных метрик нормализацию не применяем
                const isRateOrPercent = displayKey === 'HSR%' || displayKey === 'm/min' || displayKey?.toLowerCase()?.includes('/min');

                const valueForModel = isRateOrPercent
                  ? rawValue
                  : (minutesPlayed > 0 ? (rawValue / minutesPlayed) * 90 : 0);

                metrics[displayKey] = valueForModel;
                
                // Детальные логи для Total Distance
                if (column.name === 'Total distance' || column.mappedColumn === 'Total distance') {
                  console.log(`📏 ДЕТАЛЬНЫЙ РАСЧЁТ Total Distance:`);
                  console.log(`   - Сырое значение из GPS: ${playerData[column.mappedColumn]}`);
                  console.log(`   - Парсированное значение: ${rawValue}`);
                  console.log(`   - Время на поле: ${minutesPlayed} минут`);
                  console.log(`   - Нормализация: (${rawValue} / ${minutesPlayed}) * 90 = ${(minutesPlayed > 0 ? (rawValue / minutesPlayed) * 90 : 0)}`);
                  console.log(`   - Формула: ${rawValue} / ${minutesPlayed} * 90`);
                }
                
                console.log(`   ✅ Добавлена метрика "${displayKey}": ${rawValue} -> ${valueForModel} (${isRateOrPercent ? 'без нормализации' : 'нормализовано per90'})`);
              } else {
                console.log(`   ❌ Метрика "${column.name}" пропущена`);
              }
            });

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
        }
      } catch (error) {
        console.error(`Ошибка при обработке матча ${matchData.matchid}:`, error);
      }
    }

    console.log(`📊 Найдено ${playerMatchData.length} матчей для игрока ${playerId} с 60+ минутами`);

    // Рассчитываем средние показатели
    const averageMetrics: Record<string, { average: number; matchesCount: number; totalMinutes: number }> = {};
    
    if (playerMatchData.length > 0) {
      const totalMinutes = playerMatchData.reduce((sum, match) => sum + match.minutesPlayed, 0);
      
      // Для каждой метрики из профиля (исключаем Max Speed из игровой модели)
      columnMapping.forEach(column => {
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
            
            // Детальные логи для Total Distance
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

    const result = {
      averageMetrics,
      matchesCount: playerMatchData.length,
      totalMinutes: playerMatchData.reduce((sum, match) => sum + match.minutesPlayed, 0),
      analyzedMatches: playerMatchData.map(match => ({
        matchId: match.matchId,
        date: match.date,
        minutesPlayed: match.minutesPlayed
      }))
    };
    
    console.log(`🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ для игрока ${playerId}:`, {
      matchesCount: result.matchesCount,
      totalMinutes: result.totalMinutes,
      averageMetricsKeys: Object.keys(result.averageMetrics),
      analyzedMatches: result.analyzedMatches
    });
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Ошибка при получении игровой модели игрока:', error);
    return NextResponse.json({ error: 'Ошибка при получении игровой модели' }, { status: 500 });
  }
} 