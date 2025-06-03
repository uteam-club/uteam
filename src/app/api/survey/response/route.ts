import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { morningSurveyResponse, painArea, player } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[SURVEY_RESPONSE_POST] body:', body);
    const {
      sleepDuration,
      sleepQuality,
      recovery,
      mood,
      muscleCondition,
      painAreas,
      surveyId,
      tenantId,
      playerId,
    } = body;

    if (!surveyId || !tenantId || !playerId) {
      return NextResponse.json({ error: 'Missing required fields', body }, { status: 400 });
    }

    // Проверяем, что игрок существует
    const [foundPlayer]: any = await db.select().from(player).where(eq(player.id, playerId)).limit(1);
    if (!foundPlayer) {
      return NextResponse.json({ error: 'Player not found', playerId }, { status: 404 });
    }

    // Проверяем, есть ли уже ответ за сегодня
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const [existing]: any = await db.select().from(morningSurveyResponse)
      .where(and(
        eq(morningSurveyResponse.playerId, playerId),
        eq(morningSurveyResponse.surveyId, surveyId),
        eq(morningSurveyResponse.tenantId, tenantId),
        gte(morningSurveyResponse.createdAt, startOfDay),
        lte(morningSurveyResponse.createdAt, endOfDay)
      ))
      .limit(1);
    if (existing) {
      await db.delete(painArea).where(eq(painArea.surveyId, existing.id));
      await db.delete(morningSurveyResponse).where(eq(morningSurveyResponse.id, existing.id));
    }

    // Создаём ответ на опрос
    const [createdResponse]: any = await db.insert(morningSurveyResponse).values({
      id: uuidv4(),
      sleepDuration,
      sleepQuality,
      recovery,
      mood,
      muscleCondition,
      playerId,
      surveyId,
      tenantId,
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Вставляем painAreas
    const allPainAreas = [
      ...(painAreas?.front || []),
      ...(painAreas?.back || []),
    ];
    if (allPainAreas.length > 0) {
      await db.insert(painArea).values(
        allPainAreas.map((area: { id: string; name: string; painLevel?: number }) => ({
          id: uuidv4(),
          surveyId: createdResponse.id,
          areaName: area.name,
          painLevel: area.painLevel || 1,
          createdAt: new Date(),
        }))
      );
    }

    // Получаем ответ с painAreas
    const [response]: any = await db.select().from(morningSurveyResponse)
      .where(eq(morningSurveyResponse.id, createdResponse.id));
    const painAreasResult = await db.select().from(painArea)
      .where(eq(painArea.surveyId, createdResponse.id));
    return NextResponse.json({ ...response, painAreas: painAreasResult });
  } catch (error: any) {
    console.error('[SURVEY_RESPONSE_POST]', error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
} 