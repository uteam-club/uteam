import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Проверяем, что игрок существует
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      return new NextResponse('Player not found', { status: 404 });
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
  } catch (error) {
    console.error('[SURVEY_RESPONSE_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 