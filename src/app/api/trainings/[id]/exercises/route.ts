import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { trainingExercise, exercise, user, exerciseCategory, exerciseTag, exerciseTagToExercise, mediaItem } from '@/db/schema';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Получить упражнения тренировки
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    const trainingId = params.id;
    // Получаем все связи training-exercise
    const links = await db.select().from(trainingExercise)
      .where(eq(trainingExercise.trainingId, trainingId))
      .orderBy(asc(trainingExercise.position));
    if (!links.length) return NextResponse.json([]);
    const exerciseIds = links.map(l => l.exerciseId);
    // Получаем упражнения
    const exercises = await db.select().from(exercise).where(inArray(exercise.id, exerciseIds));
    // Получаем авторов
    const authorIds = Array.from(new Set(exercises.map(e => e.authorId)));
    const authors = authorIds.length ? await db.select().from(user).where(inArray(user.id, authorIds)) : [];
    // Получаем категории
    const categoryIds = Array.from(new Set(exercises.map(e => e.categoryId)));
    const categories = categoryIds.length ? await db.select().from(exerciseCategory).where(inArray(exerciseCategory.id, categoryIds)) : [];
    // Получаем связи упражнение-тег
    const tagLinks = await db.select().from(exerciseTagToExercise).where(inArray(exerciseTagToExercise.exerciseId, exerciseIds));
    const tagIds = tagLinks.map(t => t.exerciseTagId);
    const tags = tagIds.length ? await db.select().from(exerciseTag).where(inArray(exerciseTag.id, tagIds)) : [];
    // Получаем mediaItems
    const mediaItems = await db.select().from(mediaItem).where(inArray(mediaItem.exerciseId, exerciseIds));
    // Маппинг
    const tagsByExercise: Record<string, any[]> = {};
    tagLinks.forEach(link => {
      if (!tagsByExercise[link.exerciseId]) tagsByExercise[link.exerciseId] = [];
      const tag = tags.find(t => t.id === link.exerciseTagId);
      if (tag) tagsByExercise[link.exerciseId].push(tag);
    });
    const mediaByExercise: Record<string, any[]> = {};
    mediaItems.forEach(m => {
      if (!m.exerciseId) return;
      if (!mediaByExercise[m.exerciseId]) mediaByExercise[m.exerciseId] = [];
      mediaByExercise[m.exerciseId].push(m);
    });
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, { id: c.id, name: c.name }]));
    const authorMap = Object.fromEntries(authors.map(a => [a.id, { id: a.id, name: a.name || 'Неизвестно' }]));
    // Собираем финальный результат
    const result = links.map(link => {
      const ex = exercises.find(e => e.id === link.exerciseId);
      if (!ex) return null;
      return {
        ...ex,
        position: link.position,
        trainingExerciseId: link.id,
        notes: link.notes,
        tags: tagsByExercise[ex.id] || [],
        mediaItems: mediaByExercise[ex.id] || [],
        category: categoryMap[ex.categoryId] || { id: '', name: 'Без категории' },
        author: authorMap[ex.authorId] || { id: '', name: 'Неизвестно' },
      };
    }).filter(Boolean);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при получении упражнений тренировки:', error);
    return NextResponse.json({ error: 'Ошибка при получении упражнений тренировки' }, { status: 500 });
  }
}

// Добавить упражнения к тренировке
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    const trainingId = params.id;
    const { exerciseIds } = await req.json(); // ожидаем { exerciseIds: string[] }
    if (!Array.isArray(exerciseIds) || !exerciseIds.length) {
      return NextResponse.json({ error: 'exerciseIds должен быть массивом' }, { status: 400 });
    }
    // Получаем текущие позиции
    const existing = await db.select().from(trainingExercise).where(eq(trainingExercise.trainingId, trainingId));
    let maxPosition = existing.length > 0 ? Math.max(...existing.map(e => e.position)) : 0;
    // Вставляем новые связи
    const now = new Date();
    const values = exerciseIds.map((exerciseId, idx) => ({
      id: uuidv4(),
      trainingId,
      exerciseId,
      position: maxPosition + idx + 1,
      createdAt: now,
      updatedAt: now,
    }));
    await db.insert(trainingExercise).values(values);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при добавлении упражнений к тренировке:', error);
    return NextResponse.json({ error: 'Ошибка при добавлении упражнений к тренировке' }, { status: 500 });
  }
}

// Удалить упражнение из тренировки
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    const trainingId = params.id;
    const { trainingExerciseId } = await req.json(); // ожидаем { trainingExerciseId: string }
    if (!trainingExerciseId) {
      return NextResponse.json({ error: 'trainingExerciseId обязателен' }, { status: 400 });
    }
    await db.delete(trainingExercise).where(and(eq(trainingExercise.id, trainingExerciseId), eq(trainingExercise.trainingId, trainingId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении упражнения из тренировки:', error);
    return NextResponse.json({ error: 'Ошибка при удалении упражнения из тренировки' }, { status: 500 });
  }
}

// PATCH — обновить порядок упражнений
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    const trainingId = params.id;
    const { positions } = await req.json(); // ожидаем { positions: [{ trainingExerciseId, position }] }
    if (!Array.isArray(positions) || positions.length === 0) {
      return NextResponse.json({ error: 'positions должен быть массивом' }, { status: 400 });
    }
    // Обновляем позиции
    for (const { trainingExerciseId, position } of positions) {
      await db.update(trainingExercise)
        .set({ position, updatedAt: new Date() })
        .where(and(eq(trainingExercise.id, trainingExerciseId), eq(trainingExercise.trainingId, trainingId)));
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при обновлении порядка упражнений:', error);
    return NextResponse.json({ error: 'Ошибка при обновлении порядка упражнений' }, { status: 500 });
  }
} 