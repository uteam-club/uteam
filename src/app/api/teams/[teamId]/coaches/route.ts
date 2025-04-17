import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// GET /api/teams/[teamId]/coaches - получить список тренеров команды
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
    
    // Получаем тренеров команды через SQL запрос
    // Используем raw SQL для обхода ограничений типизации
    const coaches = await prisma.$queryRaw`
      SELECT u.id, u.name, u.email, u.image 
      FROM "users" u
      JOIN "_TeamMembers" tm ON u.id = tm."B"
      WHERE tm."A" = ${teamId}
      AND (u.role = 'MANAGER' OR u.role = 'ADMIN' OR u.role = 'SUPERADMIN')
      ORDER BY u.name ASC
    `;
    
    return NextResponse.json(coaches);
  } catch (error) {
    console.error('Ошибка при получении тренеров команды:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
}

// POST /api/teams/[teamId]/coaches - добавить пользователя-тренера в команду
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
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Не указан ID пользователя' },
        { status: 400 }
      );
    }
    
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
    
    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    // Проверяем, не добавлен ли пользователь уже в команду
    const existingMembership = await prisma.$queryRaw`
      SELECT * FROM "_TeamMembers" 
      WHERE "A" = ${teamId} AND "B" = ${userId}
      LIMIT 1
    `;
    
    if (Array.isArray(existingMembership) && existingMembership.length > 0) {
      return NextResponse.json(
        { error: 'Пользователь уже добавлен в команду' },
        { status: 400 }
      );
    }
    
    // Добавляем пользователя в команду через промежуточную таблицу
    await prisma.$executeRaw`
      INSERT INTO "_TeamMembers" ("A", "B")
      VALUES (${teamId}, ${userId})
    `;
    
    // Возвращаем данные пользователя
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image
    });
  } catch (error) {
    console.error('Ошибка при добавлении пользователя в команду:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 