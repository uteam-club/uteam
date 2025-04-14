import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// GET /api/trainings - получить все тренировки
export async function GET() {
  try {
    const trainings = await prisma.training.findMany({
      include: {
        category: true,
        team: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    return NextResponse.json(trainings);
  } catch (error) {
    console.error('Ошибка при получении тренировок:', error);
    return NextResponse.json(
      { error: 'Не удалось получить тренировки' },
      { status: 500 }
    );
  }
}

// POST /api/trainings - создать новую тренировку
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
    if (!data.title) {
      return NextResponse.json(
        { error: 'Название тренировки обязательно' },
        { status: 400 }
      );
    }
    
    if (!data.startTime) {
      return NextResponse.json(
        { error: 'Дата и время начала обязательны' },
        { status: 400 }
      );
    }
    
    if (!data.teamId) {
      return NextResponse.json(
        { error: 'Команда обязательна' },
        { status: 400 }
      );
    }
    
    // Вычисляем время окончания (по умолчанию +2 часа)
    const startTime = new Date(data.startTime);
    const endTime = data.endTime 
      ? new Date(data.endTime) 
      : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    
    // Создание новой тренировки
    const training = await prisma.training.create({
      data: {
        title: data.title,
        description: data.description || null,
        startTime: startTime,
        endTime: endTime,
        location: data.location,
        status: data.status || 'PLANNED',
        teamId: data.teamId,
        categoryId: data.categoryId
      },
      include: {
        category: true,
        team: true
      }
    });
    
    return NextResponse.json(training);
  } catch (error) {
    console.error('Ошибка при создании тренировки:', error);
    return NextResponse.json(
      { error: 'Не удалось создать тренировку' },
      { status: 500 }
    );
  }
} 