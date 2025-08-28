import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { rpeSurveyResponse, training, player } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - получение настроек длительности для конкретной тренировки
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

    // Получаем все ответы RPE для данной тренировки
    const responses = await db.select({
      id: rpeSurveyResponse.id,
      playerId: rpeSurveyResponse.playerId,
      durationMinutes: rpeSurveyResponse.durationMinutes,
    })
      .from(rpeSurveyResponse)
      .where(eq(rpeSurveyResponse.trainingId, trainingId));

    // Группируем длительности по игрокам
    const individualDurations: Record<string, number> = {};
    let globalDuration: number | null = null;

    // Если все игроки имеют одинаковую длительность, считаем её общей
    const durations = responses
      .map(r => r.durationMinutes)
      .filter(d => d !== null && d !== undefined);

    if (durations.length > 0) {
      const uniqueDurations = [...new Set(durations)];
      if (uniqueDurations.length === 1) {
        globalDuration = uniqueDurations[0];
      }

      // Заполняем индивидуальные длительности
      responses.forEach(response => {
        if (response.durationMinutes !== null && response.durationMinutes !== undefined) {
          individualDurations[response.playerId] = response.durationMinutes;
        }
      });
    }

    return NextResponse.json({
      globalDuration,
      individualDurations
    });

  } catch (error) {
    console.error('Error fetching training duration settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch duration settings' },
      { status: 500 }
    );
  }
}

// POST - сохранение настроек длительности для конкретной тренировки
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
    const { globalDuration, playerId, individualDuration } = body;

    if (globalDuration !== undefined) {
      // Обновляем общую длительность для всех игроков в данной тренировке
      const responses = await db.select({
        id: rpeSurveyResponse.id,
        playerId: rpeSurveyResponse.playerId,
      })
        .from(rpeSurveyResponse)
        .where(eq(rpeSurveyResponse.trainingId, trainingId));

      // Обновляем длительность для всех существующих ответов
      for (const response of responses) {
        await db.update(rpeSurveyResponse)
          .set({ durationMinutes: globalDuration })
          .where(eq(rpeSurveyResponse.id, response.id));
      }

      return NextResponse.json({ success: true, message: 'Общая длительность обновлена' });
    }

    if (playerId && individualDuration !== undefined) {
      // Обновляем индивидуальную длительность для конкретного игрока
      const response = await db.select({
        id: rpeSurveyResponse.id,
      })
        .from(rpeSurveyResponse)
        .where(
          and(
            eq(rpeSurveyResponse.trainingId, trainingId),
            eq(rpeSurveyResponse.playerId, playerId)
          )
        )
        .limit(1);

      if (response.length > 0) {
        await db.update(rpeSurveyResponse)
          .set({ durationMinutes: individualDuration })
          .where(eq(rpeSurveyResponse.id, response[0].id));

        return NextResponse.json({ success: true, message: 'Индивидуальная длительность обновлена' });
      } else {
        return NextResponse.json({ error: 'Ответ игрока не найден' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });

  } catch (error) {
    console.error('Error saving training duration settings:', error);
    return NextResponse.json(
      { error: 'Failed to save duration settings' },
      { status: 500 }
    );
  }
}
