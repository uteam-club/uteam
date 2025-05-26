import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Схема валидации для создания матча
const matchSchema = z.object({
  competitionType: z.enum(['FRIENDLY', 'LEAGUE', 'CUP']),
  date: z.string(),
  time: z.string(),
  isHome: z.boolean(),
  teamId: z.string().uuid(),
  opponentName: z.string().min(1, 'Введите название команды соперника'),
  teamGoals: z.number().int().min(0).default(0),
  opponentGoals: z.number().int().min(0).default(0),
});

// GET метод для получения матчей
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // Базовые условия фильтрации
    const where: any = {
      clubId: session.user.clubId,
    };

    // Применяем фильтры, если они указаны
    if (teamId) {
      where.teamId = teamId;
    }

    if (fromDate && toDate) {
      where.date = {
        gte: new Date(fromDate),
        lte: new Date(toDate),
      };
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        team: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Ошибка при получении матчей:', error);
    return NextResponse.json({ error: 'Ошибка при получении матчей' }, { status: 500 });
  }
}

// POST метод для создания нового матча
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await request.json();
    
    // Валидация данных
    const validationResult = matchSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { 
      competitionType, 
      date, 
      time, 
      isHome, 
      teamId, 
      opponentName, 
      teamGoals, 
      opponentGoals 
    } = validationResult.data;

    // Проверка существования команды и её принадлежности к клубу пользователя
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: session.user.clubId,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
    }

    // Создание нового матча
    const match = await prisma.match.create({
      data: {
        competitionType,
        date: new Date(date),
        time,
        isHome,
        teamId,
        opponentName,
        teamGoals,
        opponentGoals,
        clubId: session.user.clubId,
      },
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании матча:', error);
    return NextResponse.json({ error: 'Ошибка при создании матча' }, { status: 500 });
  }
} 