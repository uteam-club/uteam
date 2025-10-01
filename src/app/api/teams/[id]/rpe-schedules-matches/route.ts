import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { rpeScheduleMatch, match } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

/**
 * GET /api/teams/[teamId]/rpe-schedules-matches
 * Получение расписаний RPE для матчей команды
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'rpeSurvey.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: teamId } = params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereConditions = [eq(rpeScheduleMatch.teamId, teamId)];
    if (startDate && endDate) {
      whereConditions.push(gte(match.date, startDate), lte(match.date, endDate));
    }

    const schedules = await db
      .select({
        id: rpeScheduleMatch.id,
        matchId: rpeScheduleMatch.matchId,
        scheduledTime: rpeScheduleMatch.scheduledTime,
        status: rpeScheduleMatch.status,
        sentAt: rpeScheduleMatch.sentAt,
        createdAt: rpeScheduleMatch.createdAt,
        updatedAt: rpeScheduleMatch.updatedAt,
        recipientsConfig: rpeScheduleMatch.recipientsConfig,
        matchDate: match.date,
        matchTime: match.time,
        opponentName: match.opponentName,
      })
      .from(rpeScheduleMatch)
      .leftJoin(match, eq(rpeScheduleMatch.matchId, match.id))
      .where(and(...whereConditions))
      .orderBy(desc(match.date), desc(match.time));

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching RPE match schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch RPE match schedules' }, { status: 500 });
  }
}


