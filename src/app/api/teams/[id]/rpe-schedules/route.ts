import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { rpeSchedule, training } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

/**
 * GET /api/teams/[teamId]/rpe-schedules
 * Получение RPE расписаний команды
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

    let whereConditions = [eq(rpeSchedule.teamId, teamId)];

    // Фильтрация по датам тренировок
    if (startDate && endDate) {
      whereConditions.push(
        gte(training.date, startDate),
        lte(training.date, endDate)
      );
    }

    // Получаем расписания с информацией о тренировках
    const schedules = await db
      .select({
        id: rpeSchedule.id,
        trainingId: rpeSchedule.trainingId,
        scheduledTime: rpeSchedule.scheduledTime,
        status: rpeSchedule.status,
        sentAt: rpeSchedule.sentAt,
        createdAt: rpeSchedule.createdAt,
        updatedAt: rpeSchedule.updatedAt,
      })
      .from(rpeSchedule)
      .leftJoin(training, eq(rpeSchedule.trainingId, training.id))
      .where(and(...whereConditions))
      .orderBy(desc(training.date), desc(training.time));

    return NextResponse.json(schedules);

  } catch (error) {
    console.error('Error fetching team RPE schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team RPE schedules' },
      { status: 500 }
    );
  }
}
