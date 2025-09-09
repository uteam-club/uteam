import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { db } from '@/lib/db';
import { gpsProfile, gpsReport } from '@/db/schema';
import { eq, and, ne, count } from 'drizzle-orm';
import { UpdateGpsProfileSchema } from '@/validators/gpsProfile.schema';

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
    ...(col.type === 'formula' && col.formula ? { formula: col.formula } : {})
  }));
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
    const json = await request.json();
    
    // Валидация с помощью zod схемы
    const parsed = UpdateGpsProfileSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const { name, description, gpsSystem, columns } = parsed.data;

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

    // Guard: проверяем, использовался ли профиль в отчётах
    const [usageResult] = await db
      .select({ count: count() })
      .from(gpsReport)
      .where(eq(gpsReport.profileId, profileId));
    
    const usageCount = usageResult?.count || 0;

    // Если профиль использовался, применяем guard
    if (usageCount > 0 && columns) {
      const oldCols = existingProfile.columnMapping || [];
      const newCols = normalizeColumns(columns);

      // Helper: ключ-идентификатор "смысла" строки
      const makeKey = (c: any) => `${c.canonicalKey}__@@__${c.mappedColumn}`;

      // Сформируем множества для существующих строк
      const oldSet = new Set((Array.isArray(oldCols) ? oldCols : [])
        .filter((c: any) => c?.type !== 'formula' && c?.canonicalKey && c?.mappedColumn)
        .map(makeKey)
      );

      const newSet = new Set((Array.isArray(newCols) ? newCols : [])
        .filter((c: any) => c?.type !== 'formula' && c?.canonicalKey && c?.mappedColumn)
        .map(makeKey)
      );

      // 1) Запрет удаления существующих строк
      for (const k of oldSet) {
        if (!newSet.has(k)) {
          return NextResponse.json({
            error: 'PROFILE_GUARD',
            message: 'Нельзя удалять ранее использованные строки (canonicalKey/mappedColumn). Создайте новую версию профиля.',
            details: { removedKey: k }
          }, { status: 409 });
        }
      }

      // 2) Запрет изменять canonicalKey/mappedColumn у существующих строк
      const byCanonOld = new Map((Array.isArray(oldCols) ? oldCols : []).map((c: any) => [c.canonicalKey, c]));
      for (const nc of newCols) {
        const oc = byCanonOld.get(nc.canonicalKey);
        if (!oc) continue; // новая строка — ок
        
        // Если профиль уже использовался — запрещаем менять source/ключ
        if (oc.mappedColumn !== nc.mappedColumn) {
          return NextResponse.json({
            error: 'PROFILE_GUARD',
            message: 'Нельзя менять mappedColumn у ранее использованной строки. Создайте новую версию профиля.',
            details: { canonicalKey: nc.canonicalKey, from: oc.mappedColumn, to: nc.mappedColumn }
          }, { status: 409 });
        }
      }

      // 3) Запрет менять gpsSystem
      if (gpsSystem && gpsSystem !== existingProfile.gpsSystem) {
        return NextResponse.json({
          error: 'PROFILE_GUARD',
          message: 'Нельзя менять GPS систему у уже использованного профиля. Создайте новую версию.',
        }, { status: 409 });
      }
    }

    // Проверка на дублирование названия профиля (если name изменился)
    if (name && name !== existingProfile.name) {
      const existingProfileWithSameName = await db
        .select()
        .from(gpsProfile)
        .where(
          and(
            eq(gpsProfile.clubId, token.clubId),
            eq(gpsProfile.name, name.trim()),
            ne(gpsProfile.id, profileId)
          )
        );

      if (existingProfileWithSameName.length > 0) {
        return NextResponse.json({ 
          error: 'Профиль с таким названием уже существует',
          field: 'name'
        }, { status: 400 });
      }
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (gpsSystem) updateData.gpsSystem = gpsSystem;
    if (columns) updateData.columnMapping = normalizeColumns(columns);

    // Обновляем профиль
    const [updatedProfile] = await db
      .update(gpsProfile)
      .set(updateData)
      .where(eq(gpsProfile.id, profileId))
      .returning();

    return NextResponse.json({
      ...updatedProfile,
      message: 'Профиль успешно обновлен'
    });

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
    const [usageResult] = await db
      .select({ count: count() })
      .from(gpsReport)
      .where(eq(gpsReport.profileId, profileId));
    
    const usageCount = usageResult?.count || 0;

    if (usageCount > 0) {
      return NextResponse.json({ 
        error: 'PROFILE_IN_USE',
        message: `Профиль используется в ${usageCount} отчётах`,
        usageCount 
      }, { status: 409 });
    }

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