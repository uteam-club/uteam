import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/auth-options';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Обработчик GET-запроса для получения всех тегов упражнений
export async function GET(req: NextRequest) {
  try {
    console.log('Начало обработки GET-запроса для тегов упражнений');
    
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    console.log('Данные сессии:', { 
      authenticated: !!session, 
      userId: session?.user?.id,
      clubId: session?.user?.clubId 
    });
    
    // Проверяем аутентификацию
    if (!session || !session.user) {
      console.error('Ошибка аутентификации: пользователь не авторизован');
      return new NextResponse(
        JSON.stringify({ error: 'Не авторизован' }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
    if (!clubId) {
      console.error('Ошибка: отсутствует ID клуба в сессии пользователя');
      return new NextResponse(
        JSON.stringify({ error: 'Отсутствует ID клуба' }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }
    
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
    
    console.log(`Найдено ${exerciseTags.length} тегов для клуба ${clubId}`);
    
    // Возвращаем список тегов
    return new NextResponse(
      JSON.stringify(exerciseTags),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Ошибка при получении тегов упражнений:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Ошибка при получении тегов упражнений',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

// Обработчик POST-запроса для создания нового тега упражнений
export async function POST(req: NextRequest) {
  try {
    console.log('Начало обработки POST-запроса для создания тега упражнений');
    
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    console.log('Данные сессии:', {
      authenticated: !!session,
      userId: session?.user?.id,
      clubId: session?.user?.clubId,
      role: session?.user?.role
    });
    
    // Проверяем аутентификацию и права доступа
    if (!session || !session.user) {
      console.error('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      console.error('Ошибка прав доступа:', { userRole: session.user.role });
      return NextResponse.json({ error: 'Нет прав доступа' }, { status: 403 });
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
    // Получаем данные из запроса
    const data = await req.json();
    console.log('Полученные данные:', data);
    
    // Проверяем обязательные поля
    if (!data.name || !data.exerciseCategoryId) {
      console.error('Ошибка валидации: отсутствуют обязательные поля');
      return NextResponse.json(
        { error: 'Название и категория обязательны' },
        { status: 400 }
      );
    }
    
    // Проверяем существование категории и принадлежность к клубу
    const category = await prisma.exerciseCategory.findFirst({
      where: {
        id: data.exerciseCategoryId,
        clubId,
      },
    });
    
    if (!category) {
      console.error('Ошибка: категория не найдена или принадлежит другому клубу');
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
    
    console.log('Тег успешно создан:', exerciseTag);
    
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