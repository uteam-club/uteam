import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { gpsReport, gpsProfile, playerMapping } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const eventType = searchParams.get('eventType');
    const eventId = searchParams.get('eventId');

    if (!teamId || !eventId) {
      return NextResponse.json({ 
        ok: false, 
        reason: 'Missing required parameters: teamId and eventId are required' 
      });
    }

    // Поиск отчёта по тем же критериям, что и в основном API
    const report = await db.query.gpsReport.findFirst({
      where: and(
        eq(gpsReport.teamId, teamId),
        eq(gpsReport.eventId, eventId),
        eventType ? eq(gpsReport.eventType, eventType) : undefined
      ),
      orderBy: (gpsReport, { desc }) => [desc(gpsReport.createdAt)]
    });

    if (!report) {
      return NextResponse.json({ 
        ok: false, 
        reason: 'Report not found for the specified team and event' 
      });
    }

    // Загружаем профиль, если есть profileId
    let profile = null;
    if (report.profileId) {
      profile = await db.query.gpsProfile.findFirst({
        where: eq(gpsProfile.id, report.profileId)
      });
    }

    // Загружаем маппинги игроков для этого отчёта
    const mappings = await db.query.playerMapping.findMany({
      where: and(
        eq(playerMapping.teamId, teamId),
        eq(playerMapping.clubId, token.clubId)
      )
    });

    // Анализируем данные отчёта
    const rawData = report.rawData as any[] || [];
    const processedData = report.processedData as any || {};
    const canonical = processedData?.canonical || {};
    const canonicalRows = canonical?.rows || [];

    // Извлекаем имена из rawData (как в основном API)
    const totalInReportNames = rawData.length > 0 ? rawData.length - 1 : 0; // -1 для заголовка

    // Анализируем маппинги
    const selectedPlayerIds = mappings
      .filter(m => m.playerId)
      .map(m => m.playerId);
    
    const distinctSelectedPlayerIds = new Set(selectedPlayerIds).size;

    // Группируем дубликаты по playerId
    const playerIdGroups = new Map<string, string[]>();
    mappings.forEach(m => {
      if (m.playerId) {
        if (!playerIdGroups.has(m.playerId)) {
          playerIdGroups.set(m.playerId, []);
        }
        playerIdGroups.get(m.playerId)!.push(m.reportName);
      }
    });

    const duplicates = Array.from(playerIdGroups.entries())
      .filter(([_, reportNames]) => reportNames.length > 1)
      .map(([playerId, reportNames]) => ({
        playerId,
        count: reportNames.length,
        reportNames
      }));

    // Анализируем профиль
    const profileColumns = (profile?.columnMapping as any[]) || [];
    const mappedCanonicalKeys = profileColumns
      .filter((col: any) => col?.canonicalKey && col?.type !== 'formula')
      .map((col: any) => col.canonicalKey);

    // Анализируем canonical данные
    const sampleRawHeaders = rawData.length > 0 ? 
      Object.keys(rawData[0] || {}).slice(0, 10) : [];
    
    const sampleCanonicalKeys = canonicalRows.length > 0 ? 
      Object.keys(canonicalRows[0] || {}).slice(0, 10) : [];

    const metaCounts = canonical?.meta?.counts || null;
    const warnings = canonical?.meta?.warnings || [];

    // Вычисляем флаги
    const legacyNoCanonical = (rawData.length > 0) && (canonicalRows.length === 0);
    
    const missingColumns = mappedCanonicalKeys.filter(
      (key: string) => !sampleCanonicalKeys.includes(key)
    );
    
    const profileMismatch = missingColumns.length > 0;
    const noPlayerMapping = distinctSelectedPlayerIds === 0;

    // Формируем ответ
    const response = {
      ok: true,
      report: {
        id: report.id,
        createdAt: report.createdAt.toISOString(),
        gpsSystem: report.gpsSystem,
        profileId: report.profileId,
        profileName: profile?.name || null,
      },
      profile: profile ? {
        columnsTotal: profileColumns.length,
        mappedCanonicalKeys,
      } : null,
      mappings: {
        totalInReportNames,
        distinctSelectedPlayerIds,
        duplicates,
      },
      data: {
        rawRows: rawData.length,
        processedRows: Array.isArray(processedData) ? processedData.length : 0,
        canonicalRows: canonicalRows.length,
        sampleRawHeaders,
        sampleCanonicalKeys,
        metaCounts,
        warnings,
      },
      flags: {
        legacyNoCanonical,
        profileMismatch,
        missingColumns,
        noPlayerMapping,
      }
    };

    // Debug логи
    if (process.env.GPS_DEBUG === '1') {
      console.log('[GPS:DIAG] report=%o', report?.id);
      console.log('[GPS:DIAG] data=%o', { 
        raw: response.data.rawRows, 
        canon: response.data.canonicalRows, 
        meta: response.data.metaCounts 
      });
      console.log('[GPS:DIAG] warnings=', response.data.warnings);
      console.log('[GPS:DIAG] flags=%o', response.flags);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in GPS report diagnostics:', error);
    return NextResponse.json({ 
      ok: false, 
      reason: 'Internal server error' 
    }, { status: 500 });
  }
}
