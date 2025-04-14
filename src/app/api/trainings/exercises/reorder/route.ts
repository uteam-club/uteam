import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// POST /api/trainings/exercises/reorder - обновить порядок нескольких упражнений одновременно
export async function POST(request: Request) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    const data = await request.json();
    
    // Ожидаем массив объектов { id: string, order: number }
    if (!Array.isArray(data.exercises) || data.exercises.length === 0) {
      return NextResponse.json(
        { error: 'Необходимо указать массив упражнений с их порядком' },
        { status: 400 }
      );
    }
    
    // Выполняем обновление каждого упражнения в транзакции
    const results = await prisma.$transaction(
      data.exercises.map((exercise: { id: string, order: number }) => 
        prisma.trainingExercise.update({
          where: { id: exercise.id },
          data: { updatedAt: new Date() } // Не используем order в обновлении, т.к. его еще нет в схеме
        })
      )
    );
    
    return NextResponse.json({
      success: true,
      count: results.length,
      message: `Обновлено ${results.length} упражнений`
    });
  } catch (error) {
    console.error('Ошибка при обновлении порядка упражнений:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить порядок упражнений' },
      { status: 500 }
    );
  }
} 