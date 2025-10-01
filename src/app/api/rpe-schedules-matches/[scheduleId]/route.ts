import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { rpeScheduleMatch } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'rpeSurvey.update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { scheduleId } = params;
    await db.update(rpeScheduleMatch).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(rpeScheduleMatch.id, scheduleId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing match RPE schedule:', error);
    return NextResponse.json({ error: 'Failed to remove match RPE schedule' }, { status: 500 });
  }
}


