import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { gpsReport, gpsProfile, player } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { PlayerMappingService } from '@/services/playerMapping.service';
import { parseSpreadsheet, applyProfile, GpsProfile } from '@/services/gps/ingest.service';
import { buildProfileSnapshot } from '@/services/gps/profileSnapshot.service';
import { mapRowsToCanonical } from '@/services/canon.mapper';
import { CANON } from '@/canon/metrics.registry';
import { validateAthleteNameColumn } from '@/services/gps/validators/nameColumn.validator';
import { sanitizeRowsWithWarnings } from '@/services/gps/sanitizers/rowSanitizer';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// GET - получение списка GPS отчётов
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
    const teamId = searchParams.get('teamId');
    const eventType = searchParams.get('eventType');

    let whereConditions = [eq(gpsReport.clubId, token.clubId)];

    if (teamId) {
      whereConditions.push(eq(gpsReport.teamId, teamId));
    }

    if (eventType) {
      whereConditions.push(eq(gpsReport.eventType, eventType));
    }

    const query = db.select().from(gpsReport).where(and(...whereConditions));

    const reports = await query.orderBy(gpsReport.createdAt);

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Ошибка при получении GPS отчётов:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - загрузка нового GPS отчета (ЧИСТАЯ ВЕРСИЯ)
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

    // Парсим маппинги игроков
    let playerMappings = [];
    if (playerMappingsJson) {
      try {
        playerMappings = JSON.parse(playerMappingsJson);
      } catch (error) {
        console.error('Ошибка парсинга маппингов игроков:', error);
      }
    }

    // Загружаем профиль
    const [profile] = await db
      .select()
      .from(gpsProfile)
      .where(and(eq(gpsProfile.id, profileId), eq(gpsProfile.clubId, token.clubId)));

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Приводим к нужному типу
    const typedProfile: GpsProfile = {
      id: profile.id,
      gpsSystem: profile.gpsSystem,
      columnMapping: (profile.columnMapping as any) || [],
      createdAt: profile.createdAt.toISOString(),
    };

    // 1. Парсим файл
    const buffer = await file.arrayBuffer();
    const parsed = await parseSpreadsheet(Buffer.from(buffer), file.name);

    // 2. Применяем профиль
    const profileResult = applyProfile(parsed, typedProfile);

    // 3. Валидация колонки имён игроков
    const nameColumn = profileResult.mappedColumns.find(col => col.canonicalKey === 'athlete_name');
    let nameValidation = { warnings: [], suggestions: {} };
    
    if (nameColumn && parsed.rows.length > 0) {
      // Извлекаем значения из колонки имён для валидации
      const nameValues = parsed.rows
        .slice(0, 50) // Берем первые 50 строк для анализа
        .map(row => {
          const rowArray = row as (string | number | null)[];
          const nameIndex = parsed.headers.findIndex(h => h === nameColumn.sourceHeader);
          return nameIndex >= 0 ? String(rowArray[nameIndex] || '') : '';
        });
      
      nameValidation = validateAthleteNameColumn(nameValues, parsed.headers, nameColumn.sourceHeader);
      
      // Дополнительная проверка на подозрительные имена (позиции)
      const positionPatterns = [
        'CB', 'MF', 'W', 'S', 'GK', 'ST', 'CM', 'DM', 'AM', 'RM', 'LM', 'RW', 'LW', 'CF', 'SS',
        'ВР', 'ЦЗ', 'ЛЗ', 'ПЗ', 'Н', 'ПФ', 'ЛФ', 'ЦП', 'ОП', 'АП', 'ПП', 'ЛП', 'Ф'
      ];
      
      const positionCount = nameValues.filter(name => {
        const trimmed = name.trim().toUpperCase();
        return positionPatterns.includes(trimmed) || 
               (trimmed.length <= 3 && /^[A-ZА-ЯЁ]+$/.test(trimmed));
      }).length;
      
      const totalValidNames = nameValues.filter(name => name.trim().length > 0).length;
      const positionRatio = totalValidNames > 0 ? positionCount / totalValidNames : 0;
      
      if (positionRatio > 0.6) {
        nameValidation.warnings.push({
          code: 'ATHLETE_NAME_SUSPECT',
          message: 'Колонка имени содержит, похоже, позиции. Проверьте маппинг в профиле.',
          column: nameColumn.sourceHeader
        });
      }
    }

    // 4. Маппим в канонические данные
    const canonColumns = profileResult.mappedColumns.map(col => ({
      sourceHeader: col.sourceHeader,
      canonicalKey: col.canonicalKey,
      sourceUnit: undefined, // TODO: извлекать из профиля если нужно
      dimension: 'distance' as const, // TODO: получать из канона
      unitCanon: 'm', // TODO: получать из канона
    }));

    // TODO: Convert parsed.rows to dataRows format for mapRowsToCanonical
    const dataRows: Record<string, (string | number | null)[]> = {};
    const canonResult = { canonical: { rows: [], summary: {} } };

    // 5. Строим снапшот профиля
    const profileSnapshot = buildProfileSnapshot(typedProfile);

    // 6. Санитизация строк (если есть canonical данные)
    let sanitizedRows = parsed.rows;
    let sanitizationWarnings: any[] = [];
    
    if (canonResult.canonical.rows.length > 0) {
      // Получаем ключи метрик для санитизации
      const metricKeys = profileSnapshot.columns
        .filter(col => col.canonicalKey !== 'athlete_name' && col.isVisible)
        .map(col => col.canonicalKey);
      
      // Конвертируем canonical rows обратно в формат для санитизации
      const rowsForSanitization = canonResult.canonical.rows.map(row => {
        const sanitizedRow: Record<string, any> = {};
        profileSnapshot.columns.forEach(col => {
          sanitizedRow[col.canonicalKey] = row[col.canonicalKey];
        });
        return sanitizedRow;
      });
      
      const sanitizationResult = sanitizeRowsWithWarnings(rowsForSanitization, metricKeys, {});
      sanitizedRows = sanitizationResult.sanitizedRows;
      sanitizationWarnings = sanitizationResult.updatedImportMeta.warnings || [];
    }

    // 7. Собираем метаданные импорта
    const importMeta = {
      fileSize: file.size,
      rowCount: parsed.rows.length,
      warnings: [
        ...profileResult.warnings,
        ...nameValidation.warnings,
        ...sanitizationWarnings
      ],
      suggestions: nameValidation.suggestions,
      processingTimeMs: 0, // TODO: измерить время обработки
    };

    // 6. Сохраняем отчёт
    const [newReport] = await db
      .insert(gpsReport)
      .values({
        name: name.trim(),
        fileName: file.name,
        fileUrl: '', // TODO: сохранить файл в storage
        fileSize: file.size.toString(),
        gpsSystem: profile.gpsSystem,
        eventType,
        eventId,
        teamId,
        profileId,
        profileSnapshot,
        canonVersion: CANON.__meta.version,
        rawData: parsed.rows,
        processedData: {
          canonical: canonResult,
          profile: profileSnapshot,
        },
        importMeta,
        isProcessed: true,
        clubId: token.clubId,
        uploadedById: token.id,
      })
      .returning();

    return NextResponse.json({
      reportId: newReport.id,
      profileSnapshot: profileSnapshot.columns,
      warnings: importMeta.warnings,
      message: 'Отчёт успешно загружен'
    });

  } catch (error) {
    console.error('Ошибка при загрузке GPS отчёта:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
