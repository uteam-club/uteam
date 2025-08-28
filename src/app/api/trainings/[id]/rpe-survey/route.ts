import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { rpeSurveyResponse, training, player } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

/**
 * POST /api/trainings/[id]/rpe-survey
 * Создание RPE опроса для конкретной тренировки
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id: trainingId } = params;
    const body = await request.json();
    const { players: selectedPlayers } = body;

    // Проверяем существование тренировки
    const [trainingRecord] = await db
      .select()
      .from(training)
      .where(eq(training.id, trainingId))
      .limit(1);

    if (!trainingRecord) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }

    // Получаем игроков команды
    const teamPlayers = await db
      .select()
      .from(player)
      .where(eq(player.teamId, trainingRecord.teamId));

    const playersToSurvey = selectedPlayers && selectedPlayers.length > 0 
      ? teamPlayers.filter(p => selectedPlayers.includes(p.id))
      : teamPlayers;

    if (playersToSurvey.length === 0) {
      return NextResponse.json({ error: 'No players found for survey' }, { status: 400 });
    }

    // Создаем записи RPE опроса для каждого игрока
    const surveyResponses = [];
    for (const player of playersToSurvey) {
      // Проверяем, есть ли уже RPE ответ для этой тренировки от этого игрока
      const [existingResponse] = await db
        .select()
        .from(rpeSurveyResponse)
        .where(
          and(
            eq(rpeSurveyResponse.playerId, player.id),
            eq(rpeSurveyResponse.trainingId, trainingId)
          )
        )
        .limit(1);

      if (existingResponse) {
        // Если уже есть ответ, пропускаем
        continue;
      }

      // Создаем новую запись RPE опроса
      const newSurveyResponse = {
        id: uuidv4(),
        playerId: player.id,
        trainingId: trainingId,
        surveyId: uuidv4(), // Можно использовать общий surveyId для группы
        tenantId: token.clubId || uuidv4(),
        rpeScore: 0, // Будет заполнено игроком
        durationMinutes: null, // Будет заполнено тренером или игроком
        createdAt: new Date(),
      };

      await db.insert(rpeSurveyResponse).values(newSurveyResponse);
      surveyResponses.push(newSurveyResponse);
    }

    return NextResponse.json({
      success: true,
      message: `RPE опрос создан для ${surveyResponses.length} игроков`,
      trainingId: trainingId,
      trainingTitle: trainingRecord.title,
      playersCount: surveyResponses.length,
      surveyResponses: surveyResponses.map(sr => ({
        id: sr.id,
        playerId: sr.playerId
      }))
    });

  } catch (error) {
    console.error('Error creating RPE survey for training:', error);
    return NextResponse.json(
      { error: 'Failed to create RPE survey for training' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trainings/[id]/rpe-survey
 * Получение RPE ответов для конкретной тренировки
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

    const { id: trainingId } = params;

    // Получаем информацию о тренировке
    const [trainingRecord] = await db
      .select()
      .from(training)
      .where(eq(training.id, trainingId))
      .limit(1);

    if (!trainingRecord) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }

    // Получаем все RPE ответы для этой тренировки, фильтруя по команде
    const rpeResponses = await db
      .select({
        id: rpeSurveyResponse.id,
        playerId: rpeSurveyResponse.playerId,
        rpeScore: rpeSurveyResponse.rpeScore,
        durationMinutes: rpeSurveyResponse.durationMinutes,
        createdAt: rpeSurveyResponse.createdAt,
        completedAt: rpeSurveyResponse.completedAt,
        playerFirstName: player.firstName,
        playerLastName: player.lastName,
      })
      .from(rpeSurveyResponse)
      .leftJoin(player, eq(rpeSurveyResponse.playerId, player.id))
      .where(
        and(
          eq(rpeSurveyResponse.trainingId, trainingId),
          eq(player.teamId, trainingRecord.teamId), // Фильтруем по команде
          eq(rpeSurveyResponse.tenantId, token.clubId) // Фильтруем по клубу
        )
      );

    return NextResponse.json({
      training: {
        id: trainingRecord.id,
        title: trainingRecord.title,
        date: trainingRecord.date,
        time: trainingRecord.time,
        teamId: trainingRecord.teamId
      },
      responses: rpeResponses,
      totalResponses: rpeResponses.length,
      completedResponses: rpeResponses.filter(r => r.completedAt).length
    });

  } catch (error) {
    console.error('Error fetching RPE survey for training:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RPE survey for training' },
      { status: 500 }
    );
  }
}
