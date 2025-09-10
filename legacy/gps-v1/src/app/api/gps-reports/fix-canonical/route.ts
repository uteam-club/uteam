import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { reportId } = await request.json();

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    // Получаем отчёт
    const report = await db.query.gpsReport.findFirst({
      where: eq(gpsReport.id, reportId)
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Проверяем, есть ли canonical данные
    const processedData = report.processedData as any;
    const hasCanonical = !!(processedData?.canonical?.rows?.length > 0);

    if (hasCanonical) {
      return NextResponse.json({ 
        message: 'Report already has canonical data',
        canonicalRows: processedData.canonical.rows.length
      });
    }

    // Если нет canonical данных, но есть raw данные - это старый отчёт
    if (report.rawData && Array.isArray(report.rawData) && report.rawData.length > 0) {
      return NextResponse.json({
        message: 'This is a legacy report without canonical data',
        suggestion: 'Please re-upload the file through a GPS profile to generate canonical data',
        rawRows: report.rawData.length,
        hasProfile: !!report.profileId
      });
    }

    return NextResponse.json({
      message: 'Report has no data to process',
      hasRawData: !!report.rawData,
      hasProcessedData: !!report.processedData
    });

  } catch (error) {
    console.error('Error checking canonical data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
