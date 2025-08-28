import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { rpeSchedule, training, team } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

/**
 * POST /api/rpe-schedules
 * Создание или обновление расписания RPE опроса
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
    const { trainingId, teamId, scheduledTime } = body;

    if (!trainingId || !teamId || !scheduledTime) {
      return NextResponse.json({ 
        error: 'trainingId, teamId and scheduledTime are required' 
      }, { status: 400 });
    }

    // Проверяем существование тренировки
    const [trainingRecord] = await db
      .select()
      .from(training)
      .where(eq(training.id, trainingId))
      .limit(1);

    if (!trainingRecord) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }

    // Проверяем, есть ли уже расписание для этой тренировки
    const [existingSchedule] = await db
      .select()
      .from(rpeSchedule)
      .where(
        and(
          eq(rpeSchedule.trainingId, trainingId),
          eq(rpeSchedule.status, 'scheduled')
        )
      )
      .limit(1);

    if (existingSchedule) {
      // Обновляем существующее расписание
      await db
        .update(rpeSchedule)
        .set({
          scheduledTime,
          updatedAt: new Date(),
        })
        .where(eq(rpeSchedule.id, existingSchedule.id));

      return NextResponse.json({
        success: true,
        message: 'Schedule updated',
        scheduleId: existingSchedule.id
      });
    } else {
      // Создаем новое расписание
      const newSchedule = {
        id: uuidv4(),
        trainingId,
        teamId,
        scheduledTime,
        status: 'scheduled' as const,
        createdById: token.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(rpeSchedule).values(newSchedule);

      return NextResponse.json({
        success: true,
        message: 'Schedule created',
        scheduleId: newSchedule.id
      });
    }

  } catch (error) {
    console.error('Error managing RPE schedule:', error);
    return NextResponse.json(
      { error: 'Failed to manage RPE schedule' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rpe-schedules
 * Получение расписаний RPE опросов
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'rpeSurvey.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    let whereConditions = [eq(rpeSchedule.teamId, teamId)];

    // Если указаны даты, фильтруем по дате тренировки
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
        trainingTitle: training.title,
        trainingDate: training.date,
        trainingTime: training.time,
      })
      .from(rpeSchedule)
      .leftJoin(training, eq(rpeSchedule.trainingId, training.id))
      .where(and(...whereConditions))
      .orderBy(desc(training.date), desc(training.time));

    return NextResponse.json(schedules);

  } catch (error) {
    console.error('Error fetching RPE schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RPE schedules' },
      { status: 500 }
    );
  }
}
