import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/teams - получить список команд
export async function GET(request: Request) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    // Получаем URL-параметры
    const url = new URL(request.url);
    const includeMembers = url.searchParams.get('includeMembers') === 'true';
    
    // Получаем список команд с включением участников, если запрошено
    const teams = await prisma.team.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        members: includeMembers ? {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        } : false
      }
    });
    
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Ошибка при получении списка команд:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
}

// POST /api/teams - создать новую команду
export async function POST(request: Request) {
  try {
    // Проверка авторизации пользователя
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Проверка обязательных полей
    if (!data.name) {
      return NextResponse.json(
        { error: 'Название команды обязательно' },
        { status: 400 }
      );
    }
    
    // Создание новой команды
    const team = await prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        image: data.image
      }
    });
    
    return NextResponse.json(team);
  } catch (error) {
    console.error('Ошибка при создании команды:', error);
    return NextResponse.json(
      { error: 'Не удалось создать команду' },
      { status: 500 }
    );
  }
} 