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


/**
 * Превращает rows (матрицу или массив объектов) в колоночный формат:
 * { [canonicalKey]: (string|number|null)[] }
 */
function makeDataRows(rows: any, columns: any[], headers?: string[]) {
  const out: Record<string, (string | number | null)[]> = {} as any;
  for (const col of columns) out[col.canonicalKey] = [];

  if (!Array.isArray(rows) || rows.length === 0) return out;

  // Матрица: rows[0] — массив ячеек
  if (Array.isArray(rows[0])) {
    const headerIndex: Record<string, number> = {} as any;
    (headers || []).forEach((h, i) => { if (h != null) headerIndex[String(h)] = i; });

    for (const row of rows as any[]) {
      for (const col of columns) {
        const idx = headerIndex[col.sourceHeader];
        const val = (idx !== undefined) ? row[idx] : null;
        out[col.canonicalKey].push((val === undefined) ? null : (val as any));
      }
    }
  } else {
    // Массив объектов
    for (const r of rows as any[]) {
      for (const col of columns) {
        const val = (r as any)[col.sourceHeader];
        out[col.canonicalKey].push((val === undefined) ? null : (val as any));
      }
    }
  }
  return out;
}
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

    // 3. Маппим в канонические данные
    const canonColumns = profileResult.mappedColumns.map(col => ({
      sourceHeader: col.sourceHeader,
      canonicalKey: col.canonicalKey,
      sourceUnit: undefined, // TODO: извлекать из профиля если нужно
      dimension: 'distance' as const, // TODO: получать из канона
      unitCanon: 'm', // TODO: получать из канона
    }));

// Приводим canonColumns к формату ProfileSnapshotColumn для mapRowsToCanonical
const snapshotCols = (canonColumns as any[]).map(c => ({
  sourceHeader: c.sourceHeader ?? c.canonicalKey,
  canonicalKey: c.canonicalKey,
  displayName: (c.displayName ?? c.name ?? c.canonicalKey) as string,
  order: (Number.isFinite(c.order) ? c.order : 0) as number,
  isVisible: (c.isVisible ?? true) as boolean,
  unit: c.unit ?? c.unitCanon ?? c.sourceUnit ?? undefined,
  transform: c.transform ?? null
}));
    const canonResult = mapRowsToCanonical(makeDataRows(parsed.rows, snapshotCols, (parsed as any).headers), snapshotCols);

    // 4. Строим снапшот профиля
    const profileSnapshot = buildProfileSnapshot(typedProfile);

    // 5. Собираем метаданные импорта
    const importMeta = {
      fileSize: file.size,
      rowCount: parsed.rows.length,
      warnings: profileResult.warnings.concat(canonResult.meta.warnings),
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
