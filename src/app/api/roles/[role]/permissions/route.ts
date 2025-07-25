import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rolePermission, permission } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { roleEnum } from '@/db/schema/user';

// Получить права для роли
export async function GET(request: NextRequest, { params }: { params: { role: string } }) {
  const { role } = params;
  const roleValue = role as typeof roleEnum.enumValues[number];
  try {
    // Получаем все права и их статус для роли
    const perms = await db
      .select({
        permissionId: rolePermission.permissionId,
        allowed: rolePermission.allowed,
        code: permission.code,
        description: permission.description
      })
      .from(rolePermission)
      .leftJoin(permission, eq(rolePermission.permissionId, permission.id))
      .where(eq(rolePermission.role, roleValue));
    return NextResponse.json(perms);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch role permissions', details: (error as Error).message }, { status: 500 });
  }
}

// Обновить права для роли
export async function POST(request: NextRequest, { params }: { params: { role: string } }) {
  const { role } = params;
  const roleValue = role as typeof roleEnum.enumValues[number];
  try {
    const updates = await request.json(); // [{ permissionId, allowed }]
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    for (const upd of updates) {
      await db.update(rolePermission)
        .set({ allowed: upd.allowed })
        .where(and(eq(rolePermission.role, roleValue), eq(rolePermission.permissionId, upd.permissionId)));
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update role permissions', details: (error as Error).message }, { status: 500 });
  }
} 