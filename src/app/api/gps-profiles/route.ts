import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { gpsProfile } from '@/db/schema/gpsProfile';
import { eq, and, desc } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { CreateGpsProfileSchema } from '@/validators/gpsProfile.schema';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// Нормализация колонок для сохранения в БД
function normalizeColumns(columns: any[]): any[] {
  return columns.map((col, idx) => ({
    type: col.type ?? 'column',
    name: col.name,
    mappedColumn: col.mappedColumn,
    canonicalKey: col.canonicalKey,
    isVisible: col.isVisible ?? true,
    order: Number.isFinite(col.order) ? col.order : idx,
    displayUnit: col.displayUnit, // Сохраняем displayUnit
    ...(col.type === 'formula' && col.formula ? { formula: col.formula } : {})
  }));
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
    const json = await request.json();
    
    // Валидация с помощью zod схемы
    const parsed = CreateGpsProfileSchema.safeParse(json);
    if (!parsed.success) {
      const details = parsed.error.flatten();
      console.error('[gps-profiles:create] validation failed', details);
      return NextResponse.json({ 
        error: 'VALIDATION_ERROR', 
        details 
      }, { status: 400 });
    }

    const { name, description, gpsSystem, columns } = parsed.data;

    // Проверка на дублирование названия профиля
    const existingProfile = await db
      .select()
      .from(gpsProfile)
      .where(and(
        eq(gpsProfile.clubId, token.clubId),
        eq(gpsProfile.name, name.trim())
      ));

    if (existingProfile.length > 0) {
      return NextResponse.json({ 
        error: 'Профиль с таким названием уже существует',
        field: 'name'
      }, { status: 400 });
    }

    // Нормализация колонок
    const normalizedColumns = normalizeColumns(columns);

    // Создание профиля с валидированными данными
    const visualizationConfig = {
      charts: [
        {
          type: 'bar',
          title: 'Дистанция по игрокам',
          metric: 'distance',
          color: '#3B82F6'
        }
      ]
    };

    const metricsConfig = {
      distance: { aggregation: 'sum', unit: 'м' },
      time: { aggregation: 'sum', unit: 'мин' },
      maxSpeed: { aggregation: 'max', unit: 'км/ч' }
    };

    const [newProfile] = await db
      .insert(gpsProfile)
      .values({
        name: name.trim(),
        description: description || `Профиль для системы ${gpsSystem}`,
        gpsSystem,
        isDefault: false,
        isActive: true,
        visualizationConfig,
        metricsConfig,
        customFormulas: null,
        columnMapping: normalizedColumns,
        dataFilters: null,
        clubId: token.clubId,
        createdById: token.id,
      })
      .returning();

    return NextResponse.json({
      ...newProfile,
      message: 'Профиль успешно создан'
    });

  } catch (error) {
    console.error('Ошибка при создании GPS профиля:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 