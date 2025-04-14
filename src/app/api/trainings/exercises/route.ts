import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/trainings/exercises?trainingId=XXX - получить все упражнения для тренировки
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trainingId = searchParams.get('trainingId');
    
    if (!trainingId) {
      return NextResponse.json(
        { error: 'Не указан ID тренировки' },
        { status: 400 }
      );
    }
    
    // Получаем упражнения тренировки
    const trainingExercises = await prisma.trainingExercise.findMany({
      where: {
        trainingId: trainingId
      },
      include: {
        exercise: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        updatedAt: 'asc'
      }
    });
    
    return NextResponse.json(trainingExercises);
  } catch (error) {
    console.error('Ошибка при получении упражнений тренировки:', error);
    return NextResponse.json(
      { error: 'Не удалось получить упражнения тренировки' },
      { status: 500 }
    );
  }
}

// POST /api/trainings/exercises - добавить упражнения к тренировке
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
    
    // Проверка обязательных полей
    if (!data.trainingId || !data.exerciseId) {
      return NextResponse.json(
        { error: 'Необходимо указать ID тренировки и ID упражнения' },
        { status: 400 }
      );
    }
    
    // Проверяем существование тренировки
    const training = await prisma.training.findUnique({
      where: { id: data.trainingId }
    });
    
    if (!training) {
      return NextResponse.json(
        { error: 'Тренировка не найдена' },
        { status: 404 }
      );
    }
    
    // Проверяем существование упражнения
    const exercise = await prisma.exercise.findUnique({
      where: { id: data.exerciseId }
    });
    
    if (!exercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }
    
    // Проверяем, не добавлено ли уже упражнение в тренировку
    const existingExercise = await prisma.trainingExercise.findFirst({
      where: {
        trainingId: data.trainingId,
        exerciseId: data.exerciseId
      }
    });
    
    if (existingExercise) {
      return NextResponse.json(
        { error: 'Упражнение уже добавлено в тренировку' },
        { status: 400 }
      );
    }
    
    // Добавляем упражнение к тренировке
    const trainingExercise = await prisma.trainingExercise.create({
      data: {
        trainingId: data.trainingId,
        exerciseId: data.exerciseId,
        duration: data.duration || null,
        repetitions: data.repetitions || null,
        sets: data.sets || null,
        notes: data.notes || null,
        order: data.order || 0
      },
      include: {
        exercise: {
          include: {
            category: true
          }
        }
      }
    });
    
    return NextResponse.json(trainingExercise, { status: 201 });
  } catch (error) {
    console.error('Ошибка при добавлении упражнения к тренировке:', error);
    return NextResponse.json(
      { error: 'Не удалось добавить упражнение к тренировке' },
      { status: 500 }
    );
  }
}

// DELETE /api/trainings/exercises - удалить упражнение из тренировки
export async function DELETE(request: Request) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Не указан ID связи тренировка-упражнение' },
        { status: 400 }
      );
    }
    
    // Проверяем существование связи
    const trainingExercise = await prisma.trainingExercise.findUnique({
      where: { id }
    });
    
    if (!trainingExercise) {
      return NextResponse.json(
        { error: 'Упражнение в тренировке не найдено' },
        { status: 404 }
      );
    }
    
    // Удаляем связь
    await prisma.trainingExercise.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении упражнения из тренировки:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить упражнение из тренировки' },
      { status: 500 }
    );
  }
}

// PUT /api/trainings/exercises - обновить упражнение в тренировке
export async function PUT(request: Request) {
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
    
    // Проверка обязательных полей
    if (!data.id) {
      return NextResponse.json(
        { error: 'Необходимо указать ID упражнения в тренировке' },
        { status: 400 }
      );
    }
    
    // Проверяем существование связи
    const existingExercise = await prisma.trainingExercise.findUnique({
      where: { id: data.id }
    });
    
    if (!existingExercise) {
      return NextResponse.json(
        { error: 'Упражнение в тренировке не найдено' },
        { status: 404 }
      );
    }
    
    // Обновляем упражнение в тренировке
    const updatedExercise = await prisma.trainingExercise.update({
      where: { id: data.id },
      data: {
        duration: data.duration !== undefined ? data.duration : existingExercise.duration,
        repetitions: data.repetitions !== undefined ? data.repetitions : existingExercise.repetitions,
        sets: data.sets !== undefined ? data.sets : existingExercise.sets,
        notes: data.notes !== undefined ? data.notes : existingExercise.notes
        // Поле order временно убрано из обновления, т.к. оно еще не добавлено в схему Prisma
      },
      include: {
        exercise: {
          include: {
            category: true
          }
        }
      }
    });
    
    return NextResponse.json(updatedExercise);
  } catch (error) {
    console.error('Ошибка при обновлении упражнения в тренировке:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить упражнение в тренировке' },
      { status: 500 }
    );
  }
} 