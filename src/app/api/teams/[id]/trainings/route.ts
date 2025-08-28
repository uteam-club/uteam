import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { training, trainingCategory } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

/**
 * GET /api/teams/[teamId]/trainings
 * Получение тренировок команды с фильтрацией по датам
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
    if (!hasPermission(permissions, 'trainings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: teamId } = params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let whereConditions = [eq(training.teamId, teamId)];

    // Фильтрация по датам
    if (startDate) {
      whereConditions.push(gte(training.date, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(training.date, endDate));
    }

    // Получаем тренировки с категориями
    const trainings = await db
      .select({
        id: training.id,
        title: training.title,
        date: training.date,
        time: training.time,
        type: training.type,
        status: training.status,
        categoryName: trainingCategory.name,
        location: training.location,
        notes: training.notes,
        createdAt: training.createdAt,
        updatedAt: training.updatedAt,
      })
      .from(training)
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(and(...whereConditions))
      .orderBy(desc(training.date), desc(training.time));

    // Форматируем результат
    const formattedTrainings = trainings.map(training => ({
      id: training.id,
      title: training.title,
      date: training.date,
      time: training.time,
      type: training.type,
      status: training.status,
      category: training.categoryName || 'Без категории',
      location: training.location,
      notes: training.notes,
      createdAt: training.createdAt,
      updatedAt: training.updatedAt,
    }));

    return NextResponse.json(formattedTrainings);

  } catch (error) {
    console.error('Error fetching team trainings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team trainings' },
      { status: 500 }
    );
  }
}
