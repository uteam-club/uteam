import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { permission, rolePermission, user } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем все права
    const allPermissions = await db.select().from(permission);
    
    // Получаем права ролей
    const allRolePermissions = await db.select().from(rolePermission);
    
    // Получаем пользователя
    const [currentUser] = await db.select().from(user).where(eq(user.id, token.id as string));
    
    // Фильтруем права для упражнений
    const exercisePermissions = allPermissions.filter(p => p.code.includes('exercise'));
    
    // Фильтруем права ролей для упражнений
    const exerciseRolePermissions = allRolePermissions.filter(rp => {
      const perm = allPermissions.find(p => p.id === rp.permissionId);
      return perm && perm.code.includes('exercise');
    });

    return NextResponse.json({
      currentUser: {
        id: currentUser?.id,
        role: currentUser?.role,
        clubId: currentUser?.clubId
      },
      allPermissions: allPermissions.map(p => ({ id: p.id, code: p.code, description: p.description })),
      exercisePermissions: exercisePermissions.map(p => ({ id: p.id, code: p.code, description: p.description })),
      allRolePermissions: allRolePermissions.map(rp => ({ 
        role: rp.role, 
        permissionId: rp.permissionId, 
        allowed: rp.allowed 
      })),
      exerciseRolePermissions: exerciseRolePermissions.map(rp => {
        const perm = allPermissions.find(p => p.id === rp.permissionId);
        return {
          role: rp.role,
          permissionCode: perm?.code,
          permissionId: rp.permissionId,
          allowed: rp.allowed
        };
      })
    });
  } catch (error) {
    console.error('Error getting permissions structure:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
