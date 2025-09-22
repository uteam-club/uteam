import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema/gpsReport';
import { eq, and } from 'drizzle-orm';
import { GpsFileParser } from '@/lib/gps-file-parser';
import { canAccessGpsReport } from '@/lib/gps-permissions';

// POST /api/gps/upload - Загрузить GPS файл и создать отчет
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем разрешение на создание GPS отчетов
    const canCreate = await canAccessGpsReport(
      session.user.id,
      session.user.clubId,
      null, // teamId будет получен из formData
      'edit'
    );

    if (!canCreate) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'У вас нет прав для создания GPS отчетов' 
      }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const teamId = formData.get('teamId') as string;
    const eventId = formData.get('eventId') as string;
    const eventType = formData.get('eventType') as 'training' | 'match';
    const fileName = formData.get('fileName') as string;

    if (!file || !teamId || !eventId || !eventType || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Проверяем тип файла
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      );
    }

    // Используем централизованный парсер
    const parsedData = await GpsFileParser.parseFile(file);

    if (parsedData.rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found in file' },
        { status: 400 }
      );
    }

    // Определяем GPS систему на основе колонок
    const gpsSystem = detectGpsSystem(parsedData.headers);

    // Создаем отчет в БД
    const [report] = await db
      .insert(gpsReport)
      .values({
        name: fileName.replace(/\.[^/.]+$/, ''), // Убираем расширение
        fileName,
        fileUrl: '', // Временное значение
        gpsSystem,
        eventType,
        eventId,
        profileId: '', // Будет установлен после создания профиля
        rawData: null,
        processedData: null,
        metadata: {
          columns: parsedData.headers,
          rowCount: parsedData.rows.length,
          uploadedAt: new Date().toISOString(),
          fileType: file.type,
        },
        isProcessed: false,
        ingestStatus: 'pending',
        ingestError: null,
        filePath: null,
        profileSnapshot: null,
        canonVersion: null,
        importMeta: null,
        fileSize: file.size,
        gpsProfileId: null,
        trainingId: eventType === 'training' ? eventId : null,
        matchId: eventType === 'match' ? eventId : null,
        status: 'uploaded',
        playersCount: parsedData.rows?.length || 0,
        hasEdits: false,
        clubId: session.user.clubId,
        teamId,
        uploadedById: session.user.id,
      })
      .returning();

    return NextResponse.json({
      reportId: report.id,
      columns: parsedData.headers || [],
      rowCount: parsedData.rows?.length || 0,
      gpsSystem,
      message: 'File uploaded successfully. Please configure column mapping.',
    });
  } catch (error) {
    console.error('Error uploading GPS file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Функция для определения GPS системы по колонкам
function detectGpsSystem(columns: string[]): string {
  const columnNames = columns.map(col => col.toLowerCase());
  
  // Проверяем признаки различных GPS систем
  if (columnNames.some(col => col.includes('polar') || col.includes('polar'))) {
    return 'Polar';
  }
  
  if (columnNames.some(col => col.includes('statsports') || col.includes('stat'))) {
    return 'Statsports';
  }
  
  if (columnNames.some(col => col.includes('catapult') || col.includes('catapult'))) {
    return 'Catapult';
  }
  
  if (columnNames.some(col => col.includes('gps') || col.includes('gps'))) {
    return 'GPS';
  }
  
  if (columnNames.some(col => col.includes('tracking') || col.includes('track'))) {
    return 'Tracking';
  }
  
  // По умолчанию
  return 'Unknown';
}
