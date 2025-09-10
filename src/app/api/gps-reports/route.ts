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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get('file');
    const metaRaw = formData.get('meta');

    if (!(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: 'FILE_REQUIRED' }), { status: 400 });
    }
    if (typeof metaRaw !== 'string') {
      return new Response(JSON.stringify({ error: 'META_REQUIRED' }), { status: 400 });
    }

    let meta: z.infer<typeof UploadMetaSchema>;
    try {
      meta = JSON.parse(metaRaw);
    } catch {
      return new Response(JSON.stringify({ error: 'META_PARSE_ERROR' }), { status: 400 });
    }

    const parsed = UploadMetaSchema.safeParse(meta);
    if (!parsed.success) {
      console.error('[gps-reports] VALIDATION_ERROR', parsed.error.flatten());
      return new Response(JSON.stringify({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }), { status: 400 });
    }

    console.debug('[gps-reports] meta.received', meta);

    // 1) Профиль
    const [profile] = await db
      .select()
      .from(gpsProfile)
      .where(and(eq(gpsProfile.id, meta.profileId), eq(gpsProfile.clubId, 'club-id'))); // TODO: получить из токена

    if (!profile) {
      return new Response(JSON.stringify({ error: 'PROFILE_NOT_FOUND' }), { status: 404 });
    }

    const snapshot = buildProfileSnapshot(profile as any);

    // 2) Парс файла (получи rows+headers, как у тебя сделано)
    const arrayBuffer = await file.arrayBuffer();
    const { headers, rows } = await parseSpreadsheet(Buffer.from(arrayBuffer), meta.fileName);

    // 3) Нормализация под снапшот
    const normalized = normalizeRowsForMapping({ headers, rows, snapshot });

    // 4) Канонизация
    const dataRows: Record<string, (string | number | null)[]> = {};
    normalized.objectRows.forEach((row, index) => {
      Object.keys(row).forEach(key => {
        if (!dataRows[key]) dataRows[key] = [];
        dataRows[key][index] = row[key];
      });
    });

    const canonical = mapRowsToCanonical(dataRows, snapshot.columns);

    // 5) Сохранить отчёт
    const [created] = await db
      .insert(gpsReport)
      .values({
        name: meta.fileName,
        fileName: meta.fileName,
        fileUrl: '',
        fileSize: file.size.toString(),
        gpsSystem: meta.gpsSystem,
        eventType: meta.eventType,
        eventId: meta.eventId,
        teamId: meta.teamId,
        profileId: meta.profileId,
        profileSnapshot: snapshot,
        rawData: { headers, rows },
        processedData: {
          profile: snapshot,
          canonical: canonical.canonical,
          rawData: { headers, rows }
        },
        canonVersion: '1.0.1',
        importMeta: {
          playerMappingsApplied: meta.playerMappings?.length ?? 0,
          rowCount: rows?.length ?? 0,
          fileSize: file.size,
          normalize: { strategy: normalized.strategy, warnings: normalized.warnings },
          mapping: { warnings: canonical.meta?.warnings || [] },
          suggestions: {},
          processingTimeMs: 0,
        },
        isProcessed: true,
        clubId: 'club-id', // TODO: получить из токена
        uploadedById: 'user-id', // TODO: получить из токена
      })
      .returning();

    return new Response(JSON.stringify({ ok: true, id: created.id }), { status: 201 });
  } catch (e: any) {
    console.error('[gps-reports] UNEXPECTED', e);
    return new Response(JSON.stringify({ error: 'UNEXPECTED', message: e?.message ?? String(e) }), { status: 500 });
  }
}
