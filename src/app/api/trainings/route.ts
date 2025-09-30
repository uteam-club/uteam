import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTrainingsByTeamId, getTrainingsByClubId } from '@/services/trainings.service';
import { db } from '@/lib/db';
import { training } from '@/db/schema/training';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    console.log('🔍 API trainings запрос:', { teamId, fromDate, toDate });

    let trainings;
    if (teamId) {
      // Если указан teamId, возвращаем тренировки конкретной команды
      trainings = await getTrainingsByTeamId(teamId, fromDate, toDate);
    } else {
      // Если teamId не указан, возвращаем все тренировки клуба
      trainings = await getTrainingsByClubId(session.user.clubId, fromDate, toDate);
    }

    return NextResponse.json(trainings);
  } catch (error) {
    console.error('Error fetching trainings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, teamId, date, time, categoryId, type = 'TRAINING' } = body;

    // Валидация обязательных полей
    if (!title || !teamId || !date || !time || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Создаем тренировку
    const [newTraining] = await db
      .insert(training)
      .values({
        title,
        teamId,
        date,
        time,
        categoryId,
        type,
        clubId: session.user.clubId,
        createdById: session.user.id,
      })
      .returning();

    return NextResponse.json(newTraining, { status: 201 });
  } catch (error) {
    console.error('Error creating training:', error);
    return NextResponse.json(
      { error: 'Failed to create training' },
      { status: 500 }
    );
  }
}