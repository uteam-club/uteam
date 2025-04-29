import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { Prisma } from '@prisma/client';

// GET /api/exercises - получить все упражнения
export async function GET(request: Request) {
  try {
    // Получаем URL и параметры запроса
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const orderByParam = searchParams.get('orderBy') || 'asc';
    
    // Вычисляем смещение
    const offset = (page - 1) * limit;
    
    // Определяем порядок сортировки
    const orderDirection = orderByParam === 'desc' ? 'desc' : 'asc';
    
    // Получаем общее количество упражнений для пагинации
    const totalCount = await prisma.exercise.count();
    
    // Получаем упражнения с пагинацией
    const exercises = await prisma.exercise.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        name: orderDirection as Prisma.SortOrder
      },
      include: {
        exercise_categories: true
      }
    });
    
    // Получаем теги для упражнений
    const exerciseTags = await prisma.$queryRaw`
      SELECT "A" as "exerciseId", "B" as "tagId" 
      FROM "_ExerciseTags"
    `;
    
    // Получаем данные тегов
    const tags = await prisma.exerciseTag.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    // Создаем словарь тегов
    const tagMap = new Map();
    tags.forEach(tag => {
      tagMap.set(tag.id, tag);
    });
    
    // Создаем словарь связей упражнений с тегами
    const exerciseTagsMap = new Map();
    if (Array.isArray(exerciseTags)) {
      exerciseTags.forEach((relation: any) => {
        const exerciseId = relation.exerciseId;
        const tagId = relation.tagId;
        
        if (!exerciseTagsMap.has(exerciseId)) {
          exerciseTagsMap.set(exerciseId, []);
        }
        
        if (tagMap.has(tagId)) {
          exerciseTagsMap.get(exerciseId).push(tagMap.get(tagId));
        }
      });
    }
    
    // Получаем информацию об авторах
    const authorIds = exercises
      .filter(ex => ex.authorId)
      .map(ex => ex.authorId);
    
    const uniqueAuthorIds = Array.from(new Set(authorIds)).filter(Boolean) as string[];
    
    const authors = uniqueAuthorIds.length > 0 
      ? await prisma.user.findMany({
          where: { id: { in: uniqueAuthorIds } },
          select: { id: true, name: true }
        })
      : [];
    
    // Создаем словарь авторов
    const authorMap = new Map();
    authors.forEach(author => {
      authorMap.set(author.id, author);
    });
    
    // Форматируем результат
    const formattedExercises = exercises.map(exercise => {
      return {
        ...exercise,
        category: exercise.exercise_categories 
          ? { name: exercise.exercise_categories.name } 
          : null,
        tags: exerciseTagsMap.get(exercise.id) || [],
        author: exercise.authorId && authorMap.has(exercise.authorId) 
          ? authorMap.get(exercise.authorId) 
          : null,
        // Удаляем поле exercise_categories из ответа
        exercise_categories: undefined
      };
    });

    // Отправляем результат с метаданными пагинации
    return NextResponse.json({
      exercises: formattedExercises,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка при получении упражнений:', error);
    return NextResponse.json(
      { error: 'Не удалось получить упражнения', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/exercises - создать новое упражнение
export async function POST(request: Request) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Парсим тело запроса
    const data = await request.json();
    
    // Проверка обязательных полей
    if (!data.name || !data.categoryId) {
      return NextResponse.json(
        { error: 'Название и категория обязательны' },
        { status: 400 }
      );
    }

    // Основные данные для создания упражнения
    const exerciseData: any = {
      name: data.name,
      description: data.description || null,
      difficulty: data.difficulty ? parseInt(data.difficulty, 10) : 1,
      categoryId: data.categoryId,
      authorId: session.user.id,
      length: data.length ? parseInt(data.length, 10) : null,
      width: data.width ? parseInt(data.width, 10) : null,
      fileUrl: data.fileUrl || null,
      fileName: data.fileName || null,
      fileType: data.fileType || null,
      fileSize: data.fileSize ? parseInt(data.fileSize, 10) : null
    };

    // Создаем упражнение
    const exercise = await prisma.exercise.create({
      data: exerciseData,
      include: {
        exercise_categories: {
          select: {
            name: true
          }
        }
      }
    });

    // Добавляем теги, если они есть
    const tags = [];
    if (data.tagIds && Array.isArray(data.tagIds) && data.tagIds.length > 0) {
      for (const tagId of data.tagIds) {
        try {
          await prisma.exerciseTags.create({
            data: {
              A: exercise.id,
              B: tagId
            }
          });
          // Получаем данные о теге
          const tag = await prisma.exerciseTag.findUnique({
            where: { id: tagId },
            select: { id: true, name: true }
          });
          if (tag) {
            tags.push(tag);
          }
        } catch (error) {
          console.error('Ошибка при добавлении тега:', error);
        }
      }
    }

    // Форматируем результат
    const result = {
      ...exercise,
      category: exercise.exercise_categories 
        ? { name: exercise.exercise_categories.name } 
        : null,
      tags,
      author: {
        id: session.user.id,
        name: session.user.name || ''
      },
      // Удаляем поле exercise_categories из ответа
      exercise_categories: undefined
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании упражнения:', error);
    return NextResponse.json(
      { error: 'Не удалось создать упражнение', details: String(error) },
      { status: 500 }
    );
  }
} 