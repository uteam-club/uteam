import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { training, player, team, trainingCategory, rpeSurveyResponse } from '@/db/schema';
import { eq, and, gte, lte, isNull, desc } from 'drizzle-orm';

/**
 * GET /api/players/[playerId]/available-trainings
 * Получение доступных тренировок для заполнения RPE игроком
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId } = params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'startDate and endDate are required' 
      }, { status: 400 });
    }

    // Проверяем существование игрока
    const [playerRecord] = await db
      .select()
      .from(player)
      .where(eq(player.id, playerId))
      .limit(1);

    if (!playerRecord) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Получаем тренировки команды в указанном диапазоне дат
    const trainingsData = await db
      .select({
        id: training.id,
        title: training.title,
        date: training.date,
        time: training.time,
        type: training.type,
        status: training.status,
        categoryName: trainingCategory.name,
        teamName: team.name,
      })
      .from(training)
      .leftJoin(team, eq(training.teamId, team.id))
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(
        and(
          eq(training.teamId, playerRecord.teamId),
          gte(training.date, startDate),
          lte(training.date, endDate)
        )
      )
      .orderBy(desc(training.date), desc(training.time));

    // Для каждой тренировки проверяем, есть ли уже RPE ответ от этого игрока
    const trainingsWithRPEStatus = await Promise.all(
      trainingsData.map(async (training) => {
        // Проверяем есть ли RPE ответ для этой тренировки
        const [existingRPE] = await db
          .select()
          .from(rpeSurveyResponse)
          .where(
            and(
              eq(rpeSurveyResponse.playerId, playerId),
              eq(rpeSurveyResponse.trainingId, training.id)
            )
          )
          .limit(1);

        return {
          id: training.id,
          title: training.title,
          date: training.date,
          time: training.time,
          type: training.type,
          category: training.categoryName || 'Без категории',
          team: training.teamName || 'Команда',
          hasRPEResponse: !!existingRPE,
          isCompleted: training.status === 'COMPLETED'
        };
      })
    );

    // Возвращаем все тренировки (игрок может перезаполнить RPE)
    // но отмечаем те, для которых уже есть ответ
    return NextResponse.json(trainingsWithRPEStatus);

  } catch (error) {
    console.error('Error fetching available trainings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available trainings' },
      { status: 500 }
    );
  }
}
