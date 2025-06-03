import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { z } from 'zod';
import { createApiResponse, dynamicConfig } from '../../config';
import { db } from '@/lib/db';
import { exercise, user, exerciseCategory, exerciseTag, mediaItem, exerciseTagToExercise } from '@/db/schema';
import { eq, and, inArray, ilike, desc, sql } from 'drizzle-orm';

// Экспортируем конфигурацию для Next.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Время кеширования ответа в секундах
const CACHE_MAX_AGE = 3; // Уменьшаем до 3 секунд для более быстрого обновления данных

// Схема для параметров сортировки
const SortFieldSchema = z.enum(['title', 'createdAt', 'updatedAt']).default('createdAt');
const SortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// Схема валидации для параметров запроса
const FilterSchema = z.object({
  search: z.string().optional(),
  authorId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string().uuid()).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(12), // Изменяем дефолтный лимит с 20 на 12
  sortBy: SortFieldSchema.optional().default('createdAt'),
  sortOrder: SortOrderSchema.optional().default('desc')
});

export async function GET(request: NextRequest) {
  try {
    // Получаем сессию пользователя
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return createApiResponse({ error: 'Unauthorized' }, 401);
    }

    // Получаем ID клуба пользователя
    const clubId = session.user.clubId;
    
    // Извлекаем параметры запроса
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search') || undefined;
    const authorId = url.searchParams.get('authorId') || undefined;
    const categoryId = url.searchParams.get('categoryId') || undefined;
    const tags = url.searchParams.getAll('tags');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '12', 10); // Изменяем дефолтный лимит с 20 на 12
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const timestamp = url.searchParams.get('t') || undefined; // Проверяем наличие временной метки

    // Валидируем параметры
    const validatedParams = FilterSchema.parse({
      search: searchQuery,
      authorId,
      categoryId,
      tags: tags.length > 0 ? tags : undefined,
      page,
      limit,
      sortBy,
      sortOrder
    });

    // Формируем where-условия для Drizzle
    const whereArr = [eq(exercise.clubId, clubId)];
    if (validatedParams.search) {
      whereArr.push(ilike(exercise.title, `%${validatedParams.search}%`));
    }
    if (validatedParams.authorId) {
      whereArr.push(eq(exercise.authorId, validatedParams.authorId));
    }
    if (validatedParams.categoryId) {
      whereArr.push(eq(exercise.categoryId, validatedParams.categoryId));
    }
    // Фильтрация по тегам через join-таблицу
    let exerciseIdsByTags: string[] = [];
    if (validatedParams.tags && validatedParams.tags.length > 0) {
      const tagLinks = await db.select().from(exerciseTagToExercise).where(inArray(exerciseTagToExercise.exerciseTagId, validatedParams.tags));
      exerciseIdsByTags = tagLinks.map(t => t.exerciseId);
      if (exerciseIdsByTags.length > 0) {
        whereArr.push(inArray(exercise.id, exerciseIdsByTags));
      } else {
        // Нет совпадений по тегам — сразу возвращаем пустой результат
        return createApiResponse({ exercises: [], pagination: { page: validatedParams.page, limit: validatedParams.limit, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false }, filters: validatedParams, sorting: { sortBy: validatedParams.sortBy, sortOrder: validatedParams.sortOrder } }, 200);
      }
    }
    // ---
    // Получаем total через raw count(*)
    const totalCountRes = await db.execute(sql`SELECT count(*)::int as count FROM "Exercise" WHERE ${sql.join(whereArr, sql` AND `)}`);
    const totalCount = (totalCountRes as any).rows?.[0]?.count || 0;
    // ---
    // Пагинация
    const skip = (validatedParams.page - 1) * validatedParams.limit;
    // ---
    // Получаем упражнения с join
    let orderField;
    switch (validatedParams.sortBy) {
      case 'title':
        orderField = exercise.title;
        break;
      case 'createdAt':
        orderField = exercise.createdAt;
        break;
      case 'updatedAt':
        orderField = exercise.updatedAt;
        break;
      default:
        orderField = exercise.createdAt;
    }
    const exercisesRaw = await db.select().from(exercise)
      .leftJoin(user, eq(exercise.authorId, user.id))
      .leftJoin(exerciseCategory, eq(exercise.categoryId, exerciseCategory.id))
      .where(and(...whereArr))
      .orderBy(sortOrder === 'desc' ? desc(orderField) : orderField)
      .limit(validatedParams.limit)
      .offset(skip);

    // Получаем все id упражнений на этой странице
    const exerciseIds = exercisesRaw.map(row => row.Exercise.id);
    // Получаем связи упражнение-тег
    const tagLinks = exerciseIds.length > 0 ? await db.select().from(exerciseTagToExercise).where(inArray(exerciseTagToExercise.exerciseId, exerciseIds)) : [];
    const tagIdsAll = tagLinks.map(l => l.exerciseTagId);
    // Получаем теги
    const tagsList = tagIdsAll.length > 0 ? await db.select().from(exerciseTag).where(inArray(exerciseTag.id, tagIdsAll)) : [];
    // Маппинг тегов по упражнению
    const tagsByExercise: Record<string, any[]> = {};
    tagLinks.forEach(link => {
      if (!tagsByExercise[link.exerciseId]) tagsByExercise[link.exerciseId] = [];
      const tag = tagsList.find(t => t.id === link.exerciseTagId);
      if (tag) tagsByExercise[link.exerciseId].push(tag);
    });
    // Получаем mediaItems для упражнений
    const mediaItems = exerciseIds.length > 0 ? await db.select().from(mediaItem).where(inArray(mediaItem.exerciseId, exerciseIds)) : [];
    const mediaByExercise: Record<string, any[]> = {};
    mediaItems.forEach(m => {
      if (!m.exerciseId) return;
      if (!mediaByExercise[m.exerciseId]) mediaByExercise[m.exerciseId] = [];
      mediaByExercise[m.exerciseId].push(m);
    });
    // Маппинг в нужную структуру
    const exercises = exercisesRaw.map(row => {
      const ex = row.Exercise;
      return {
        ...ex,
        author: row.User ? { id: row.User.id, name: row.User.name || 'Неизвестно' } : { id: null, name: 'Неизвестно' },
        category: row.ExerciseCategory ? { id: row.ExerciseCategory.id, name: row.ExerciseCategory.name } : null,
        tags: tagsByExercise[ex.id] || [],
        mediaItems: mediaByExercise[ex.id] || [],
      };
    });
    // ---
    // Формируем ответ
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const hasNextPage = validatedParams.page < totalPages;
    const hasPreviousPage = validatedParams.page > 1;
    const response = {
      exercises,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalItems: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      filters: {
        search: validatedParams.search,
        authorId: validatedParams.authorId,
        categoryId: validatedParams.categoryId,
        tags: validatedParams.tags
      },
      sorting: {
        sortBy: validatedParams.sortBy,
        sortOrder: validatedParams.sortOrder
      }
    };

    // Определяем заголовки кеширования
    const cacheHeaders = timestamp ? {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    } : {
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, must-revalidate`,
      'CDN-Cache-Control': `public, max-age=${CACHE_MAX_AGE}`
    };

    return createApiResponse(response, 200, cacheHeaders);
  } catch (error: any) {
    console.error('Ошибка при фильтрации упражнений:', error);
    
    // Если ошибка валидации, возвращаем понятное сообщение
    if (error instanceof z.ZodError) {
      return createApiResponse({ 
        error: 'Некорректные параметры запроса',
        details: error.errors 
      }, 400);
    }
    
    return createApiResponse({
      error: 'Произошла ошибка при фильтрации упражнений',
      message: error.message
    }, 500);
  }
} 