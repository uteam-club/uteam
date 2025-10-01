import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { rpeScheduleMatch, match } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

/**
 * POST /api/rpe-schedules-matches
 * Создание/обновление расписания RPE для матча
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'rpeSurvey.update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { matchId, teamId, scheduledTime, recipientsConfig } = body;

    if (!matchId || !teamId || !scheduledTime) {
      return NextResponse.json({ error: 'matchId, teamId and scheduledTime are required' }, { status: 400 });
    }

    // Проверяем существование матча
    const [matchRecord] = await db.select().from(match).where(eq(match.id, matchId)).limit(1);
    if (!matchRecord) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Проверяем, есть ли активное расписание
    const [existing] = await db
      .select()
      .from(rpeScheduleMatch)
      .where(and(eq(rpeScheduleMatch.matchId, matchId), eq(rpeScheduleMatch.status, 'scheduled')))
      .limit(1);

    if (existing) {
      await db
        .update(rpeScheduleMatch)
        .set({ scheduledTime, recipientsConfig: recipientsConfig ? JSON.stringify(recipientsConfig) : null, updatedAt: new Date() })
        .where(eq(rpeScheduleMatch.id, existing.id));
      return NextResponse.json({ success: true, message: 'Match schedule updated', scheduleId: existing.id });
    }

    const newSchedule = {
      id: uuidv4(),
      matchId,
      teamId,
      scheduledTime,
      status: 'scheduled' as const,
      recipientsConfig: recipientsConfig ? JSON.stringify(recipientsConfig) : null,
      createdById: token.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(rpeScheduleMatch).values(newSchedule);
    return NextResponse.json({ success: true, message: 'Match schedule created', scheduleId: newSchedule.id });
  } catch (error) {
    console.error('Error managing match RPE schedule:', error);
    return NextResponse.json({ error: 'Failed to manage match RPE schedule' }, { status: 500 });
  }
}


