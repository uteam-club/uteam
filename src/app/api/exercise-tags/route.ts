import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/auth-options';
import { prisma } from '@/lib/prisma';

// Обработчик GET-запроса для получения всех тегов упражнений
export async function GET(req: NextRequest) {
  try {
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
    // Получаем список тегов упражнений для клуба пользователя
    const exerciseTags = await prisma.exerciseTag.findMany({
      where: { clubId },
      include: {
        exerciseCategory: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    // Возвращаем список тегов
    return NextResponse.json(exerciseTags);
  } catch (error) {
    console.error('Ошибка при получении тегов упражнений:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении тегов упражнений' },
      { status: 500 }
    );
  }
}

// Обработчик POST-запроса для создания нового тега упражнений
export async function POST(req: NextRequest) {
  try {
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию и права доступа
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Нет прав доступа' }, { status: 403 });
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
    // Получаем данные из запроса
    const data = await req.json();
    
    // Проверяем обязательные поля
    if (!data.name || !data.exerciseCategoryId) {
      return NextResponse.json(
        { error: 'Название и категория обязательны' },
        { status: 400 }
      );
    }
    
    // Проверяем существование категории и принадлежность к клубу
    const category = await prisma.exerciseCategory.findUnique({
      where: {
        id: data.exerciseCategoryId,
        clubId,
      },
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 400 }
      );
    }
    
    // Создаем новый тег упражнений
    const exerciseTag = await prisma.exerciseTag.create({
      data: {
        name: data.name,
        clubId,
        exerciseCategoryId: data.exerciseCategoryId,
      },
    });
    
    // Возвращаем созданный тег
    return NextResponse.json(exerciseTag);
  } catch (error) {
    console.error('Ошибка при создании тега упражнений:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании тега упражнений' },
      { status: 500 }
    );
  }
} 