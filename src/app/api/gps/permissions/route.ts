import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsPermission, gpsRolePermission, gpsUserPermission } from '@/db/schema/gpsPermissions';
import { eq, and } from 'drizzle-orm';

// GET /api/gps/permissions - получение GPS разрешений
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await db
      .select()
      .from(gpsPermission)
      .orderBy(gpsPermission.category, gpsPermission.name);

    // Группируем разрешения по категориям
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return NextResponse.json({
      permissions,
      groupedPermissions
    });
  } catch (error) {
    console.error('Error fetching GPS permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GPS permissions' },
      { status: 500 }
    );
  }
}