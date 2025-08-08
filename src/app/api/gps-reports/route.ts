import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { db } from '@/lib/db';
import { gpsReport, gpsProfile, player } from '@/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { PlayerMappingService } from '@/services/playerMapping.service';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// GET - получение списка GPS отчетов
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsReports.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    const teamId = searchParams.get('teamId');

    if (eventId) {
      // Получаем отчет для конкретного события
      const reports = await db
        .select()
        .from(gpsReport)
        .where(
          and(
            eq(gpsReport.clubId, token.clubId),
            eq(gpsReport.eventId, eventId)
          )
        )
        .orderBy(desc(gpsReport.createdAt));

      return NextResponse.json(reports);
    } else if (teamId) {
      // Получаем отчеты для конкретной команды
      const reports = await db
        .select()
        .from(gpsReport)
        .where(
          and(
            eq(gpsReport.clubId, token.clubId),
            eq(gpsReport.teamId, teamId)
          )
        )
        .orderBy(desc(gpsReport.createdAt));

      return NextResponse.json(reports);
    } else {
      // Получаем все отчеты клуба
      const reports = await db
        .select()
        .from(gpsReport)
        .where(eq(gpsReport.clubId, token.clubId))
        .orderBy(desc(gpsReport.createdAt));

      return NextResponse.json(reports);
    }
  } catch (error) {
    console.error('Ошибка при получении GPS отчетов:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - загрузка нового GPS отчета
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsReports.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const teamId = formData.get('teamId') as string;
    const eventType = formData.get('eventType') as 'TRAINING' | 'MATCH';
    const eventId = formData.get('eventId') as string;
    const profileId = formData.get('profileId') as string;
    const playerMappingsJson = formData.get('playerMappings') as string;

    // Валидация входных данных
    if (!file || !name || !teamId || !eventType || !eventId || !profileId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Парсим маппинги игроков, если они переданы
    let playerMappings = [];
    if (playerMappingsJson) {
      try {
        playerMappings = JSON.parse(playerMappingsJson);
        console.log('🔗 Маппинги получены:', playerMappings.length, 'шт');
      } catch (error) {
        console.error('Ошибка парсинга маппингов игроков:', error);
      }
    } else {
      console.log('⚠️ playerMappingsJson пустой');
    }

    // Проверяем тип файла
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Получаем профиль для проверки маппинга
    const [profile] = await db
      .select()
      .from(gpsProfile)
      .where(eq(gpsProfile.id, profileId));

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    console.log('📋 Профиль загружен, колонок:', Array.isArray(profile.columnMapping) ? profile.columnMapping.length : 0);

    // Читаем и парсим файл
    const buffer = await file.arrayBuffer();
    let workbook: XLSX.WorkBook;

    try {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const text = new TextDecoder().decode(buffer);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        workbook = XLSX.read(buffer, { type: 'buffer' });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Failed to parse file' }, { status: 400 });
    }

    // Получаем первый лист
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: 'No sheets found in file' }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    // Получаем заголовки
    const headers = jsonData[0] as string[];
    const filteredHeaders = headers
      .filter(header => header && header.trim() !== '')
      .map(header => header.trim())
      .filter(header => header.length > 0);

    console.log('📊 Заголовки:', filteredHeaders.length, 'шт, данные:', jsonData.length - 1, 'строк');

    // Обрабатываем данные согласно профилю
    const processedData = await processDataAccordingToProfile(
      jsonData.slice(1) as any[][], 
      filteredHeaders, 
      profile.columnMapping,
      teamId,
      token.clubId,
      profile.gpsSystem,
      playerMappings
    );

    console.log('✅ Обработано записей:', processedData.length);

    // Сохраняем отчет в базу данных
    const [newReport] = await db
      .insert(gpsReport)
      .values({
        name,
        fileName: file.name,
        fileUrl: `gps-reports/${token.clubId}/${Date.now()}-${file.name}`, // Временный URL
        gpsSystem: profile.gpsSystem,
        eventType,
        eventId,
        teamId,
        profileId,
        isProcessed: true,
        processedData: processedData,
        rawData: jsonData,
        clubId: token.clubId,
        uploadedById: token.id,
      })
      .returning();

    return NextResponse.json(newReport);
  } catch (error) {
    console.error('Ошибка при загрузке GPS отчета:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Функция для обработки данных согласно профилю
async function processDataAccordingToProfile(
  data: any[][], 
  headers: string[], 
  columnMapping: any,
  teamId: string,
  clubId: string,
  gpsSystem: string,
  customPlayerMappings: any[] = []
) {


  if (!columnMapping || !Array.isArray(columnMapping)) {
    console.log('⚠️ columnMapping пустой, возвращаем исходные данные');
    return data;
  }

  // Для B-SIGHT системы используем фиксированный маппинг
  if (gpsSystem === 'B-SIGHT') {
    console.log('🔧 Используем фиксированный маппинг для B-SIGHT');
    return data.map((row, rowIndex) => {
      // Пропускаем строки "Среднее" и "Сумма"
      if (row[0] === 'Среднее' || row[0] === 'Сумма') {
        return null;
      }

      const processedRow: any = {
        name: row[0], // Игрок
        Time: row[1], // Время
        TD: row[2], // Общая дистанция
        'Z-3 Tempo': row[3], // Зона 3
        'Z-4 HIR': row[4], // Зона 4
        'Z-5 Sprint': row[5], // Зона 5
                Acc: row[6], // Ускорения
        Dec: row[7], // Торможения
        'Max Speed': row[8], // Максимальная скорость
        HSR: row[9], // HSR
        'HSR%': row[10] // HSR %
      };

      console.log(`✅ Обработана строка ${rowIndex}:`, Object.keys(processedRow));
      return processedRow;
    }).filter(row => row !== null);
  }

  // Находим колонку с именами игроков
  const nameColumnIndex = findPlayerNameColumn(headers);
  console.log('👤 Колонка имен:', nameColumnIndex >= 0 ? headers[nameColumnIndex] : 'не найдена');
  console.log('📋 Заголовки файла:', headers);
  console.log('📊 Первая строка данных:', data[0]);
  console.log('🔧 Маппинг колонок:', JSON.stringify(columnMapping, null, 2));
  
  // Используем переданные маппинги или получаем из базы
  let finalPlayerMappings = customPlayerMappings;
  if (customPlayerMappings.length === 0) {
    finalPlayerMappings = await PlayerMappingService.getTeamMappings(teamId, clubId);
  }
  console.log('🔗 Маппинги:', finalPlayerMappings.length, 'шт');
  
  const mappingMap = new Map();
  const mappedPlayerNames = new Set(); // Множество имен игроков, которые прошли маппинг
  
  finalPlayerMappings.forEach((mapping: any) => {
    const reportName = mapping.reportName ? mapping.reportName.toLowerCase() : mapping.mapping?.reportName?.toLowerCase();
    const playerId = mapping.selectedPlayerId || mapping.player?.id;
    if (reportName && playerId) {
      mappingMap.set(reportName, playerId);
      mappedPlayerNames.add(reportName);
    }
  });

  console.log('📋 Игроки с маппингом:', mappedPlayerNames.size, 'шт');

  // Сначала получаем данные всех игроков для маппинга
  const playerIds = Array.from(mappingMap.values());
  const playerDataMap = new Map();
  
  if (playerIds.length > 0) {
    // Получаем всех игроков по их ID
    const playersData = await db
      .select({ id: player.id, firstName: player.firstName, lastName: player.lastName })
      .from(player)
      .where(inArray(player.id, playerIds));
    
          playersData.forEach(p => {
        const fullName = `${p.lastName || ''} ${p.firstName || ''}`.trim(); // Фамилия Имя
        playerDataMap.set(p.id, fullName || 'Неизвестный игрок');
      });
    
    console.log('🔍 Найдено игроков в БД:', playersData.length, 'шт');
  }

  // Обрабатываем данные всех игроков (включая тех, у кого нет маппингов)
  const processedData = data
    .map((row, rowIndex) => {
      // Отладочная информация для первой строки
      if (rowIndex === 0) {
        console.log('🔍 Первая строка данных:', row);
        console.log('🔍 Индекс колонки с именем:', nameColumnIndex);
      }
      
      // Проверяем, есть ли имя игрока в этой строке
      if (nameColumnIndex === -1 || !row[nameColumnIndex]) {
        return null;
      }
      
      const playerName = String(row[nameColumnIndex]).trim();
      const playerNameLower = playerName.toLowerCase();
      
      // Проверяем, есть ли этот игрок в маппингах
      const hasMapping = mappedPlayerNames.has(playerNameLower);
      if (!hasMapping) {
        console.log(`⚠️ Игрок "${playerName}" не найден в маппингах - обрабатываем без маппинга`);
      }
      
      const processedRow: any = {};
      
      // Добавляем ID игрока, если есть маппинг
      const playerId = mappingMap.get(playerNameLower);
      
      if (playerId) {
        processedRow.playerId = playerId;
        
        // Получаем имя игрока из приложения (формат: Фамилия Имя для консистентности)
        const appPlayerName = playerDataMap.get(playerId);
        processedRow.name = appPlayerName || playerName; // Используем имя из приложения или из отчета как fallback
        console.log(`✅ "${playerName}" -> "${processedRow.name}" (ID: ${playerId})`);
      } else {
        processedRow.name = playerName; // Используем имя из отчета
        console.log(`⚠️ Нет маппинга для "${playerName}" - используем имя из отчета`);
      }
    
      columnMapping.forEach((column: any, colIndex: number) => {
        // Проверяем разные возможные структуры columnMapping
        const columnName = column.name || column.internalField;
        const mappedColumn = column.mappedColumn || column.excelColumn;
        const columnType = column.type || 'column';
        
        console.log(`🔍 Обрабатываем колонку: ${columnName} -> ${mappedColumn} (тип: ${columnType})`);
        
        if (columnType === 'column' && mappedColumn) {
          // Находим индекс столбца в заголовках
          const columnIndex = headers.findIndex(header => {
            const headerLower = header.toLowerCase().trim();
            const mappedLower = mappedColumn.toLowerCase().trim();
            return headerLower === mappedLower || headerLower.includes(mappedLower) || mappedLower.includes(headerLower);
          });
          
          if (columnIndex !== -1 && row[columnIndex] !== undefined) {
            processedRow[columnName] = row[columnIndex];
            console.log(`✅ Маппинг: "${headers[columnIndex]}" (индекс ${columnIndex}) -> "${columnName}" = ${row[columnIndex]}`);
          } else {
            console.log(`⚠️ Колонка "${mappedColumn}" не найдена в заголовках для "${columnName}"`);
            console.log(`🔍 Доступные заголовки:`, headers);
            
            // Попробуем найти колонку по позиции (для B-SIGHT системы)
            if (columnName === 'Player' && row[0]) {
              processedRow[columnName] = row[0];
              console.log(`🔧 Fallback маппинг: колонка 0 -> "${columnName}" = ${row[0]}`);
            } else if (columnName === 'Time' && row[1]) {
              processedRow[columnName] = row[1];
              console.log(`🔧 Fallback маппинг: колонка 1 -> "${columnName}" = ${row[1]}`);
            } else if (columnName === 'TD' && row[2]) {
              processedRow[columnName] = row[2];
              console.log(`🔧 Fallback маппинг: колонка 2 -> "${columnName}" = ${row[2]}`);
            } else if (columnName === 'Zone 3' && row[3]) {
              processedRow[columnName] = row[3];
              console.log(`🔧 Fallback маппинг: колонка 3 -> "${columnName}" = ${row[3]}`);
            } else if (columnName === 'Zone 4' && row[4]) {
              processedRow[columnName] = row[4];
              console.log(`🔧 Fallback маппинг: колонка 4 -> "${columnName}" = ${row[4]}`);
            } else if (columnName === 'Zone 5' && row[5]) {
              processedRow[columnName] = row[5];
              console.log(`🔧 Fallback маппинг: колонка 5 -> "${columnName}" = ${row[5]}`);
            } else if (columnName === 'Acc' && row[6]) {
              processedRow[columnName] = row[6];
              console.log(`🔧 Fallback маппинг: колонка 6 -> "${columnName}" = ${row[6]}`);
            } else if (columnName === 'Dec' && row[7]) {
                              processedRow[columnName] = row[7];
                console.log(`🔧 Fallback маппинг: колонка 7 -> "${columnName}" = ${row[7]}`);
            } else if (columnName === 'Max Speed' && row[8]) {
                processedRow[columnName] = row[8];
                console.log(`🔧 Fallback маппинг: колонка 8 -> "${columnName}" = ${row[8]}`);
            } else if (columnName === 'HSR' && row[9]) {
            processedRow[columnName] = row[9];
            console.log(`🔧 Fallback маппинг: колонка 9 -> "${columnName}" = ${row[9]}`);
        } else if (columnName === 'HSR%' && row[10]) {
            processedRow[columnName] = row[10];
            console.log(`🔧 Fallback маппинг: колонка 10 -> "${columnName}" = ${row[10]}`);
            }
          }
        } else if (columnType === 'formula' && column.formula) {
          // Обрабатываем формулы
          const result = processFormula(row, headers, column.formula);
          if (result !== null) {
            processedRow[columnName] = result;
          }
        }
      });
      
      console.log(`🎯 Обработанная строка для "${processedRow.name}":`, JSON.stringify(processedRow, null, 2));
      
      return processedRow;
    })
    .filter(row => row !== null); // Убираем null значения (строки без маппинга)

  console.log('🎯 Обработано:', processedData.length, 'из', data.length, 'записей');
  
  // Отладочная информация о результате
  if (processedData.length > 0) {
    console.log('🔍 Образец обработанных данных:', {
      firstRecord: processedData[0],
      firstRecordKeys: Object.keys(processedData[0]),
      sampleValues: Object.entries(processedData[0]).slice(0, 5)
    });
  }
  
  return processedData;
}

// Функция для поиска колонки с именами игроков
function findPlayerNameColumn(headers: string[]): number {
  const nameKeywords = [
    'name', 'player', 'игрок', 'имя', 'фио', 'fullname', 'full_name',
    'player_name', 'player name', 'имя игрока', 'фамилия', 'surname'
  ];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase();
    
    // Проверяем точное совпадение
    if (nameKeywords.includes(header)) {
      return i;
    }
    
    // Проверяем частичное совпадение
    for (const keyword of nameKeywords) {
      if (header.includes(keyword) || keyword.includes(header)) {
        return i;
      }
    }
  }

  return -1;
}

// Функция для обработки формул
function processFormula(row: any[], headers: string[], formula: any) {
  const { operation, operand1, operand2 } = formula;
  
  // Находим значения операндов
  const index1 = headers.findIndex(header => header === operand1);
  const index2 = headers.findIndex(header => header === operand2);
  
  if (index1 === -1 || index2 === -1) {
    return null;
  }
  
  const value1 = parseFloat(row[index1]);
  const value2 = parseFloat(row[index2]);
  
  if (isNaN(value1) || isNaN(value2)) {
    return null;
  }
  
  switch (operation) {
    case 'add':
      return value1 + value2;
    case 'subtract':
      return value1 - value2;
    case 'multiply':
      return value1 * value2;
    case 'divide':
      return value2 !== 0 ? value1 / value2 : null;
    default:
      return null;
  }
} 