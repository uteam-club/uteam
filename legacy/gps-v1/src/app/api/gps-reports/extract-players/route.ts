import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import * as XLSX from 'xlsx';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// POST - извлечение имен игроков из файла
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
    const profileId = formData.get('profileId') as string;

    // Валидация входных данных
    if (!file || !profileId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Ищем колонку с именами игроков
    const nameColumnIndex = findPlayerNameColumn(filteredHeaders);
    
    if (nameColumnIndex === -1) {
      return NextResponse.json({ 
        error: 'Не найдена колонка с именами игроков. Ожидаемые названия: Name, Player, Игрок, Имя, ФИО' 
      }, { status: 400 });
    }

    // Извлекаем уникальные имена игроков
    const playerNames = new Set<string>();
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (row && row[nameColumnIndex]) {
        const playerName = String(row[nameColumnIndex]).trim();
        if (playerName && playerName !== '') {
          playerNames.add(playerName);
        }
      }
    }

    const uniquePlayerNames = Array.from(playerNames).sort();

    return NextResponse.json({
      playerNames: uniquePlayerNames,
      totalPlayers: uniquePlayerNames.length,
      nameColumn: filteredHeaders[nameColumnIndex]
    });

  } catch (error) {
    console.error('Ошибка при извлечении игроков из отчета:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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