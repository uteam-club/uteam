import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsVisualizationProfile } from '@/db/schema/gpsColumnMapping';
import { gpsProfileColumn } from '@/db/schema/gpsColumnMapping';
import { gpsCanonicalMetric } from '@/db/schema/gpsCanonicalMetric';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileId = params.id;

    // Получаем профиль
    const [profile] = await db
      .select()
      .from(gpsVisualizationProfile)
      .where(
        and(
          eq(gpsVisualizationProfile.id, profileId),
          eq(gpsVisualizationProfile.clubId, session.user.clubId || 'default-club')
        )
      );

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Получаем колонки профиля с информацией о канонических метриках
    const columns = await db
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
      .where(eq(gpsProfileColumn.profileId, profileId))
      .orderBy(gpsProfileColumn.displayOrder);

    const profileWithColumns = {
      ...profile,
      columns: columns.map(col => ({
        id: col.id,
        canonicalMetricId: col.canonicalMetricId,
        canonicalMetricCode: col.canonicalMetricCode,
        canonicalMetricName: col.canonicalMetricName,
        canonicalUnit: col.canonicalUnit,
        displayName: col.displayName,
        displayUnit: col.displayUnit,
        displayOrder: col.displayOrder,
        isVisible: col.isVisible,
      }))
    };


    return NextResponse.json({ profile: profileWithColumns });

  } catch (error) {
    console.error('Error fetching GPS profile:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileId = params.id;
    const body = await request.json();
    const { name, description, columns } = body;

    if (!name || !columns || columns.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Проверяем, что профиль существует и принадлежит пользователю
    const [existingProfile] = await db
      .select()
      .from(gpsVisualizationProfile)
      .where(
        and(
          eq(gpsVisualizationProfile.id, profileId),
          eq(gpsVisualizationProfile.clubId, session.user.clubId || 'default-club')
        )
      );

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Обновляем профиль
    await db
      .update(gpsVisualizationProfile)
      .set({
        name,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(gpsVisualizationProfile.id, profileId));

    // Удаляем старые колонки
    await db
      .delete(gpsProfileColumn)
      .where(eq(gpsProfileColumn.profileId, profileId));

    // Добавляем новые колонки
    for (const column of columns) {
      await db.insert(gpsProfileColumn).values({
        profileId: profileId,
        canonicalMetricId: column.canonicalMetricId,
        displayName: column.displayName,
        displayUnit: column.displayUnit,
        displayOrder: column.displayOrder,
        isVisible: true, // Все колонки видимы по умолчанию
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'GPS профиль успешно обновлен' 
    });

  } catch (error) {
    console.error('Error updating GPS profile:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileId = params.id;

    // Проверяем, что профиль существует и принадлежит пользователю
    const [existingProfile] = await db
      .select()
      .from(gpsVisualizationProfile)
      .where(
        and(
          eq(gpsVisualizationProfile.id, profileId),
          eq(gpsVisualizationProfile.clubId, session.user.clubId || 'default-club')
        )
      );

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Удаляем колонки профиля
    await db
      .delete(gpsProfileColumn)
      .where(eq(gpsProfileColumn.profileId, profileId));

    // Удаляем сам профиль
    await db
      .delete(gpsVisualizationProfile)
      .where(eq(gpsVisualizationProfile.id, profileId));

    return NextResponse.json({ 
      success: true, 
      message: 'GPS профиль успешно удален' 
    });

  } catch (error) {
    console.error('Error deleting GPS profile:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}