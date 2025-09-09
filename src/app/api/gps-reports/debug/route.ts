import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Получаем все отчёты для клуба
    const reports = await db.query.gpsReport.findMany({
      where: eq(gpsReport.clubId, token.clubId),
      orderBy: (gpsReport, { desc }) => [desc(gpsReport.createdAt)],
      limit: 20
    });

    // Упрощаем данные для отладки
    const simplifiedReports = reports.map(report => ({
      id: report.id,
      name: report.name,
      teamId: report.teamId,
      eventType: report.eventType,
      eventId: report.eventId,
      gpsSystem: report.gpsSystem,
      profileId: report.profileId,
      createdAt: report.createdAt.toISOString(),
      hasRawData: !!report.rawData,
      rawDataLength: Array.isArray(report.rawData) ? report.rawData.length : 0,
      hasProcessedData: !!report.processedData,
      hasCanonical: !!(report.processedData as any)?.canonical,
      canonicalRows: (report.processedData as any)?.canonical?.rows?.length || 0,
      canonicalVersion: (report.processedData as any)?.canonical?.version,
      warningsCount: (report.processedData as any)?.canonical?.warnings?.length || 0,
      metaCounts: (report.processedData as any)?.canonical?.meta?.counts || null
    }));

    return NextResponse.json(simplifiedReports);

  } catch (error) {
    console.error('Error fetching GPS reports for debug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
