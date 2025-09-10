import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { db } from '@/lib/db';
import { gpsReport, gpsProfile } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { mapRowsToCanonical } from '@/services/canon.mapper';

type RecalcRequest = {
  profileId: string;
  days?: number | null;
  dryRun?: boolean;
  newKeys?: string[];
  batchSize?: number;
  cursor?: string;
};

type RecalcResult = {
  total: number;
  matched: number;
  updated: number;
  skipped: number;
  errors: string[];
  dryRun: boolean;
  stats: {
    batches: number;
    batchSize: number;
  };
};

// Функция для извлечения строк из processedData или rawData
function tryExtractRowsForMapping(processedData: any, rawData: any): Record<string, any>[] {
  // Сначала пробуем извлечь из processedData
  if (processedData?.rows && Array.isArray(processedData.rows)) {
    return processedData.rows;
  }
  
  // Если нет, пробуем из rawData
  if (rawData?.rows && Array.isArray(rawData.rows)) {
    return rawData.rows;
  }
  
  // Если и это не сработало, возвращаем пустой массив
  return [];
}

// Функция для получения ключа строки по имени игрока
function getRowKey(row: Record<string, any>): string {
  // Сначала пробуем playerId, если есть
  if (row.playerId) {
    return `id:${row.playerId}`;
  }
  
  // Иначе используем нормализованное имя
  const norm = (s: string = '') => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const name = row.athlete_name ?? row.name ?? row.player ?? '';
  return `n:${norm(name)}`;
}

// Функция для слияния канонических данных
function mergeCanonicalData(
  existingCanonical: any,
  newCanonicalRows: Record<string, any>[],
  newKeys: string[]
): any {
  const target = existingCanonical?.rows ?? [];
  const index = new Map(target.map((r: any) => [getRowKey(r), r]));

  for (const src of newCanonicalRows) {
    const k = getRowKey(src);
    if (!k) continue;
    
    let dst = index.get(k) as Record<string, any>;
    if (!dst) {
      dst = {};
      index.set(k, dst);
    }
    
    // Обновляем имя игрока
    dst.athlete_name = src.athlete_name ?? dst.athlete_name ?? src.name ?? src.player ?? '';
    
    // Добавляем только новые метрики
    for (const key of Object.keys(src)) {
      if (key === 'athlete_name' || key === 'name' || key === 'player') continue;
      
      if (newKeys.includes(key) && dst[key] === undefined) {
        dst[key] = src[key];
      }
    }
  }

  return {
    ...existingCanonical,
    rows: Array.from(index.values()),
    version: newCanonicalRows[0]?.version || existingCanonical?.version || '1.0.1',
    units: newCanonicalRows[0]?.units || existingCanonical?.units || {},
    profileId: existingCanonical?.profileId,
    gpsSystem: existingCanonical?.gpsSystem,
    warnings: [...(existingCanonical?.warnings || []), ...(newCanonicalRows[0]?.warnings || [])].slice(0, 100)
  };
}

export async function POST(request: NextRequest) {
  try {
    // Авторизация
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'gpsReports.update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Проверка доступа к клубу
    const host = request.headers.get('host') || '';
    const subdomain = getSubdomain(host);
    if (!subdomain) {
      return NextResponse.json({ error: 'Invalid subdomain' }, { status: 400 });
    }
    const club = await getClubBySubdomain(subdomain);
    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const body: RecalcRequest = await request.json();
    const { profileId, days, dryRun = true, newKeys = [], batchSize = 200 } = body;

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    if (newKeys.length === 0) {
      return NextResponse.json({ error: 'newKeys cannot be empty' }, { status: 400 });
    }

    // Получаем профиль и проверяем принадлежность к клубу
    const profile = await db.query.gpsProfile.findFirst({
      where: and(
        eq(gpsProfile.id, profileId),
        eq(gpsProfile.clubId, club.id)
      )
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Строим канонические колонки и фильтруем по newKeys
    // TODO: Implement buildCanonColumns or use alternative approach
    const allCanonColumns: any[] = [];
    const filteredCanonColumns = allCanonColumns.filter(col => newKeys.includes(col.canonicalKey));

    if (filteredCanonColumns.length === 0) {
      return NextResponse.json({ error: 'No matching canonical columns found' }, { status: 400 });
    }

    // Строим условие для фильтрации по дате
    const dateCondition = days ? gte(gpsReport.createdAt, new Date(Date.now() - days * 24 * 60 * 60 * 1000)) : undefined;
    
    // Получаем отчёты
    const reports = await db.query.gpsReport.findMany({
      where: and(
        eq(gpsReport.profileId, profileId),
        dateCondition
      ),
      orderBy: (gpsReport, { desc }) => [desc(gpsReport.createdAt)]
    });

    const result: RecalcResult = {
      total: reports.length,
      matched: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      dryRun,
      stats: {
        batches: Math.ceil(reports.length / batchSize),
        batchSize
      }
    };

    // Обрабатываем отчёты батчами
    for (let i = 0; i < reports.length; i += batchSize) {
      const batch = reports.slice(i, i + batchSize);
      
      for (const report of batch) {
      try {
        // Извлекаем строки данных
        const rows = tryExtractRowsForMapping(report.processedData, report.rawData);
        
        if (rows.length === 0) {
          result.skipped++;
          continue;
        }

        result.matched++;

        if (dryRun) {
          continue; // В dry-run режиме только считаем
        }

        // Применяем каноническое маппинг
        // TODO: Convert rows to proper format for mapRowsToCanonical
        const canonRows: any[] = [];

        if (canonRows.length === 0) {
          result.skipped++;
          continue;
        }

        // Сливаем с существующими каноническими данными
        const existingCanonical = (report.processedData as any)?.canonical;
        const mergedCanonical = mergeCanonicalData(existingCanonical, canonRows, newKeys);

        // Обновляем processedData
        const updatedProcessedData = {
          ...(report.processedData as any || {}),
          canonical: mergedCanonical
        };

        // Сохраняем в БД
        await db.update(gpsReport)
          .set({ processedData: updatedProcessedData })
          .where(eq(gpsReport.id, report.id));

        result.updated++;
      } catch (error) {
        console.error(`Error processing report ${report.id}:`, error);
        result.errors.push(`Report ${report.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

      // Небольшая задержка между батчами для разгрузки event-loop
      if (i + batchSize < reports.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Логируем результат
    const daysStr = days === null ? 'all' : days?.toString() || 'all';
    console.info(`[gps-recalc] profile=${profileId} days=${daysStr} dryRun=${dryRun} matched=${result.matched} updated=${result.updated} skipped=${result.skipped}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Recalculation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
