import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsRolePermission, gpsPermission } from '@/db/schema/gpsPermissions';
import { eq, and } from 'drizzle-orm';

// GET /api/gps/roles/[role]/permissions - получение разрешений роли
export async function GET(
  request: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    // Разрешаем доступ всем пользователям для админки
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.clubId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const rolePermissions = await db
      .select({
        permissionId: gpsRolePermission.permissionId,
        allowed: gpsRolePermission.allowed,
        code: gpsPermission.code,
        description: gpsPermission.name
      })
      .from(gpsRolePermission)
      .leftJoin(gpsPermission, eq(gpsRolePermission.permissionId, gpsPermission.id))
      .where(eq(gpsRolePermission.role, params.role))
      .orderBy(gpsPermission.category, gpsPermission.name);

    return NextResponse.json(rolePermissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role permissions' },
      { status: 500 }
    );
  }
}

// POST /api/gps/roles/[role]/permissions - обновление разрешений роли
export async function POST(
  request: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await request.json();

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Permissions must be an array' },
        { status: 400 }
      );
    }

    // Обновляем разрешения роли
    for (const permission of permissions) {
      await db
        .update(gpsRolePermission)
        .set({ allowed: permission.allowed })
        .where(
          and(
            eq(gpsRolePermission.role, params.role),
            eq(gpsRolePermission.permissionId, permission.permissionId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update role permissions' },
      { status: 500 }
    );
  }
}