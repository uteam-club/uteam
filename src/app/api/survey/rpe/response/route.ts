import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rpeSurveyResponse } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { rpeScore, surveyId, tenantId } = await req.json();

    if (!rpeScore || !surveyId || !tenantId) {
      return NextResponse.json({ error: 'rpeScore, surveyId и tenantId обязательны' }, { status: 400 });
    }

    if (rpeScore < 1 || rpeScore > 10) {
      return NextResponse.json({ error: 'rpeScore должен быть от 1 до 10' }, { status: 400 });
    }

    // TODO: Получить playerId из сессии или токена
    // Пока что используем заглушку
    const playerId = '00000000-0000-0000-0000-000000000000';

    // Проверяем, есть ли уже ответ за сегодня
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const [existing]: any = await db.select().from(rpeSurveyResponse)
      .where(and(
        eq(rpeSurveyResponse.playerId, playerId),
        eq(rpeSurveyResponse.surveyId, surveyId),
        eq(rpeSurveyResponse.tenantId, tenantId),
        gte(rpeSurveyResponse.createdAt, startOfDay),
        lte(rpeSurveyResponse.createdAt, endOfDay)
      ))
      .limit(1);

    if (existing) {
      // Обновляем существующий ответ
      await db.update(rpeSurveyResponse)
        .set({
          rpeScore,
          completedAt: new Date(),
        })
        .where(eq(rpeSurveyResponse.id, existing.id));
    } else {
      // Создаём новый ответ
      await db.insert(rpeSurveyResponse).values({
        id: uuidv4(),
        rpeScore,
        playerId,
        surveyId,
        tenantId,
        completedAt: new Date(),
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting RPE survey response:', error);
    return NextResponse.json({ error: 'Ошибка при сохранении ответа' }, { status: 500 });
  }
} 