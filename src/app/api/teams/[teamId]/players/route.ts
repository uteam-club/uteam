import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/teams/[teamId]/players - получить список игроков команды
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    const teamId = params.teamId;
    
    // Проверяем существование команды
    const team = await prisma.team.findUnique({
      where: {
        id: teamId
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' }, 
        { status: 404 }
      );
    }
    
    // Получаем игроков команды
    const players = await prisma.player.findMany({
      where: {
        teamId: teamId
      },
      orderBy: {
        lastName: 'asc'
      }
    });
    
    return NextResponse.json(players);
  } catch (error) {
    console.error('Ошибка при получении игроков команды:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
}

// POST /api/teams/[teamId]/players - добавить игрока в команду
export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    const teamId = params.teamId;
    
    // Проверяем существование команды
    const team = await prisma.team.findUnique({
      where: {
        id: teamId
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' }, 
        { status: 404 }
      );
    }
    
    // Получаем данные из запроса
    const data = await request.json();
    
    // Проверяем наличие необходимых полей
    if (!data.firstName || !data.lastName) {
      return NextResponse.json(
        { error: 'Необходимо указать имя и фамилию игрока' },
        { status: 400 }
      );
    }
    
    // Создаем нового игрока
    const newPlayer = await prisma.player.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        number: data.number || null,
        position: data.position || null,
        teamId: teamId
      }
    });
    
    return NextResponse.json(newPlayer);
  } catch (error) {
    console.error('Ошибка при добавлении игрока в команду:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
} 