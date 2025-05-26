import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/auth-options';
import { prisma } from '@/lib/prisma';
import { saveExerciseFile, getFileUrl } from '@/lib/supabase-storage';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Обработчик GET-запроса для получения всех упражнений с фильтрацией
export async function GET(req: NextRequest) {
  try {
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
    // Получаем параметры запроса
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search') || '';
    const authorId = url.searchParams.get('authorId') || undefined;
    const categoryId = url.searchParams.get('categoryId') || undefined;
    const tagsParam = url.searchParams.get('tags') || '';
    
    // Преобразуем теги из строки в массив
    const tagIds = tagsParam ? tagsParam.split(',') : [];
    
    // Базовые условия фильтрации
    const whereConditions: any = {
      clubId,
    };
    
    // Добавляем поиск по заголовку
    if (searchQuery) {
      whereConditions.title = {
        contains: searchQuery,
        mode: 'insensitive',
      };
    }
    
    // Добавляем фильтрацию по автору
    if (authorId) {
      whereConditions.authorId = authorId;
    }
    
    // Добавляем фильтрацию по категории
    if (categoryId) {
      whereConditions.categoryId = categoryId;
    }
    
    // Формируем запрос на получение упражнений
    const exercises = await prisma.exercise.findMany({
      where: whereConditions,
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            exerciseCategoryId: true,
          },
        },
        mediaItems: {
          select: {
            id: true,
            name: true,
            type: true,
            url: true,
            publicUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Фильтруем результаты по тегам (если они указаны)
    let filteredExercises = exercises;
    
    if (tagIds.length > 0) {
      filteredExercises = exercises.filter((exercise) => {
        const exerciseTagIds = exercise.tags.map((tag) => tag.id);
        return tagIds.every((tagId) => exerciseTagIds.includes(tagId));
      });
    }
    
    // Возвращаем список упражнений
    return NextResponse.json(filteredExercises);
  } catch (error) {
    console.error('Ошибка при получении упражнений:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении упражнений' },
      { status: 500 }
    );
  }
}

// Обработчик POST-запроса для создания нового упражнения
export async function POST(req: NextRequest) {
  try {
    console.log('Начало обработки запроса на создание упражнения');
    
    // Получаем сессию пользователя
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Получаем данные формы
    const formData = await req.formData();
    
    // Извлекаем все необходимые данные из formData
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    const lengthStr = formData.get('length') as string | null;
    const widthStr = formData.get('width') as string | null;
    const tagIdsArray = formData.getAll('tags') as string[];
    const file = formData.get('file') as File | null;
    
    // Проверяем обязательные поля
    if (!title || !description || !categoryId) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }
    
    // Проверяем существование категории и принадлежность к клубу
    const category = await prisma.exerciseCategory.findFirst({
      where: {
        id: categoryId,
        clubId: session.user.clubId,
      },
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 400 }
      );
    }
    
    // Проверяем существование тегов
    if (tagIdsArray.length > 0) {
      const tags = await prisma.exerciseTag.findMany({
        where: {
          id: { in: tagIdsArray },
          clubId: session.user.clubId,
        },
      });
      
      if (tags.length !== tagIdsArray.length) {
        return NextResponse.json(
          { error: 'Некоторые теги не найдены' },
          { status: 400 }
        );
      }
    }
    
    // Преобразуем строковые значения длины и ширины в числа (если указаны)
    const length = lengthStr ? parseFloat(lengthStr) : null;
    const width = widthStr ? parseFloat(widthStr) : null;
    
    // Транзакция для создания упражнения и сохранения медиафайла
    console.log('Создание упражнения в базе данных');
    
    // Создаем упражнение в базе данных
    const exercise = await prisma.exercise.create({
      data: {
        title,
        description,
        categoryId,
        width,
        length,
        authorId: session.user.id,
        clubId: session.user.clubId,
        tags: { connect: tagIdsArray.map(id => ({ id })) },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: true,
        tags: true,
      },
    });
    
    console.log(`Упражнение успешно создано с ID: ${exercise.id}`);
    
    // Если есть файл, сохраняем его 
    if (file) {
      try {
        console.log('Сохранение файла для упражнения');
        
        // Определяем тип медиа
        let mediaType = 'OTHER';
        if (file.type.startsWith('image/')) {
          mediaType = 'IMAGE';
        } else if (file.type.startsWith('video/')) {
          mediaType = 'VIDEO';
        } else if (file.type.includes('pdf') || file.type.includes('document')) {
          mediaType = 'DOCUMENT';
        }
        
        // Сохраняем файл в хранилище с новой структурой папок
        const storagePath = await saveExerciseFile(session.user.clubId, exercise.id, file, file.name);
        
        // Получаем публичный URL
        const publicUrl = getFileUrl(storagePath);
        
        // Создаем запись о медиафайле в базе данных
        const mediaItem = await prisma.mediaItem.create({
          data: {
            name: file.name,
            type: mediaType as any,
            url: storagePath,
            publicUrl,
            size: file.size,
            clubId: session.user.clubId,
            exerciseId: exercise.id,
            uploadedById: session.user.id,
          },
        });
        
        console.log(`Медиафайл успешно сохранен с ID: ${mediaItem.id}`);
        
        // Обновляем return с включением медиафайла
        return NextResponse.json({
          ...exercise,
          mediaItems: [{
            id: mediaItem.id,
            name: mediaItem.name,
            type: mediaItem.type,
            url: mediaItem.url,
            publicUrl: mediaItem.publicUrl
          }]
        });
      } catch (fileError) {
        console.error('Ошибка при сохранении файла:', fileError);
        // Возвращаем созданное упражнение даже если сохранение файла не удалось
        return NextResponse.json(exercise);
      }
    }
    
    // Возвращаем созданное упражнение
    return NextResponse.json(exercise);
    
  } catch (error) {
    console.error('Ошибка при создании упражнения:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании упражнения' },
      { status: 500 }
    );
  }
} 