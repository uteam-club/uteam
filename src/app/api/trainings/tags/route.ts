import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// GET /api/trainings/tags - получить все теги тренировок
export async function GET() {
  try {
    // Заглушка для тегов тренировок
    return NextResponse.json([
      {
        id: 'training-tag-1',
        name: 'Атака',
        trainingCategoryId: 'training-cat-1'
      },
      {
        id: 'training-tag-2',
        name: 'Защита',
        trainingCategoryId: 'training-cat-1'
      },
      {
        id: 'training-tag-3',
        name: 'Выносливость',
        trainingCategoryId: 'training-cat-2'
      },
      {
        id: 'training-tag-4',
        name: 'Сила',
        trainingCategoryId: 'training-cat-2'
      },
      {
        id: 'training-tag-5',
        name: 'Командная работа',
        trainingCategoryId: 'training-cat-3'
      }
    ]);
  } catch (error) {
    console.error('Ошибка при получении тегов тренировок:', error);
    return NextResponse.json(
      { error: 'Не удалось получить теги тренировок' },
      { status: 500 }
    );
  }
}

// POST /api/trainings/tags - создать новый тег тренировок
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

    // Заглушка для создания тега тренировок
    return NextResponse.json(
      { message: 'Функциональность создания тегов тренировок находится в разработке' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Ошибка при создании тега тренировок:', error);
    return NextResponse.json(
      { error: 'Не удалось создать тег тренировок' },
      { status: 500 }
    );
  }
} 