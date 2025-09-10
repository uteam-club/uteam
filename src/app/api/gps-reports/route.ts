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
import { normalizeRowsForMapping } from '@/services/gps/normalizeRowsForMapping';
import { CANON } from '@/canon/metrics.registry';
import { validateAthleteNameColumn } from '@/services/gps/validators/nameColumn.validator';
import { sanitizeRowsWithWarnings } from '@/services/gps/sanitizers/rowSanitizer';
import { z } from 'zod';

// Схема валидации для загрузки отчёта
const UploadMetaSchema = z.object({
  eventId: z.string().uuid(),
  gpsSystem: z.string().min(1),
  profileId: z.string().uuid(),   // ← обязательно
  fileName: z.string().min(1),
  teamId: z.string().uuid(),
  eventType: z.enum(['TRAINING', 'MATCH']),
});

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

// POST - загрузка нового GPS отчета (ОБЯЗАТЕЛЬНЫЙ ПРОФИЛЬ)
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
    // Парсим данные в зависимости от content-type
    let meta: any = null;
    let file: File | null = null;
    const ct = request.headers.get('content-type') || '';
    
    if (ct.includes('application/json')) {
      // JSON запрос
      meta = await request.json();
    } else {
      // Multipart запрос
      const formData = await request.formData();
      file = formData.get('file') as File;
      const metaJson = formData.get('meta') as string;
      if (metaJson) {
        meta = JSON.parse(metaJson);
      }
    }

    // Валидация метаданных
    const parsed = UploadMetaSchema.safeParse(meta);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'PROFILE_REQUIRED', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { eventId, gpsSystem, profileId, fileName, teamId, eventType } = parsed.data;

    // Если JSON запрос, файл должен быть в meta
    if (ct.includes('application/json') && !file) {
      return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
    }

    // Загружаем профиль
    const [profile] = await db
      .select()
      .from(gpsProfile)
      .where(and(eq(gpsProfile.id, profileId), eq(gpsProfile.clubId, token.clubId)));

    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
    }

    // Построить snapshot (переносит displayUnit)
    const profileSnapshot = buildProfileSnapshot(profile as any);

    // Распарсить файл (headers?: string[], rows: any[][] | any[])
    if (!file) {
      return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
    }
    
    const buffer = await file.arrayBuffer();
    const parsedFile = await parseSpreadsheet(Buffer.from(buffer), file.name);
    const { headers, rows } = parsedFile;

    // Нормализация строк под snapshot
    const { objectRows, warnings: normWarnings, strategy } = normalizeRowsForMapping({
      rows,
      headers,
      snapshot: profileSnapshot,
    });

    // Канонизация
    const dataRows: Record<string, (string | number | null)[]> = {};
    objectRows.forEach((row, index) => {
      Object.keys(row).forEach(key => {
        if (!dataRows[key]) dataRows[key] = [];
        dataRows[key][index] = row[key];
      });
    });

    const canonResult = mapRowsToCanonical(dataRows, profileSnapshot.columns);

    // Создаём отчёт
    const [newReport] = await db
      .insert(gpsReport)
      .values({
        name: fileName,
        fileName: fileName,
        fileUrl: '', // TODO: сохранить файл в storage
        fileSize: file.size.toString(),
        gpsSystem,
        eventType,
        eventId,
        teamId,
        profileId,
        profileSnapshot,            // ← сохраняем snapshot
        rawData: rows,              // сырьё оставляем как есть
        processedData: {
          profile: {},              // для совместимости
          canonical: {
            rows: canonResult.canonical.rows,
            summary: canonResult.canonical.summary || {}
          },
        },
        canonVersion: '1.0.1',
        importMeta: {
          rowCount: rows?.length ?? 0,
          fileSize: file.size,
          normalize: { strategy, warnings: normWarnings },
          mapping: { warnings: canonResult.meta?.warnings || [] },
          suggestions: {},
          processingTimeMs: 0,
        },
        isProcessed: true,
        clubId: token.clubId,
        uploadedById: token.id,
      })
      .returning();

    return NextResponse.json({ id: newReport.id }, { status: 201 });

  } catch (error) {
    console.error('[gps-reports:POST] failed', error);
    return NextResponse.json({ error: 'INGEST_FAILED' }, { status: 500 });
  }
}
