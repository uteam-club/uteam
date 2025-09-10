import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { UploadMetaSchema, type UploadMeta } from "@/validators/gpsUpload.schema";
import { buildProfileSnapshot } from "@/services/gps/profileSnapshot.service";
import normalizeRowsForMapping from "@/services/gps/normalizeRowsForMapping";
import { mapRowsToCanonical } from "@/services/canon.mapper";
import { db } from "@/lib/db";
import { getGpsProfileById } from "@/services/gps.service";

function sanitizePlayerMappings(raw: UploadMeta["playerMappings"] | undefined) {
  const out: { sourceName: string; selectedPlayerId: string; confidence?: number }[] = [];
  const seen = new Set<string>();
  if (!raw) return out;

  for (const m of raw) {
    if (!m || !m.sourceName?.trim() || !m.selectedPlayerId) continue; // нужны оба поля
    const key = `${m.sourceName.trim().toLowerCase()}::${m.selectedPlayerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ sourceName: m.sourceName.trim(), selectedPlayerId: m.selectedPlayerId, confidence: m.confidence });
  }
  return out;
}

export async function POST(req: Request) {
  let step: string = 'start';
  const ctx: any = {};

  try {
    step = 'parse-form';
    const form = await req.formData();
    const file = form.get("file");
    const metaStr = form.get("meta");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
    }
    if (typeof metaStr !== "string") {
      return NextResponse.json({ error: "META_REQUIRED" }, { status: 400 });
    }

    step = 'parse-meta';
    let metaRaw: unknown;
    try {
      metaRaw = JSON.parse(String(metaStr));
    } catch (e: any) {
      return NextResponse.json({ error: 'META_PARSE_ERROR', message: e?.message || 'Bad JSON in meta' }, { status: 400 });
    }

    step = 'validate-meta';
    const metaValidation = UploadMetaSchema.safeParse(metaRaw);
    if (!metaValidation.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: metaValidation.error.flatten() }, { status: 400 });
    }
    const meta = metaValidation.data;
    
    // ЖЁСТКО отключаем сопоставления игроков на этапе ingest
    meta.playerMappings = [];

    // server-side sanitize mappings (теперь всегда пустой массив)
    const playerMappings = sanitizePlayerMappings(meta.playerMappings);

    step = 'load-profile';
    const profile = await getGpsProfileById(meta.profileId);
    if (!profile) {
      return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
    }

    step = 'build-snapshot';
    const snapshot = buildProfileSnapshot(profile as any);
    ctx.snapshotCols = snapshot?.columns?.length ?? 0;

    step = 'parse-file';
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // NOTE: используйте ваш реальный парсер (CSV/XLSX). Ниже — пример API:
    // const { headers, rows } = await parseSpreadsheet(bytes, meta.fileName);
    // Временно подстрахуемся: если парсер уже внутри normalizeRowsForMapping — прокинем bytes.
    const parsed = { headers: undefined as string[] | undefined, rows: undefined as any[] | undefined, bytes, fileName: meta.fileName };
    ctx.rawCount = parsed?.rows?.length ?? 0;

    step = 'normalize';
    let norm;
    try {
      const parsedSafe = {
        headers: Array.isArray(parsed?.headers) ? parsed.headers as string[] : [],
        rows: Array.isArray(parsed?.rows) ? parsed.rows as unknown[] : [],
      };
      norm = normalizeRowsForMapping(parsedSafe, snapshot);
      ctx.normalize = { strategy: norm.strategy, sizes: norm.sizes, warnings: norm.warnings };
    } catch (e: any) {
      ctx.errorAt = "normalize";
      ctx.normalizeError = String(e?.message ?? e);
      console.error("[gps-reports] normalize FAILED", { ctx });
      return NextResponse.json({ error: "UNEXPECTED", step: "normalize", message: ctx.normalizeError }, { status: 500 });
    }
    ctx.normCount = norm?.rows?.length ?? 0;

    step = 'map-to-canon';
    let canonical;
    try {
      // Convert normalizedRows to the format expected by mapRowsToCanonical
      const dataRows: Record<string, (string | number | null)[]> = {};
      norm.rows.forEach((row, index) => {
        Object.keys(row).forEach(key => {
          if (!dataRows[key]) dataRows[key] = [];
          dataRows[key][index] = row[key] as string | number | null;
        });
      });
      canonical = mapRowsToCanonical(dataRows, snapshot.columns);
    } catch (e) {
      console.error('[gps-reports] CANON_MAP_FAILED', e);
      return NextResponse.json(
        { error: 'CANON_MAP_FAILED', message: (e as Error).message },
        { status: 400 }
      );
    }
    ctx.canonCount = canonical?.canonical?.rows?.length ?? 0;

    // Фиксируем результаты для debug
    const rawHeaders = parsed?.headers;
    const rawRowsCount = parsed?.rows?.length ?? 0;
    const normalize = norm;
    const canon = canonical;

    // Детальный debug-объект
    const dbg = (() => {
      const snapCols = Array.isArray(snapshot?.columns) ? snapshot.columns : [];
      const visibleCols = snapCols.filter(c => c?.isVisible);
      const expectedHeaders = visibleCols.map(c => ({
        canonicalKey: c?.canonicalKey ?? null,
        sourceHeader: c?.sourceHeader ?? (c as any)?.mappedColumn ?? null,
        sourceIndex: typeof c?.sourceIndex === "number" ? c.sourceIndex : null
      }));

      const normStrategy = normalize?.strategy ?? null;
      const normHeaders = Array.isArray((normalize as any)?.headers) ? (normalize as any).headers : null;
      const firstNormRow = Array.isArray(normalize?.rows) && normalize.rows.length > 0
        ? normalize.rows[0]
        : null;

      // какие заголовки реально есть в первой нормализованной строке
      const firstNormKeys = firstNormRow && typeof firstNormRow === "object"
        ? Object.keys(firstNormRow)
        : null;

      // выявим, каких хедеров, требуемых снапшотом, нет в нормализованных данных
      const missingHeaders = (firstNormKeys && expectedHeaders.length)
        ? expectedHeaders
            .filter(h => h.sourceHeader && !firstNormKeys.includes(h.sourceHeader))
            .map(h => ({ canonicalKey: h.canonicalKey, missing: h.sourceHeader }))
        : [];

      // базовая статистика
      return {
        normalize: {
          strategy: normStrategy,
          headers: normHeaders,
          rows: Array.isArray(normalize?.rows) ? normalize.rows.length : 0,
          sampleRowKeys: firstNormKeys
        },
        snapshot: {
          columns: expectedHeaders,
          visibleCount: visibleCols.length,
          totalCount: snapCols.length
        },
        mapping: {
          canonRows: Array.isArray(canon?.canonical?.rows) ? canon.canonical.rows.length : 0,
          missingHeaders,
        }
      };
    })();

    if ((dbg.mapping?.canonRows ?? 0) === 0) {
      console.warn("[gps-reports] CANON_ROWS=0", dbg);
    }

    // Сохраняем debug в файл для анализа
    try {
      const fs = require('fs');
      const path = require('path');
      const debugPath = path.join(process.cwd(), 'artifacts', 'last-upload-debug.json');
      const debugData = {
        timestamp: new Date().toISOString(),
        meta: {
          eventId: meta.eventId,
          teamId: meta.teamId,
          profileId: meta.profileId,
          fileName: meta.fileName,
          eventType: meta.eventType
        },
        debug: dbg
      };
      
      // Создаем директорию если не существует
      const artifactsDir = path.dirname(debugPath);
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }
      
      fs.writeFileSync(debugPath, JSON.stringify(debugData, null, 2));
      console.log(`[gps-reports] Debug saved to ${debugPath}`);
    } catch (e) {
      console.warn("[gps-reports] Failed to save debug file", e);
    }

    step = 'persist';
    // Сохраните отчёт в БД как у вас принято:
    // верните ID созданного отчёта и нужные поля
    const report = { id: 'test-report-id' }; // TODO: Replace with actual DB insert
    
    // Если сохраняем importMeta — добавим мягкое предупреждение:
    const importMeta = {
      eventType: meta.eventType,
      playerMappingsApplied: playerMappings.length,
      playerMappings,
      playerMappingsIgnored: true,
      warnings: [
        { code: 'PLAYER_MAPPINGS_IGNORED', message: 'Player mappings skipped at ingest for stability' }
      ]
    };

    const canonRowsCount = Array.isArray(canonical?.canonical?.rows) ? canonical.canonical.rows.length : 0;
    try {
      // если используем tag-ориентированные выборки — раскомментируй и подставь нужный тег
      // revalidateTag(`gps-events:${meta.teamId}:${meta.eventType}`);
      await revalidatePath("/dashboard/fitness/gps-reports");
    } catch (e) {
      console.warn("[gps-reports] revalidate failed", e);
    }

    return NextResponse.json({
      ok: true,
      reportId: report.id,
      eventId: meta.eventId,
      canonRows: Array.isArray(canon?.canonical?.rows) ? canon.canonical.rows.length : 0,
      debug: dbg
    }, { status: 200 });
  } catch (err) {
    const e = err as Error & { code?: string };
    const isValidation =
      e.code?.endsWith('_REQUIRED') ||
      e.code === 'VALIDATION_ERROR' ||
      (e.name === 'ZodError');

    console.error('[gps-reports] FAILED', { step, ctx, err: e });

    return NextResponse.json(
      {
        error: e.code ?? 'UNEXPECTED',
        step,
        message: e.message,
        // только в dev — контекст для отладки
        debug: process.env.NODE_ENV !== 'production' ? ctx : undefined,
      },
      { status: isValidation ? 400 : 500 }
    );
  }
}