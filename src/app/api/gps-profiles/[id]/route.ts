import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { db } from '@/lib/db';
import { gpsProfile } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// GET - получение профиля по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsProfiles.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const profile = await db
      .select()
      .from(gpsProfile)
      .where(eq(gpsProfile.id, params.id))
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileData = profile[0];
    console.log('📋 Профиль загружен:', {
      id: profileData.id,
      name: profileData.name,
      columnMappingLength: Array.isArray(profileData.columnMapping) ? profileData.columnMapping.length : 0
    });
    
    return NextResponse.json(profileData);
  } catch (error) {
    console.error('❌ Ошибка при получении профиля:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - обновление профиля
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsProfiles.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const profileId = params.id;
    const body = await request.json();

    // Проверяем, что профиль принадлежит клубу пользователя
    const [existingProfile] = await db
      .select()
      .from(gpsProfile)
      .where(
        and(
          eq(gpsProfile.id, profileId),
          eq(gpsProfile.clubId, token.clubId)
        )
      );

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Обновляем профиль
    const [updatedProfile] = await db
      .update(gpsProfile)
      .set({
        name: body.name,
        description: body.description,
        gpsSystem: body.gpsSystem,
        columnMapping: body.columnMapping,
        visualizationConfig: body.visualizationConfig,
        metricsConfig: body.metricsConfig,
        customFormulas: body.customFormulas,
        dataFilters: body.dataFilters,
        isDefault: body.isDefault,
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(eq(gpsProfile.id, profileId))
      .returning();

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Ошибка при обновлении GPS профиля:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удаление профиля
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsProfiles.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const profileId = params.id;

    // Проверяем, что профиль принадлежит клубу пользователя
    const [existingProfile] = await db
      .select()
      .from(gpsProfile)
      .where(
        and(
          eq(gpsProfile.id, profileId),
          eq(gpsProfile.clubId, token.clubId)
        )
      );

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Проверяем, не используется ли профиль в отчетах
    // TODO: Добавить проверку использования профиля в отчетах

    // Удаляем профиль
    await db
      .delete(gpsProfile)
      .where(eq(gpsProfile.id, profileId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении GPS профиля:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 