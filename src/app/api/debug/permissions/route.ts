import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(token.id as string);
    
    return NextResponse.json({
      userId: token.id,
      role: token.role,
      clubId: token.clubId,
      permissions: permissions,
      hasExercisesUpdate: permissions['exercises.update'] || false,
      hasExercisesRead: permissions['exercises.read'] || false,
      allPermissionCodes: Object.keys(permissions)
    });
  } catch (error) {
    console.error('Error getting permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
