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

// PATCH: схемы валидации загрузки
const PlayerMappingSchema = z.object({
  sourceName: z.string().min(1),
  selectedPlayerId: z.string().uuid(),
  confidence: z.number().min(0).max(1).optional(),
  action: z.enum(['confirm', 'create']).optional(),
});

const UploadMetaSchema = z.object({
  eventId: z.string().uuid(),
  teamId: z.string().uuid(),
  gpsSystem: z.string().min(1),
  profileId: z.string().uuid(),
  fileName: z.string().min(1),
  eventType: z.enum(['TRAINING', 'MATCH']),
  playerMappings: z.array(PlayerMappingSchema).default([]),
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

// POST - загрузка нового GPS отчета (ТОЛЬКО file + meta)
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
    const file = formData.get('file');
    const metaRaw = formData.get('meta');

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
    }
    if (typeof metaRaw !== 'string') {
      return NextResponse.json({ error: 'META_REQUIRED' }, { status: 400 });
    }

    let metaJson: unknown;
    try {
      metaJson = JSON.parse(metaRaw);
    } catch {
      return NextResponse.json({ error: 'META_PARSE_ERROR' }, { status: 400 });
    }

    const parsed = UploadMetaSchema.safeParse(metaJson);
    if (!parsed.success) {
      console.error('[gps-reports:create] validation failed', parsed.error.flatten());
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const meta = parsed.data;

    // --- далее твой текущий пайплайн ---
    // 1) достаём профиль по meta.profileId
    const [profile] = await db
      .select()
      .from(gpsProfile)
      .where(and(eq(gpsProfile.id, meta.profileId), eq(gpsProfile.clubId, token.clubId)));

    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
    }

    // 2) строим snapshot (buildProfileSnapshot)
    const profileSnapshot = buildProfileSnapshot(profile as any);

    // 3) парсим файл → rawRows (+headers)
    const buffer = await file.arrayBuffer();
    const parsedFile = await parseSpreadsheet(Buffer.from(buffer), file.name);
    const { headers, rows } = parsedFile;

    // 4) normalizeRowsForMapping(...)
    const { objectRows, warnings: normWarnings, strategy } = normalizeRowsForMapping({
      rows,
      headers,
      snapshot: profileSnapshot,
    });

    // 5) mapRowsToCanonical(...)
    const dataRows: Record<string, (string | number | null)[]> = {};
    objectRows.forEach((row, index) => {
      Object.keys(row).forEach(key => {
        if (!dataRows[key]) dataRows[key] = [];
        dataRows[key][index] = row[key];
      });
    });

    const canonResult = mapRowsToCanonical(dataRows, profileSnapshot.columns);

    // 6) сохраняем GpsReport с profileSnapshot и processedData
    const [newReport] = await db
      .insert(gpsReport)
      .values({
        name: meta.fileName,
        fileName: meta.fileName,
        fileUrl: '', // TODO: сохранить файл в storage
        fileSize: file.size.toString(),
        gpsSystem: meta.gpsSystem,
        eventType: meta.eventType,
        eventId: meta.eventId,
        teamId: meta.teamId,
        profileId: meta.profileId,
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
          playerMappingsApplied: meta.playerMappings.length, // 7) в importMeta можно положить
          suggestions: {},
          processingTimeMs: 0,
        },
        isProcessed: true,
        clubId: token.clubId,
        uploadedById: token.id,
      })
      .returning();

    // Верни 201/JSON с результатом
    return NextResponse.json({ id: newReport.id }, { status: 201 });

  } catch (e) {
    console.error('[gps-reports:create] unexpected', e);
    return NextResponse.json({ error: 'UNEXPECTED' }, { status: 500 });
  }
}
