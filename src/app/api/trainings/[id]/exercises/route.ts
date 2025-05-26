import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';

// Добавляем типы для результатов SQL запросов
interface MaxPositionResult {
  max_position: number;
}

interface ExerciseLink {
  exerciseId: string;
}

interface TrainingExerciseResult {
  id: string;
}

// GET /api/trainings/[id]/exercises - получение всех упражнений тренировки
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const trainingId = params.id;
    
    // Проверяем существование тренировки
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: { club: true }
    });
    
    if (!training) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Проверяем принадлежность пользователя к клубу
    if (training.clubId !== session.user.clubId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Пробуем загрузить связи между тренировкой и упражнениями напрямую
    const exercises = await prisma.$queryRaw`
      SELECT 
        e.id, e.title, e.description, e.author_id as "authorId", 
        u.id as "authorId", u.name as "authorName",
        e.category_id as "categoryId", ec.name as "categoryName",
        te.id as "trainingExerciseId", te.position, te.notes,
        COALESCE(json_agg(json_build_object('id', et.id, 'name', et.name)) FILTER (WHERE et.id IS NOT NULL), '[]') as tags,
        COALESCE(json_agg(json_build_object(
          'id', mi.id, 
          'url', mi.url, 
          'publicUrl', mi.public_url, 
          'type', mi.type
        )) FILTER (WHERE mi.id IS NOT NULL), '[]') as "mediaItems"
      FROM "Exercise" e
      JOIN "TrainingExercise" te ON te.exerciseId = e.id
      JOIN "User" u ON e.author_id = u.id
      JOIN "ExerciseCategory" ec ON e.category_id = ec.id
      LEFT JOIN "_ExerciseToTag" ett ON ett.a = e.id
      LEFT JOIN "ExerciseTag" et ON et.id = ett.b
      LEFT JOIN "MediaItem" mi ON mi.exercise_id = e.id
      WHERE te.trainingId = ${trainingId}
      GROUP BY e.id, te.id, u.id, ec.id
      ORDER BY te.position ASC
    `;
    
    return NextResponse.json(exercises);
  } catch (error) {
    console.error('Error fetching training exercises:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/trainings/[id]/exercises - добавление упражнений к тренировке
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const trainingId = params.id;
    const { exerciseIds } = await request.json();
    
    if (!Array.isArray(exerciseIds) || exerciseIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. exerciseIds array is required.' },
        { status: 400 }
      );
    }
    
    // Проверяем существование тренировки
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: { club: true }
    });
    
    if (!training) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Проверяем принадлежность пользователя к клубу
    if (training.clubId !== session.user.clubId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Используем SQL для вставки напрямую, так как модель может быть недоступна
    // Сначала найдем максимальную позицию
    const maxPositionResult = await prisma.$queryRaw<MaxPositionResult[]>`
      SELECT COALESCE(MAX(position), 0) as max_position 
      FROM "TrainingExercise" 
      WHERE trainingId = ${trainingId}
    `;
    
    let nextPosition = (maxPositionResult[0]?.max_position || 0) + 1;
    
    // Найдем уже существующие связи
    // Создаем безопасный запрос с параметрами
    const placeholders = exerciseIds.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      SELECT "exerciseId" 
      FROM "TrainingExercise" 
      WHERE "trainingId" = '${trainingId}' AND "exerciseId" IN (${placeholders})
    `;
    
    const existingLinks = await prisma.$queryRawUnsafe<ExerciseLink[]>(query, ...exerciseIds);
    
    const existingIds = new Set(existingLinks.map(e => e.exerciseId));
    const newExerciseIds = exerciseIds.filter(id => !existingIds.has(id));
    
    // Добавим новые связи
    const createdExercises = [];
    for (let i = 0; i < newExerciseIds.length; i++) {
      const exerciseId = newExerciseIds[i];
      const result = await prisma.$executeRaw`
        INSERT INTO "TrainingExercise" (id, position, trainingId, exerciseId, created_at, updated_at)
        VALUES (
          gen_random_uuid(), 
          ${nextPosition + i}, 
          ${trainingId}, 
          ${exerciseId}, 
          NOW(), 
          NOW()
        )
        RETURNING *
      `;
      createdExercises.push(result);
    }
    
    // Обновляем тренировку
    await prisma.training.update({
      where: { id: trainingId },
      data: { updatedAt: new Date() }
    });
    
    return NextResponse.json({
      message: `Added ${newExerciseIds.length} exercises to training`,
      addedExercises: newExerciseIds
    });
  } catch (error) {
    console.error('Error adding exercises to training:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/trainings/[id]/exercises - обновление порядка упражнений
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const trainingId = params.id;
    const { exercises } = await request.json();
    
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. exercises array is required.' },
        { status: 400 }
      );
    }
    
    // Проверяем существование тренировки
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: { club: true }
    });
    
    if (!training) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Проверяем принадлежность пользователя к клубу
    if (training.clubId !== session.user.clubId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Обновляем каждое упражнение отдельно
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      await prisma.$executeRaw`
        UPDATE "TrainingExercise"
        SET position = ${i + 1}, 
            notes = ${exercise.notes || null},
            updated_at = NOW()
        WHERE id = ${exercise.trainingExerciseId}
      `;
    }
    
    // Обновляем тренировку
    await prisma.training.update({
      where: { id: trainingId },
      data: { updatedAt: new Date() }
    });
    
    return NextResponse.json({
      message: 'Training exercises order updated successfully'
    });
  } catch (error) {
    console.error('Error updating training exercises order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/trainings/[id]/exercises/[exerciseId] - удаление упражнения из тренировки
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const trainingId = params.id;
    const url = new URL(request.url);
    const exerciseId = url.searchParams.get('exerciseId');
    
    if (!exerciseId) {
      return NextResponse.json(
        { error: 'exerciseId query parameter is required' },
        { status: 400 }
      );
    }
    
    // Проверяем существование тренировки
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: { club: true }
    });
    
    if (!training) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Проверяем принадлежность пользователя к клубу
    if (training.clubId !== session.user.clubId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Найдем сначала нужную связь
    const trainingExercise = await prisma.$queryRaw<TrainingExerciseResult[]>`
      SELECT id 
      FROM "TrainingExercise" 
      WHERE trainingId = ${trainingId} AND exerciseId = ${exerciseId}
      LIMIT 1
    `;
    
    if (!trainingExercise || trainingExercise.length === 0) {
      return NextResponse.json(
        { error: 'Exercise not found in this training' },
        { status: 404 }
      );
    }
    
    // Удаляем упражнение из тренировки
    await prisma.$executeRaw`
      DELETE FROM "TrainingExercise" 
      WHERE id = ${trainingExercise[0].id}
    `;
    
    // Обновляем позиции оставшихся упражнений
    const remainingExercises = await prisma.$queryRaw<TrainingExerciseResult[]>`
      SELECT id 
      FROM "TrainingExercise" 
      WHERE trainingId = ${trainingId}
      ORDER BY position ASC
    `;
    
    // Обновляем порядковые номера
    for (let i = 0; i < remainingExercises.length; i++) {
      await prisma.$executeRaw`
        UPDATE "TrainingExercise"
        SET position = ${i + 1},
            updated_at = NOW()
        WHERE id = ${remainingExercises[i].id}
      `;
    }
    
    // Обновляем тренировку
    await prisma.training.update({
      where: { id: trainingId },
      data: { updatedAt: new Date() }
    });
    
    return NextResponse.json({
      message: 'Exercise removed from training successfully'
    });
  } catch (error) {
    console.error('Error removing exercise from training:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 