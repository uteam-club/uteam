import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gpsReportShare, gpsReport, gpsReportData, gpsCanonicalMetric } from '@/db/schema';
import { training } from '@/db/schema/training';
import { trainingCategory } from '@/db/schema/trainingCategory';
import { match } from '@/db/schema/match';
import { team } from '@/db/schema/team';
import { gpsVisualizationProfile, gpsProfileColumn } from '@/db/schema/gpsColumnMapping';
import { eq, and, inArray, desc, gte, ne } from 'drizzle-orm';
import { convertUnit } from '@/lib/unit-converter';

// GET /api/gps/public/reports/{shareId} - fetch public visualization payload by shareId
export async function GET(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const shareId = params.shareId;

    const [share] = await db
      .select()
      .from(gpsReportShare)
      .where(eq(gpsReportShare.id, shareId));

    if (!share) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (share.revokedAt) {
      return NextResponse.json({ error: 'Link revoked' }, { status: 410 });
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }

    // Load report
    const [report] = await db
      .select()
      .from(gpsReport)
      .where(eq(gpsReport.id, share.reportId));

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Load profile
    const [profile] = await db
      .select()
      .from(gpsVisualizationProfile)
      .where(eq(gpsVisualizationProfile.id, share.profileId));

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileColumns = await db
      .select({
        id: gpsProfileColumn.id,
        canonicalMetricId: gpsProfileColumn.canonicalMetricId,
        displayName: gpsProfileColumn.displayName,
        displayUnit: gpsProfileColumn.displayUnit,
        displayOrder: gpsProfileColumn.displayOrder,
        isVisible: gpsProfileColumn.isVisible,
        canonicalMetricCode: gpsCanonicalMetric.code,
        canonicalMetricName: gpsCanonicalMetric.name,
        canonicalUnit: gpsCanonicalMetric.canonicalUnit,
      })
      .from(gpsProfileColumn)
      .leftJoin(gpsCanonicalMetric, eq(gpsProfileColumn.canonicalMetricId, gpsCanonicalMetric.id))
      .where(eq(gpsProfileColumn.profileId, share.profileId))
      .orderBy(gpsProfileColumn.displayOrder);

    // Load report data rows
    const rows = await db
      .select()
      .from(gpsReportData)
      .where(eq(gpsReportData.gpsReportId, report.id));

    // Build players data
    const profileColumnsMap = new Map<string, any>();
    for (const col of profileColumns) {
      if (col.canonicalMetricCode) profileColumnsMap.set(col.canonicalMetricCode, col);
    }

    const playersData = new Map<string, any>();
    const playerIds = new Set<string>();
    for (const item of rows) {
      playerIds.add(item.playerId);
    }

    // Player names are derived elsewhere; keep fallback name
    for (const item of rows) {
      const pid = item.playerId;
      if (!playersData.has(pid)) {
        playersData.set(pid, {
          id: `player-${pid}`,
          playerId: pid,
          playerName: `Player ${pid.slice(-4)}`,
          playerData: {},
          isEdited: false,
          lastEditedAt: null,
        });
      }
      const profileColumn = profileColumnsMap.get(item.canonicalMetric);
      if (profileColumn) {
        if (profileColumn.canonicalMetricCode === 'athlete_name' || profileColumn.canonicalMetricCode === 'position') {
          playersData.get(pid).playerData[profileColumn.canonicalMetricCode] = {
            value: item.value,
            unit: profileColumn.displayUnit,
          };
        } else {
          let convertedValue = parseFloat(item.value);
          let displayUnit = profileColumn.displayUnit;
          if (item.unit !== displayUnit) {
            const converted = convertUnit(convertedValue, item.unit, displayUnit);
            if (typeof converted === 'number' && !isNaN(converted)) convertedValue = converted; else displayUnit = item.unit;
          }
          playersData.get(pid).playerData[profileColumn.canonicalMetricCode] = {
            value: convertedValue,
            unit: displayUnit,
          };
        }
      }
    }

    const visualizationData = Array.from(playersData.values());

    // Event info
    let eventInfo: any = null;
    try {
      if (report.eventType === 'training') {
        const [trainingData] = await db
          .select({
            id: training.id,
            title: training.title,
            date: training.date,
            time: training.time,
            categoryId: training.categoryId,
            categoryName: trainingCategory.name,
            type: training.type,
          })
          .from(training)
          .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
          .where(eq(training.id, report.eventId));
        eventInfo = trainingData || null;
      } else if (report.eventType === 'match') {
        const [matchData] = await db
          .select({
            id: match.id,
            date: match.date,
            time: match.time,
            competitionType: match.competitionType,
            isHome: match.isHome,
            teamGoals: match.teamGoals,
            opponentGoals: match.opponentGoals,
            opponentName: match.opponentName,
            teamName: team.name,
          })
          .from(match)
          .leftJoin(team, eq(match.teamId, team.id))
          .where(eq(match.id, report.eventId));
        eventInfo = matchData || null;
      }
    } catch {}

    // Team averages (averageable metrics only)
    const averageableMetrics = await db
      .select({ code: gpsCanonicalMetric.code })
      .from(gpsCanonicalMetric)
      .where(and(eq(gpsCanonicalMetric.isActive, true), eq(gpsCanonicalMetric.isAverageable, true)));
    const avgCodes = new Set(averageableMetrics.map(m => m.code));
    const avgColumns = profileColumns.filter(c => c.canonicalMetricCode && avgCodes.has(c.canonicalMetricCode));

    const currentAverages: Record<string, number> = {};
    for (const col of avgColumns) {
      const values: number[] = [];
      for (const row of rows) {
        if (row.canonicalMetric === col.canonicalMetricCode) {
          const v = parseFloat(row.value);
          if (!isNaN(v)) values.push(v);
        }
      }
      currentAverages[col.canonicalMetricCode!] = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    }

    // Historical team averages selection
    let historicalReports: { id: string }[] = [];
    let categoryInfo: any = null;
    if (report.eventType === 'match') {
      const [currentMatch] = await db
        .select({ id: match.id, teamId: match.teamId, date: match.date })
        .from(match)
        .where(eq(match.id, report.eventId));
      if (currentMatch) {
        historicalReports = await db
          .select({ id: gpsReport.id })
          .from(gpsReport)
          .leftJoin(match, eq(gpsReport.eventId, match.id))
          .where(and(eq(gpsReport.eventType, 'match'), eq(match.teamId, currentMatch.teamId), ne(gpsReport.id, report.id)))
          .orderBy(desc(match.date))
          .limit(10);
        categoryInfo = {
          name: `Последние ${historicalReports.length} матчей`,
          eventCount: historicalReports.length,
          reportCount: historicalReports.length,
          type: 'match' as const,
        };
      }
    } else {
      const [currentTraining] = await db
        .select({ categoryId: training.categoryId, categoryName: trainingCategory.name, date: training.date })
        .from(training)
        .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
        .where(eq(training.id, report.eventId));
      if (currentTraining) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        historicalReports = await db
          .select({ id: gpsReport.id })
          .from(gpsReport)
          .leftJoin(training, eq(gpsReport.eventId, training.id))
          .where(and(eq(gpsReport.eventType, 'training'), eq(training.categoryId, currentTraining.categoryId), gte(gpsReport.createdAt, thirtyDaysAgo)))
          .orderBy(desc(gpsReport.createdAt));
        categoryInfo = {
          name: currentTraining.categoryName || 'Тренировки',
          eventCount: historicalReports.length,
          reportCount: historicalReports.length,
          type: 'training' as const,
        };
      }
    }

    const historicalReportIds = historicalReports.map(r => r.id);
    const historicalReportDataRows = historicalReportIds.length
      ? await db
          .select()
          .from(gpsReportData)
          .where(inArray(gpsReportData.gpsReportId, historicalReportIds))
      : [];

    const historicalAverages: Record<string, number> = {};
    for (const col of avgColumns) {
      const values: number[] = [];
      for (const dataRow of historicalReportDataRows) {
        if (dataRow.canonicalMetric === col.canonicalMetricCode) {
          const v = parseFloat(dataRow.value);
          if (!isNaN(v)) values.push(v);
        }
      }
      historicalAverages[col.canonicalMetricCode!] = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    }

    const hasHistoricalData = Object.values(historicalAverages).some(v => v > 0);

    // Historical data (last 30 days) for sparkline: gather all rows for playerIds and metrics in profile
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const metricCodes = profileColumns.map(c => c.canonicalMetricCode).filter(Boolean) as string[];
    let historicalRows: any[] = [];
    if (playerIds.size && metricCodes.length) {
      historicalRows = await db
        .select({
          playerId: gpsReportData.playerId,
          metric: gpsReportData.canonicalMetric,
          value: gpsReportData.value,
          createdAt: gpsReport.createdAt,
        })
        .from(gpsReportData)
        .innerJoin(gpsReport, eq(gpsReportData.gpsReportId, gpsReport.id))
        .where(and(inArray(gpsReportData.playerId, Array.from(playerIds)), inArray(gpsReportData.canonicalMetric, metricCodes), gte(gpsReport.createdAt, since)) )
        .orderBy(desc(gpsReport.createdAt));
    }

    const historicalData: Record<string, Record<string, number[]>> = {};
    for (const pid of playerIds) {
      historicalData[pid] = {};
    }
    for (const col of profileColumns) {
      if (!col.canonicalMetricCode) continue;
      for (const pid of playerIds) {
        const vals = historicalRows
          .filter(r => r.playerId === pid && r.metric === col.canonicalMetricCode)
          .slice(0, 5)
          .map(r => parseFloat(r.value))
          .reverse();
        historicalData[pid][col.canonicalMetricCode] = vals;
      }
    }

    // Increment counters (best-effort)
    try {
      await db
        .update(gpsReportShare)
        .set({
          views: (share.views || 0) + 1,
          lastViewedAt: new Date()
        })
        .where(eq(gpsReportShare.id, shareId));
    } catch {}

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        expiresAt: share.expiresAt,
        options: share.options || null,
      },
      report: {
        id: report.id,
        name: report.name,
        fileName: report.fileName,
        gpsSystem: report.gpsSystem,
        eventType: report.eventType,
        teamId: report.teamId,
        eventId: report.eventId,
        playersCount: report.playersCount,
        createdAt: report.createdAt,
      },
      event: eventInfo,
      profile: {
        id: profile.id,
        name: profile.name,
        description: (profile as any).description,
        columns: profileColumns.map(col => ({
          id: col.id,
          canonicalMetricId: col.canonicalMetricId,
          canonicalMetricCode: col.canonicalMetricCode,
          canonicalMetricName: col.canonicalMetricName,
          displayName: col.displayName,
          displayUnit: col.displayUnit,
          displayOrder: col.displayOrder,
          isVisible: col.isVisible,
        })),
      },
      data: visualizationData,
      teamAverages: {
        currentAverages,
        historicalAverages,
        metrics: avgColumns.map(col => ({
          canonicalMetricCode: col.canonicalMetricCode!,
          displayName: col.displayName,
          displayUnit: col.displayUnit,
          canAverage: true,
        })),
        playerCount: rows.length,
        categoryInfo: categoryInfo || undefined,
        hasHistoricalData,
      },
      historicalData,
    });
  } catch (error) {
    console.error('Error fetching public GPS report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


