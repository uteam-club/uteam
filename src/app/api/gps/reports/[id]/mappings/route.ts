import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport, gpsColumnMapping } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/gps/reports/[id]/mappings - Сохранить маппинг колонок для отчета
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mappings } = body;

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: 'Mappings array is required' },
        { status: 400 }
      );
    }

    // Проверяем, что отчет принадлежит клубу
    const report = await db
      .select()
      .from(gpsReport)
      .where(
        and(
          eq(gpsReport.id, params.id),
          eq(gpsReport.clubId, session.user.clubId)
        )
      )
      .limit(1);

    if (report.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Удаляем старые маппинги
    await db
      .delete(gpsColumnMapping)
      .where(eq(gpsColumnMapping.gpsProfileId, params.id));

    // Создаем новые маппинги
    const columnMappings = mappings.map((mapping: any, index: number) => ({
      clubId: session.user.clubId || 'default-club',
      teamId: report[0].teamId,
      gpsProfileId: params.id,
      sourceColumn: mapping.sourceColumn,
      customName: mapping.customName || mapping.sourceColumn,
      canonicalMetric: mapping.canonicalMetricCode,
      sourceUnit: mapping.sourceUnit,
      displayOrder: mapping.displayOrder || index,
      isVisible: mapping.isActive !== false,
    }));

    await db.insert(gpsColumnMapping).values(columnMappings);

    // Обновляем статус отчета
    await db
      .update(gpsReport)
      .set({
        status: 'processed',
        isProcessed: true,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(gpsReport.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving column mappings:', error);
    return NextResponse.json(
      { error: 'Failed to save column mappings' },
      { status: 500 }
    );
  }
}

// GET /api/gps/reports/[id]/mappings - Получить маппинг колонок для отчета
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем, что отчет принадлежит клубу
    const report = await db
      .select()
      .from(gpsReport)
      .where(
        and(
          eq(gpsReport.id, params.id),
          eq(gpsReport.clubId, session.user.clubId)
        )
      )
      .limit(1);

    if (report.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Получаем маппинги колонок
    const mappings = await db
      .select()
      .from(gpsColumnMapping)
      .where(eq(gpsColumnMapping.gpsProfileId, params.id))
      .orderBy(gpsColumnMapping.displayOrder);

    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error fetching column mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch column mappings' },
      { status: 500 }
    );
  }
}
