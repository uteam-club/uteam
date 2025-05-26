import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Формируем базовый запрос с фильтрами
    const where: any = {
      clubId,
    };

    // Если есть поисковый запрос, ищем по заголовку или описанию
    if (validatedParams.search) {
      where.OR = [
        {
          title: {
            contains: validatedParams.search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: validatedParams.search,
            mode: 'insensitive'
          }
        }
      ];
    }

    // Фильтр по автору
    if (validatedParams.authorId) {
      where.authorId = validatedParams.authorId;
    }

    // Фильтр по категории
    if (validatedParams.categoryId) {
      where.categoryId = validatedParams.categoryId;
    }

    // Фильтр по тегам (если указаны)
    if (validatedParams.tags && validatedParams.tags.length > 0) {
      where.tags = {
        some: {
          id: {
            in: validatedParams.tags
          }
        }
      };
    }

    // Вычисляем пропускаемые элементы для пагинации
    const skip = (validatedParams.page - 1) * validatedParams.limit;
    
    // Настраиваем сортировку
    const orderBy: any = {
      [validatedParams.sortBy]: validatedParams.sortOrder
    };
    
    // Для оптимизации выполняем оба запроса параллельно
    const [totalCount, exercises] = await Promise.all([
      // Получаем общее количество записей для пагинации (оптимизированный запрос)
      prisma.exercise.count({ where }),
      
      // Выполняем запрос к базе данных с фильтрами и пагинацией
      prisma.exercise.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              exerciseCategoryId: true
            }
          },
          // Ограничиваем возвращаемые медиа элементы для оптимизации
          mediaItems: {
            take: 1, // Берем только первое изображение для карточек
            select: {
              id: true,
              name: true,
              type: true,
              url: true,
              publicUrl: true
            }
          }
        },
        orderBy,
        skip,
        take: validatedParams.limit
      })
    ]);

    // Расчет данных для пагинации
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const hasNextPage = validatedParams.page < totalPages;
    const hasPreviousPage = validatedParams.page > 1;

    // Подготавливаем ответ
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
    let cacheHeaders = {};
    
    // Если передан параметр timestamp, отключаем кеширование
    if (timestamp) {
      cacheHeaders = {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      };
    } else {
      // Используем короткое время кеширования
      cacheHeaders = {
        'Cache-Control': `max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate`,
      };
    }

    // Создаем ответ с заголовками
    const nextResponse = NextResponse.json(response, { 
      status: 200,
      headers: {
        ...cacheHeaders,
        'Content-Type': 'application/json'
      }
    });
    
    return nextResponse;
  } catch (error: any) {
    console.error('Ошибка при фильтрации упражнений:', error);
    
    // Если ошибка валидации, возвращаем понятное сообщение
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Некорректные параметры запроса',
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: 'Произошла ошибка при фильтрации упражнений',
      message: error.message
    }, { status: 500 });
  }
} 