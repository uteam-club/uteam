import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsVisualizationProfile } from '@/db/schema/gpsColumnMapping';
import { gpsProfileColumn } from '@/db/schema/gpsColumnMapping';
// Удален импорт gpsProfileTeam
import { gpsCanonicalMetric } from '@/db/schema/gpsCanonicalMetric';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, columns } = body;

    if (!name || !columns || columns.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Валидация типов данных
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid profile name' }, { status: 400 });
    }

    if (description && typeof description !== 'string') {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
    }

    if (!Array.isArray(columns)) {
      return NextResponse.json({ error: 'Columns must be an array' }, { status: 400 });
    }

    // Валидация колонок
    for (const column of columns) {
      if (!column.canonicalMetricId || !column.displayName || !column.displayUnit) {
        return NextResponse.json({ error: 'All columns must have canonicalMetricId, displayName, and displayUnit' }, { status: 400 });
      }
      if (typeof column.displayOrder !== 'number' || column.displayOrder < 0) {
        return NextResponse.json({ error: 'Invalid displayOrder for column' }, { status: 400 });
      }
    }

    // Создаем профиль
    const [newProfile] = await db.insert(gpsVisualizationProfile).values({
      name,
      description: description || null,
      clubId: session.user.clubId || 'default-club',
      createdById: session.user.id,
      isActive: true,
    }).returning();

    // Создаем колонки профиля
    for (const column of columns) {
      await db.insert(gpsProfileColumn).values({
        profileId: newProfile.id,
        canonicalMetricId: column.canonicalMetricId,
        displayName: column.displayName,
        displayUnit: column.displayUnit,
        displayOrder: column.displayOrder,
        isVisible: column.isVisible,
      });
    }

    // Профили больше не привязаны к командам

    return NextResponse.json({ 
      success: true, 
      profileId: newProfile.id,
      message: 'GPS профиль успешно создан' 
    });

  } catch (error) {
    console.error('Error creating GPS profile:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем все профили с дополнительной информацией
    const profiles = await db.select().from(gpsVisualizationProfile)
      .where(eq(gpsVisualizationProfile.clubId, session.user.clubId || 'default-club'));

    // Получаем дополнительную информацию для каждого профиля
    const profilesWithInfo = await Promise.all(
      profiles.map(async (profile) => {
        // Считаем количество колонок
        const columns = await db
          .select()
          .from(gpsProfileColumn)
          .where(eq(gpsProfileColumn.profileId, profile.id));

        return {
          ...profile,
          columnsCount: columns.length,
        };
      })
    );

    return NextResponse.json({ profiles: profilesWithInfo });

  } catch (error) {
    console.error('Error fetching GPS profiles:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}