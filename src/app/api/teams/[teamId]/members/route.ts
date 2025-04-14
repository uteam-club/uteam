import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
        members: {
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
    return NextResponse.json(team.members);
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
    // ... existing code ...
  } catch (error) {
    console.error('Ошибка при добавлении пользователя в команду:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
} 