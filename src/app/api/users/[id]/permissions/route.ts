import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userPermission, rolePermission, permission, user } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { roleEnum } from '@/db/schema/user';

// Получить итоговые права пользователя (учитывая overrides)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    // Получаем пользователя и его роль
    const [usr] = await db.select().from(user).where(eq(user.id, id));
    if (!usr) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const roleValue = usr.role as typeof roleEnum.enumValues[number];

    // Получаем все права роли
    const rolePerms = await db
      .select({
        permissionId: rolePermission.permissionId,
        allowed: rolePermission.allowed,
        code: permission.code,
        description: permission.description
      })
      .from(rolePermission)
      .leftJoin(permission, eq(rolePermission.permissionId, permission.id))
      .where(eq(rolePermission.role, roleValue));

    // Получаем индивидуальные overrides
    const userPerms = await db
      .select({
        permissionId: userPermission.permissionId,
        allowed: userPermission.allowed
      })
      .from(userPermission)
      .where(eq(userPermission.userId, id));
    const userPermsMap = Object.fromEntries(userPerms.map(p => [p.permissionId, p.allowed]));

    // Итоговые права: если есть override — используем его, иначе право роли
    const finalPerms = rolePerms.map(p => ({
      permissionId: p.permissionId,
      code: p.code,
      description: p.description,
      allowed: userPermsMap[p.permissionId] !== undefined ? userPermsMap[p.permissionId] : p.allowed,
      override: userPermsMap[p.permissionId] !== undefined
    }));
    return NextResponse.json(finalPerms);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user permissions', details: (error as Error).message }, { status: 500 });
  }
}

// Обновить индивидуальные права пользователя (overrides)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const updates = await request.json(); // [{ permissionId, allowed }]
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    // Удаляем все старые overrides пользователя
    await db.delete(userPermission).where(eq(userPermission.userId, id));
    // Добавляем новые overrides
    for (const upd of updates) {
      await db.insert(userPermission).values({ userId: id, permissionId: upd.permissionId, allowed: upd.allowed });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user permissions', details: (error as Error).message }, { status: 500 });
  }
} 