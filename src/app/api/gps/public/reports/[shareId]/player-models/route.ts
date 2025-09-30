import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gpsReportShare, gpsReport, gpsReportData, playerGameModel } from '@/db/schema';
import { player } from '@/db/schema/player';
import { gpsCanonicalMetric } from '@/db/schema/gpsCanonicalMetric';
import { gpsVisualizationProfile, gpsProfileColumn } from '@/db/schema/gpsColumnMapping';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const shareId = params.shareId;
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Load share
    const [share] = await db.select().from(gpsReportShare).where(eq(gpsReportShare.id, shareId));
    if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (share.revokedAt) return NextResponse.json({ error: 'Link revoked' }, { status: 410 });
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) return NextResponse.json({ error: 'Link expired' }, { status: 410 });

    // Load report
    const [report] = await db
      .select({ 
        id: gpsReport.id,
        teamId: gpsReport.teamId,
        clubId: gpsReport.clubId,
        eventType: gpsReport.eventType,
        eventId: gpsReport.eventId,
      })
      .from(gpsReport)
      .where(eq(gpsReport.id, share.reportId));
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    if (report.eventType !== 'match') {
      return NextResponse.json({ error: 'Игровые модели доступны только для матчей' }, { status: 400 });
    }

    // Profile and columns
    const [profile] = await db.select().from(gpsVisualizationProfile).where(eq(gpsVisualizationProfile.id, profileId));
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const profileColumns = await db
      .select({
        canonicalMetricId: gpsProfileColumn.canonicalMetricId,
        displayName: gpsProfileColumn.displayName,
        displayUnit: gpsProfileColumn.displayUnit,
        isVisible: gpsProfileColumn.isVisible,
        canonicalMetricCode: gpsCanonicalMetric.code,
      })
      .from(gpsProfileColumn)
      .leftJoin(gpsCanonicalMetric, eq(gpsProfileColumn.canonicalMetricId, gpsCanonicalMetric.id))
      .where(eq(gpsProfileColumn.profileId, profileId));

    const customMetricsMap = new Map<string, { displayName: string; displayUnit: string }>();
    profileColumns.forEach(col => {
      if (col.isVisible && col.canonicalMetricCode) {
        customMetricsMap.set(col.canonicalMetricCode, { displayName: col.displayName, displayUnit: col.displayUnit });
      }
    });

    const canonicalMetrics = await db
      .select({ code: gpsCanonicalMetric.code, name: gpsCanonicalMetric.name, unit: gpsCanonicalMetric.canonicalUnit })
      .from(gpsCanonicalMetric)
      .where(eq(gpsCanonicalMetric.isActive, true));

    const metricsMap = new Map<string, { name: string; unit: string }>();
    canonicalMetrics.forEach(metric => {
      const custom = customMetricsMap.get(metric.code);
      metricsMap.set(metric.code, { name: custom?.displayName || metric.name, unit: custom?.displayUnit || metric.unit });
    });

    // Match data for players
    const currentMatchData = await db
      .select({ playerId: gpsReportData.playerId, canonicalMetric: gpsReportData.canonicalMetric, value: gpsReportData.value, unit: gpsReportData.unit })
      .from(gpsReportData)
      .where(eq(gpsReportData.gpsReportId, report.id));

    // Game models for club
    const gameModels = await db
      .select({ id: playerGameModel.id, playerId: playerGameModel.playerId, calculatedAt: playerGameModel.calculatedAt, matchesCount: playerGameModel.matchesCount, totalMinutes: playerGameModel.totalMinutes, metrics: playerGameModel.metrics, matchIds: playerGameModel.matchIds, version: playerGameModel.version })
      .from(playerGameModel)
      .where(eq(playerGameModel.clubId, report.clubId));

    // Players
    const players = await db
      .select({ id: player.id, firstName: player.firstName, lastName: player.lastName, position: player.position, imageUrl: player.imageUrl })
      .from(player)
      .where(eq(player.teamId, report.teamId));

    const playersWithModels = players.map(p => {
      const gm = gameModels.find(m => m.playerId === p.id) || null;
      const playerRows = currentMatchData.filter(r => r.playerId === p.id);
      const matchMetrics: Record<string, { value: number; unit: string }> = {};
      playerRows.forEach(r => {
        const v = parseFloat(r.value);
        if (!isNaN(v)) matchMetrics[r.canonicalMetric] = { value: v, unit: r.unit };
      });

      const comparisonMetrics: Array<{ canonicalMetric: string; displayName: string; displayUnit: string; currentValue: number; modelValue: number; percentageDiff: number; }> = [];

      if (gm) {
        const durationData = matchMetrics['duration'];
        const matchMinutes = durationData ? durationData.value / 60 : 0;
        if (matchMinutes >= 60) {
          Object.entries(gm.metrics as Record<string, number>).forEach(([metricCode, perMin]) => {
            const m = matchMetrics[metricCode];
            const info = metricsMap.get(metricCode);
            if (m && info) {
              const currentValue = m.value;
              const modelValue = perMin * matchMinutes;
              const percentageDiff = modelValue > 0 ? ((currentValue - modelValue) / modelValue) * 100 : 0;
              comparisonMetrics.push({ canonicalMetric: metricCode, displayName: info.name, displayUnit: info.unit || 'unknown', currentValue, modelValue, percentageDiff });
            }
          });
        }
      }

      return { ...p, gameModel: gm, matchData: matchMetrics, comparisonMetrics };
    });

    return NextResponse.json({ success: true, players: playersWithModels, report: { id: report.id, teamId: report.teamId, clubId: report.clubId, eventType: report.eventType, eventId: report.eventId } });
  } catch (error) {
    console.error('Error getting public player game models:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


