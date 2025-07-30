import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { gpsProfile } from '@/db/schema/gpsProfile';
import { eq, and, desc } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// GET - получение списка GPS профилей
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsProfiles.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const profiles = await db
      .select()
      .from(gpsProfile)
      .where(eq(gpsProfile.clubId, token.clubId))
      .orderBy(desc(gpsProfile.createdAt));

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Ошибка при получении GPS профилей:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создание нового GPS профиля
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsProfiles.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, columns } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Преобразуем columns в columnMapping
    const columnMapping = columns || [];
    const gpsSystem = 'B-SIGHT'; // По умолчанию
    const visualizationConfig = {}; // Пустая конфигурация по умолчанию
    const metricsConfig = {}; // Пустая конфигурация по умолчанию
    const description = ''; // Пустое описание по умолчанию
    const isDefault = false; // По умолчанию не является профилем по умолчанию
    const customFormulas = null; // Пустые формулы по умолчанию
    const dataFilters = null; // Пустые фильтры по умолчанию

    // Если устанавливаем профиль по умолчанию, сбрасываем другие
    if (isDefault) {
      await db
        .update(gpsProfile)
        .set({ isDefault: false })
        .where(eq(gpsProfile.clubId, token.clubId));
    }

    const [newProfile] = await db
      .insert(gpsProfile)
      .values({
        name,
        description,
        gpsSystem,
        isDefault: isDefault || false,
        isActive: true,
        visualizationConfig,
        metricsConfig,
        customFormulas,
        columnMapping,
        dataFilters,
        clubId: token.clubId,
        createdById: token.id,
      })
      .returning();

    return NextResponse.json(newProfile);
  } catch (error) {
    console.error('Ошибка при создании GPS профиля:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 