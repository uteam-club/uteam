import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../lib/db';
import { buildProfileSnapshot } from '../../../services/gps/profileSnapshot.service';
import { normalizeRowsForMapping } from '../../../services/gps/normalizeRowsForMapping';
import { mapRowsToCanonical } from '../../../services/canon.mapper';
import { parseSpreadsheet } from '../../../services/gps/ingest.service';

const PlayerMappingSchema = z.object({
  sourceName: z.string().min(1),
  selectedPlayerId: z.string().uuid(),
  confidence: z.number().min(0).max(1).optional(),
});

const UploadMetaSchema = z.object({
  eventId: z.string().uuid(),
  teamId: z.string().uuid(),
  gpsSystem: z.string().min(1),
  profileId: z.string().uuid(),
  fileName: z.string().min(1),
  eventType: z.enum(['TRAINING','MATCH']),
  playerMappings: z.array(PlayerMappingSchema).default([]),
});

export async function POST(req: Request) {
  const ctx: Record<string, unknown> = { step: 'start' };
  try {
    // 1) FormData: допускаем ТОЛЬКО file + meta
    const form = await req.formData();
    const entries = ['file', 'meta']; // упрощенная версия для отладки
    ctx.keys = entries;
    const file = form.get('file');
    const metaStr = form.get('meta');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error:'FILE_REQUIRED' }, { status:400 });
    }
    if (typeof metaStr !== 'string') {
      return NextResponse.json({ error:'META_REQUIRED' }, { status:400 });
    }
    ctx.step = 'parse-meta';
    let meta = JSON.parse(metaStr);
    const parsed = UploadMetaSchema.safeParse(meta);
    if (!parsed.success) {
      return NextResponse.json({ error:'VALIDATION_ERROR', details: parsed.error.flatten() }, { status:400 });
    }
    meta = parsed.data;
    ctx.meta = { eventId: meta.eventId, teamId: meta.teamId, gpsSystem: meta.gpsSystem, profileId: meta.profileId, pmCount: meta.playerMappings.length };

    // 2) Профиль → снапшот
    ctx.step = 'load-profile';
    // TODO: заменить на правильный запрос к БД
    const profile = { 
      id: meta.profileId, 
      name: 'Test Profile', 
      gpsSystem: meta.gpsSystem,
      columnMapping: [],
      createdAt: new Date()
    };
    if (!profile) {
      return NextResponse.json({ error:'PROFILE_NOT_FOUND' }, { status:404 });
    }
    ctx.step = 'build-snapshot';
    const snapshot = buildProfileSnapshot(profile as any);
    ctx.snapshotCols = snapshot.columns.length;

    // 3) Парсинг файла (xlsx/csv) → rawRows
    ctx.step = 'parse-file';
    const arrayBuf = await file.arrayBuffer();
    const { headers, rows } = await parseSpreadsheet(Buffer.from(arrayBuf), meta.fileName);
    ctx.rawHeaders = Array.isArray(headers) ? headers.length : 0;
    ctx.rawRows = Array.isArray(rows) ? rows.length : 0;

    // 4) Нормализация
    ctx.step = 'normalize';
    const norm = normalizeRowsForMapping({ headers, rows, snapshot });
    ctx.normRows = norm.objectRows.length;

    // 5) Канонизация
    ctx.step = 'map-to-canon';
    const dataRows: Record<string, (string | number | null)[]> = {};
    norm.objectRows.forEach((row, index) => {
      Object.keys(row).forEach(key => {
        if (!dataRows[key]) dataRows[key] = [];
        dataRows[key][index] = row[key];
      });
    });
    const canon = mapRowsToCanonical(dataRows, snapshot.columns);
    ctx.canonRows = canon.canonical.rows.length;

    // 6) Сохранение в БД
    ctx.step = 'persist';
    // TODO: заменить на правильную вставку в БД
    const report = { id: 'test-report-id' };

    return NextResponse.json({ ok: true, id: report.id, stats: { raw: ctx.rawRows, norm: ctx.normRows, canon: ctx.canonRows } });
  } catch (e: any) {
    console.error('[gps-reports] 500', { ...ctx, error: e?.message, stack: e?.stack });
    return NextResponse.json(
      { error:'UNEXPECTED', step: ctx.step, message: e?.message, stats: { raw: ctx.rawRows, norm: ctx.normRows, canon: ctx.canonRows }, debug: process.env.NODE_ENV !== 'production' ? ctx : undefined },
      { status:500 }
    );
  }
}