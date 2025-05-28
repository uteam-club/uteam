import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      return NextResponse.json({ error: 'Player not found', playerId }, { status: 404 });
    }

    // Проверяем, есть ли уже ответ за сегодня
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const existing = await prisma.morningSurveyResponse.findFirst({
      where: {
        playerId,
        surveyId,
        tenantId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
    if (existing) {
      await prisma.painArea.deleteMany({ where: { surveyId: existing.id } });
      await prisma.morningSurveyResponse.delete({ where: { id: existing.id } });
    }

    // painAreas: { front: [{id, name, painLevel}], back: [{id, name, painLevel}] }
    const allPainAreas = [
      ...(painAreas?.front || []),
      ...(painAreas?.back || []),
    ];

    const response = await prisma.morningSurveyResponse.create({
      data: {
        sleepDuration,
        sleepQuality,
        recovery,
        mood,
        muscleCondition,
        playerId,
        surveyId,
        tenantId,
        completedAt: new Date(),
        painAreas: {
          create: allPainAreas.map((area: { id: string; name: string; painLevel?: number }) => ({
            areaId: area.id,
            areaName: area.name,
            painLevel: area.painLevel || 1,
          }))
        }
      },
      include: { painAreas: true }
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[SURVEY_RESPONSE_POST]', error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
} 