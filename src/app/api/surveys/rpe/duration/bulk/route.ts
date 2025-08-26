import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rpeSurveyResponse } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST - массовое сохранение индивидуальных длительностей
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, date, individualDurations } = body;

    if (!teamId || !date || !Array.isArray(individualDurations)) {
      return NextResponse.json({ error: 'teamId, date и individualDurations обязательны' }, { status: 400 });
    }

    // Формируем диапазон на весь день
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Обновляем длительности для всех игроков одним запросом
    for (const { playerId, individualDuration } of individualDurations) {
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
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Индивидуальные длительности обновлены',
      updatedCount: individualDurations.length
    });

  } catch (error) {
    console.error('Error saving bulk duration settings:', error);
    return NextResponse.json({ error: 'Ошибка при сохранении настроек длительности' }, { status: 500 });
  }
}
