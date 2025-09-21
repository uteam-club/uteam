import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsColumnMapping } from '@/db/schema/gpsColumnMapping';
import { eq, and } from 'drizzle-orm';

// POST /api/gps/column-mappings - Сохранить маппинги для автоматического подставления
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mappings, teamId } = body;

    if (!mappings || !Array.isArray(mappings) || !teamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Удаляем старые маппинги для команды
    await db
      .delete(gpsColumnMapping)
      .where(
        and(
          eq(gpsColumnMapping.clubId, session.user.clubId || 'default-club'),
          eq(gpsColumnMapping.teamId, teamId)
        )
      );

    // Создаем новые маппинги только для активных колонок с каноническими метриками
    const columnMappings = mappings
      .filter((mapping: any) => 
        mapping.isActive && 
        mapping.canonicalMetricId && 
        mapping.canonicalMetricId.trim() !== '' &&
        mapping.canonicalMetricCode &&
        mapping.canonicalMetricCode.trim() !== ''
      )
      .map((mapping: any, index: number) => ({
        gpsProfileId: '00000000-0000-0000-0000-000000000000', // Специальный ID для автоматических маппингов
        sourceColumn: mapping.originalName,
        customName: mapping.displayName || mapping.originalName,
        canonicalMetric: mapping.canonicalMetricCode,
        sourceUnit: mapping.sourceUnit,
        displayOrder: mapping.displayOrder || index,
        isVisible: mapping.isActive !== false,
        clubId: session.user.clubId || 'default-club',
        teamId: teamId,
      }));

    await db.insert(gpsColumnMapping).values(columnMappings);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving column mappings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save column mappings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/gps/column-mappings - Получить сохраненные маппинги для команды
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // Получаем сохраненные маппинги для команды
    const mappings = await db
      .select()
      .from(gpsColumnMapping)
      .where(
        and(
          eq(gpsColumnMapping.clubId, session.user.clubId || 'default-club'),
          eq(gpsColumnMapping.teamId, teamId),
          eq(gpsColumnMapping.gpsProfileId, '00000000-0000-0000-0000-000000000000')
        )
      )
      .orderBy(gpsColumnMapping.displayOrder);

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('Error fetching column mappings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch column mappings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
