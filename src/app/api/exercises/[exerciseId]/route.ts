import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// GET /api/exercises/[exerciseId] - получить упражнение по ID
export async function GET(
  request: Request,
  { params }: { params: { exerciseId: string } }
) {
  try {
    const exerciseId = params.exerciseId;
    
    // Получаем упражнение по ID
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        exercise_categories: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (!exercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }
    
    // Получаем теги упражнения
    const exerciseTagRelations = await prisma.$queryRaw<Array<{tagId: string}>>`
      SELECT "B" as "tagId" FROM "_ExerciseTags" WHERE "A" = ${exerciseId}
    `;
    
    // Получаем данные тегов
    const tagIds = exerciseTagRelations.map(relation => relation.tagId);
    const tags = tagIds.length > 0 
      ? await prisma.exerciseTag.findMany({
          where: { id: { in: tagIds } },
          select: { id: true, name: true }
        })
      : [];
    
    // Получаем данные автора
    let author = null;
    if (exercise.authorId) {
      const authorData = await prisma.user.findUnique({
        where: { id: exercise.authorId },
      select: { id: true, name: true }
    });
      if (authorData) {
        author = authorData;
      }
    }
    
    // Форматируем результат
    const result = {
      ...exercise,
      category: exercise.exercise_categories ? { name: exercise.exercise_categories.name } : null,
      tags,
      author,
      // Удаляем лишние поля
      exercise_categories: undefined
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при получении упражнения:', error);
    return NextResponse.json(
      { error: 'Не удалось получить упражнение', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/exercises/[exerciseId] - обновить упражнение
export async function PUT(
  request: Request,
  { params }: { params: { exerciseId: string } }
) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    
    const exerciseId = params.exerciseId;
    
    // Проверяем существование упражнения
    const existingExercise = await prisma.exercise.findUnique({
      where: { id: exerciseId }
    });
    
    if (!existingExercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }
    
    // Получаем данные для обновления
    const data = await request.json();
    
    // Данные для обновления упражнения
    const updateData: any = {};
    
    // Обновляем только переданные поля
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.difficulty !== undefined) updateData.difficulty = parseInt(data.difficulty, 10);
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.length !== undefined) updateData.length = data.length ? parseInt(data.length, 10) : null;
    if (data.width !== undefined) updateData.width = data.width ? parseInt(data.width, 10) : null;
    if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
    if (data.fileName !== undefined) updateData.fileName = data.fileName;
    if (data.fileType !== undefined) updateData.fileType = data.fileType;
    if (data.fileSize !== undefined) updateData.fileSize = data.fileSize ? parseInt(data.fileSize, 10) : null;
    
    // Обновляем упражнение
    const updatedExercise = await prisma.exercise.update({
      where: { id: exerciseId },
      data: updateData,
      include: {
        exercise_categories: {
          select: {
            name: true
          }
        }
      }
    });
    
    // Обновляем теги, если они указаны
    if (data.tagIds !== undefined && Array.isArray(data.tagIds)) {
      // Удаляем существующие связи
      await prisma.$executeRaw`DELETE FROM "_ExerciseTags" WHERE "A" = ${exerciseId}`;
      
      // Добавляем новые теги
      for (const tagId of data.tagIds) {
        await prisma.exerciseTags.create({
          data: {
            A: exerciseId,
            B: tagId
          }
        });
      }
    }
    
    // Получаем обновленные теги
    const exerciseTagRelations = await prisma.$queryRaw<Array<{tagId: string}>>`
      SELECT "B" as "tagId" FROM "_ExerciseTags" WHERE "A" = ${exerciseId}
    `;
    
    const tagIds = exerciseTagRelations.map(relation => relation.tagId);
    const tags = tagIds.length > 0 
      ? await prisma.exerciseTag.findMany({
          where: { id: { in: tagIds } },
      select: { id: true, name: true }
        })
      : [];
    
    // Форматируем результат
    const result = {
      ...updatedExercise,
      category: updatedExercise.exercise_categories ? { name: updatedExercise.exercise_categories.name } : null,
      tags,
      // Удаляем лишние поля
      exercise_categories: undefined
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при обновлении упражнения:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить упражнение', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/exercises/[exerciseId] - удалить упражнение
export async function DELETE(
  request: Request,
  { params }: { params: { exerciseId: string } }
) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    
    const exerciseId = params.exerciseId;
    
    // Проверяем существование упражнения
    const existingExercise = await prisma.exercise.findUnique({
      where: { id: exerciseId }
    });
    
    if (!existingExercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }
    
    // Удаляем упражнение
    await prisma.exercise.delete({
        where: { id: exerciseId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении упражнения:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить упражнение', details: String(error) },
      { status: 500 }
    );
  }
} 