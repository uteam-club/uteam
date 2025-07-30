import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

export async function POST(request: NextRequest) {
  try {
    // Проверка аутентификации и прав доступа
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await checkClubAccess(request, token);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
    }

    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'gpsProfiles.create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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

    // Читаем файл
    const buffer = await file.arrayBuffer();
    let workbook: XLSX.WorkBook;

    try {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // Для CSV файлов
        const text = new TextDecoder().decode(buffer);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        // Для Excel файлов
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
    
    // Конвертируем в JSON для получения заголовков
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    // Получаем заголовки (первая строка)
    const headers = jsonData[0] as string[];
    
    // Фильтруем пустые заголовки и добавляем проверку на валидность
    const filteredHeaders = headers
      .filter(header => header && header.trim() !== '')
      .map(header => header.trim()) // Убираем лишние пробелы
      .filter(header => header.length > 0); // Дополнительная проверка

    return NextResponse.json({
      headers: filteredHeaders,
      totalRows: jsonData.length - 1 // Исключаем заголовки
    });

  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 