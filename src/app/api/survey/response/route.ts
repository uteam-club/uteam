import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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
    } = body;

    // Проверяем, что все необходимые поля присутствуют
    if (!surveyId || !tenantId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Создаем запись опросника с областями боли в одной транзакции
    const response = await prisma.morningSurveyResponse.create({
      data: {
        sleepDuration,
        sleepQuality,
        recovery,
        mood,
        muscleCondition,
        playerId: session.user.id,
        surveyId,
        tenantId,
        completedAt: new Date(),
        // Создаем связанные записи областей боли
        painAreas: {
          create: painAreas.map((area: { areaName: string; painLevel: number }) => ({
            areaName: area.areaName,
            painLevel: area.painLevel,
          }))
        }
      },
      // Включаем области боли в ответ
      include: {
        painAreas: true
      }
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('[SURVEY_RESPONSE_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 