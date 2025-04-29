import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// GET /api/teams/[teamId]/members - получить список участников команды
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
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' }, 
        { status: 404 }
      );
    }
    
    // Возвращаем список участников команды
    return NextResponse.json(team.users);
  } catch (error) {
    console.error('Ошибка при получении участников команды:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
}

// POST /api/teams/[teamId]/members - добавить пользователя в команду
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
      where: { id: teamId }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' }, 
        { status: 404 }
      );
    }
    
    const data = await request.json();
    
    // Проверка обязательных полей
    if (!data.userId) {
      return NextResponse.json(
        { error: 'Не указан ID пользователя' },
        { status: 400 }
      );
    }
    
    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: data.userId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    // Добавляем пользователя в команду
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        users: {
          connect: { id: data.userId }
        }
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });
    
    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Ошибка при добавлении пользователя в команду:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
} 