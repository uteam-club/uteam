import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rpeSurveyResponse } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - получение настроек длительности для команды и даты
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const date = searchParams.get('date');

    if (!teamId || !date) {
      return NextResponse.json({ error: 'teamId и date обязательны' }, { status: 400 });
    }

    // Формируем диапазон на весь день
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Получаем все ответы RPE за указанную дату для команды
    const responses = await db.select({
      id: rpeSurveyResponse.id,
      playerId: rpeSurveyResponse.playerId,
      durationMinutes: rpeSurveyResponse.durationMinutes,
    })
      .from(rpeSurveyResponse)
      .where(
        and(
          gte(rpeSurveyResponse.createdAt, startDate),
          lte(rpeSurveyResponse.createdAt, endDate)
        )
      );

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
      } else {
        // Разные длительности - заполняем индивидуальные
        responses.forEach(response => {
          if (response.durationMinutes) {
            individualDurations[response.playerId] = response.durationMinutes;
          }
        });
      }
    }

    return NextResponse.json({
      globalDuration,
      individualDurations
    });

  } catch (error) {
    console.error('Error fetching duration settings:', error);
    return NextResponse.json({ error: 'Ошибка при получении настроек длительности' }, { status: 500 });
  }
}

// POST - сохранение настроек длительности
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, date, globalDuration, playerId, individualDuration } = body;

    if (!teamId || !date) {
      return NextResponse.json({ error: 'teamId и date обязательны' }, { status: 400 });
    }

    // Формируем диапазон на весь день
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    if (globalDuration !== undefined) {
      // Обновляем общую длительность для всех игроков команды
      const responses = await db.select({
        id: rpeSurveyResponse.id,
        playerId: rpeSurveyResponse.playerId,
      })
        .from(rpeSurveyResponse)
        .where(
          and(
            gte(rpeSurveyResponse.createdAt, startDate),
            lte(rpeSurveyResponse.createdAt, endDate)
          )
        );

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
      const responses = await db.select({
        id: rpeSurveyResponse.id,
      })
        .from(rpeSurveyResponse)
        .where(
          and(
            eq(rpeSurveyResponse.playerId, playerId),
            gte(rpeSurveyResponse.createdAt, startDate),
            lte(rpeSurveyResponse.createdAt, endDate)
          )
        );

      if (responses.length > 0) {
        // Обновляем существующий ответ
        await db.update(rpeSurveyResponse)
          .set({ durationMinutes: individualDuration })
          .where(eq(rpeSurveyResponse.id, responses[0].id));
      }

      return NextResponse.json({ success: true, message: 'Индивидуальная длительность обновлена' });
    }

    return NextResponse.json({ error: 'Неверные параметры запроса' }, { status: 400 });

  } catch (error) {
    console.error('Error saving duration settings:', error);
    return NextResponse.json({ error: 'Ошибка при сохранении настроек длительности' }, { status: 500 });
  }
}
