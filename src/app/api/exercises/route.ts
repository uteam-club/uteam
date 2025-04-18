import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { Prisma } from '@prisma/client';

// Расширенный тип Exercise, включающий дополнительные поля, не описанные в Prisma
interface ExtendedExercise {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  difficulty: number;
  categoryId: string;
  authorId?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  length?: number | null;
  width?: number | null;
  [key: string]: any;
}

// GET /api/exercises - получить все упражнения
export async function GET(request: Request) {
  try {
    // Получаем URL и параметры запроса
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    
    // Вычисляем смещение
    const offset = (page - 1) * limit;
    
    // Получаем общее количество упражнений для пагинации
    const totalCount = await prisma.exercise.count();
    
    // Получаем базовые данные упражнений с использованием raw SQL с пагинацией
    const exercises = await prisma.$queryRaw`
      SELECT * FROM "exercises" ORDER BY "name" ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    // Получаем категории для упражнений
    const categories = await prisma.exerciseCategory.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    // Создаем словарь категорий для быстрого поиска
    const categoryMap = new Map();
    categories.forEach(category => {
      categoryMap.set(category.id, category);
    });
    
    // Получаем связи упражнений с тегами через обе возможные таблицы
    // Теги из _ExerciseToExerciseTag
    const exerciseTagRelations1 = await prisma.$queryRaw`
      SELECT "A" as "exerciseId", "B" as "tagId" 
      FROM "_ExerciseToExerciseTag"
    `;
    
    // Теги из _ExerciseToTags
    const exerciseTagRelations2 = await prisma.$queryRaw`
      SELECT "A" as "exerciseId", "B" as "tagId" 
      FROM "_ExerciseToTags"
    `;
    
    // Объединяем результаты и удаляем дубликаты
    const exerciseTagRelations = [
      ...Array.isArray(exerciseTagRelations1) ? exerciseTagRelations1 : [],
      ...Array.isArray(exerciseTagRelations2) ? exerciseTagRelations2 : []
    ];
    
    // Получаем все теги
    const tags = await prisma.exerciseTag.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    // Создаем словарь тегов для быстрого поиска
    const tagMap = new Map();
    tags.forEach(tag => {
      tagMap.set(tag.id, tag);
    });
    
    // Создаем словарь связей упражнение-теги
    const exerciseTagsMap = new Map();
    exerciseTagRelations.forEach((relation: any) => {
      const exerciseId = relation.exerciseId;
      const tagId = relation.tagId;
      
      if (!exerciseTagsMap.has(exerciseId)) {
        exerciseTagsMap.set(exerciseId, []);
      }
      
      if (tagMap.has(tagId)) {
        exerciseTagsMap.get(exerciseId).push(tagMap.get(tagId));
      }
    });
    
    // Получаем информацию об авторах
    const exercisesArray = Array.isArray(exercises) ? exercises : [];
    
    // Создаем уникальный список ID авторов без использования Set
    const authorIdsMap: Record<string, boolean> = {};
    exercisesArray
      .filter((ex: any) => ex.authorId)
      .forEach((ex: any) => {
        authorIdsMap[ex.authorId] = true;
      });
    const authorIds = Object.keys(authorIdsMap);
    
    const authors = authorIds.length > 0 
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, name: true }
        })
      : [];
    
    // Создаем словарь авторов для быстрого поиска
    const authorMap = new Map();
    authors.forEach(author => {
      authorMap.set(author.id, author);
    });
    
    // Формируем финальный результат с категориями и тегами
    const formattedExercises = exercisesArray.map((exercise: any) => {
      const formattedExercise = {
        ...exercise,
        category: exercise.categoryId && categoryMap.get(exercise.categoryId) 
                ? { name: categoryMap.get(exercise.categoryId).name } 
                : null,
        tags: exerciseTagsMap.get(exercise.id) || [],
        author: exercise.authorId && authorMap.has(exercise.authorId) 
               ? authorMap.get(exercise.authorId) 
               : null
      };
      
      return formattedExercise;
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
      { error: 'Не удалось получить упражнения' },
      { status: 500 }
    );
  }
}

// POST /api/exercises - создать новое упражнение
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

    // Получаем данные формы
    const formData = await request.formData();
    
    // Логирование всех полей для отладки
    console.log('[POST] Входящие данные формы:', Object.fromEntries(formData.entries()));
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    
    // Преобразуем tagIds в массив, если это строка или массив с одним элементом
    let tagIds: string[] = [];
    
    if (formData.getAll('tagIds').length > 0) {
      // Получаем все значения с именем tagIds
      tagIds = formData.getAll('tagIds').map(tagId => tagId.toString());
    } else if (formData.get('tagIds')) {
      // Если есть одно поле tagIds
      const tagIdsValue = formData.get('tagIds');
      if (typeof tagIdsValue === 'string') {
        tagIds = [tagIdsValue];
      } else if (Array.isArray(tagIdsValue)) {
        tagIds = tagIdsValue.map(id => id.toString());
      }
    }
    
    // Преобразуем пустые строки в null для числовых полей
    const lengthValue = formData.get('length')?.toString();
    const widthValue = formData.get('width')?.toString();
    
    // Преобразуем строки в числа с проверкой на корректность
    const length = lengthValue ? parseInt(lengthValue, 10) : null;
    const width = widthValue ? parseInt(widthValue, 10) : null;
    
    const file = formData.get('file') as File | null;

    console.log('[POST] Данные после обработки:', {
      name,
      description,
      categoryId,
      tagIds,
      length,
      width,
      file: file ? `${file.name} (${file.size} bytes)` : null
    });

    // Базовая валидация
    if (!name || !description || !categoryId || tagIds.length === 0) {
      return NextResponse.json(
        { 
          error: 'Не заполнены обязательные поля',
          details: {
            name: !name ? 'Требуется имя' : null,
            description: !description ? 'Требуется описание' : null,
            categoryId: !categoryId ? 'Требуется категория' : null,
            tagIds: tagIds.length === 0 ? 'Требуется хотя бы один тег' : null
          }
        },
        { status: 400 }
      );
    }

    try {
      // Проверяем существование категории
      const category = await prisma.exerciseCategory.findUnique({
        where: { id: categoryId }
      });
      
      if (!category) {
        return NextResponse.json(
          { error: 'Указанная категория не существует' },
          { status: 400 }
        );
      }
      
      // Проверяем существование тегов
      const tagsCount = await prisma.exerciseTag.count({
        where: {
          id: { in: tagIds }
        }
      });
      
      if (tagsCount !== tagIds.length) {
        return NextResponse.json(
          { error: 'Один или несколько тегов не существуют' },
          { status: 400 }
        );
      }
    } catch (e) {
      console.error('[POST] Ошибка валидации категории/тегов:', e);
      return NextResponse.json(
        { error: 'Ошибка валидации категории или тегов' },
        { status: 500 }
      );
    }

    // Создаем базовую запись об упражнении
    const createData: any = {
      name,
      description,
      length,
      width,
      difficulty: 1, // По умолчанию
      categoryId,
      authorId: session.user.id, // Добавляем ID автора
      tags: {
        connect: tagIds.map(id => ({ id }))
      }
    };

    console.log('[POST] Базовые данные для создания упражнения:', {
      name,
      description,
      difficulty: 1,
      categoryId,
      authorId: session.user.id
    });

    // Загрузка файла в Supabase, если он есть
    let fileData = null;
    if (file) {
      console.log('[POST] Начинаем загрузку файла в Supabase...');
      fileData = await uploadFileToSupabase(file);
      if (fileData) {
        console.log('[POST] Файл успешно загружен, добавляем данные в createData');
        createData.fileUrl = fileData.fileUrl;
        createData.fileName = fileData.fileName;
        createData.fileType = fileData.fileType;
        createData.fileSize = fileData.fileSize;
        
        console.log('[POST] Данные файла добавлены в createData:', {
          fileUrl: fileData.fileUrl,
          fileName: fileData.fileName
        });
      } else {
        console.error('[POST] Не удалось загрузить файл в Supabase');
      }
    }

    try {
      // Создаем базовые данные упражнения
      const baseData = {
        id: `cm${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`, // Генерируем ID
        name,
        description,
        difficulty: 1,
        categoryId,
        length: length || null,
        width: width || null,
        authorId: session?.user?.id,
        fileUrl: createData.fileUrl || null,
        fileName: createData.fileName || null,
        fileType: createData.fileType || null,
        fileSize: createData.fileSize ? Number(createData.fileSize) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('[POST] Окончательные данные для создания упражнения:', {
        id: baseData.id,
        name: baseData.name,
        fileUrl: baseData.fileUrl ? 'URL получен' : 'нет URL',
        fileName: baseData.fileName
      });

      // Вставляем упражнение напрямую через Prisma
      const createdExercise = await prisma.exercise.create({
        data: {
          id: baseData.id,
          name: baseData.name,
          description: baseData.description,
          difficulty: baseData.difficulty,
          categoryId: baseData.categoryId,
          length: baseData.length,
          width: baseData.width,
          authorId: baseData.authorId,
          fileUrl: baseData.fileUrl,
          fileName: baseData.fileName,
          fileType: baseData.fileType,
          fileSize: baseData.fileSize
        }
      });
      
      console.log('[POST] Упражнение успешно создано в базе данных');
      
      // Затем добавляем теги отдельным запросом, если есть
      if (tagIds.length > 0) {
        try {
          // Добавление тегов через Prisma
          for (const tagId of tagIds) {
            await prisma.exerciseTags.create({
              data: {
                A: baseData.id,
                B: tagId
              }
            });
          }
          
          console.log('[POST] Теги успешно добавлены к упражнению');
        } catch (tagError) {
          console.error('[POST] Ошибка при добавлении тегов:', tagError);
          // Не прерываем выполнение, продолжаем без тегов
        }
      }
      
      // Проверяем, сохранен ли файл, если он был загружен
      if (fileData && fileData.fileUrl) {
        try {
          console.log('[POST] Проверка сохранения URL файла в БД...');
          const exerciseCheck = await prisma.exercise.findUnique({
            where: { id: baseData.id },
            select: { fileUrl: true }
          });
          
          if (!exerciseCheck?.fileUrl) {
            console.log('[POST] URL файла не сохранен, выполняем обновление...');
            await prisma.exercise.update({
              where: { id: baseData.id },
              data: { 
                fileUrl: fileData.fileUrl,
                fileName: fileData.fileName,
                fileType: fileData.fileType,
                fileSize: fileData.fileSize ? Number(fileData.fileSize) : null
              }
            });
            console.log('[POST] URL файла обновлен в БД');
          } else {
            console.log('[POST] URL файла успешно сохранен в БД');
          }
        } catch (fileCheckError) {
          console.error('[POST] Ошибка при проверке/обновлении URL файла:', fileCheckError);
        }
      }
      
      // Получаем созданное упражнение
      const exercise = await prisma.exercise.findUnique({
        where: {
          id: baseData.id
        }
      });
      
      // Получаем информацию о категории отдельно
      const category = await prisma.exerciseCategory.findUnique({
        where: { id: baseData.categoryId },
        select: { name: true }
      });
      
      // Дополнительно получаем теги из обеих связующих таблиц
      const exerciseTags: Array<{id: string, name: string}> = [];
      
      // Получаем теги из _ExerciseToExerciseTag
      const tagsFromExerciseTag = await prisma.$queryRaw<Array<{tagId: string}>>`
        SELECT "B" as "tagId" FROM "_ExerciseToExerciseTag" WHERE "A" = ${baseData.id}
      `;
      
      // Получаем теги из _ExerciseToTags
      const tagsFromTags = await prisma.$queryRaw<Array<{tagId: string}>>`
        SELECT "B" as "tagId" FROM "_ExerciseToTags" WHERE "A" = ${baseData.id}
      `;
      
      // Объединяем все ID тегов
      const allTagIds = [
        ...tagsFromExerciseTag.map(t => t.tagId),
        ...tagsFromTags.map(t => t.tagId)
      ];
      
      // Получаем полную информацию о тегах, если есть ID
      if (allTagIds.length > 0) {
        const tags = await prisma.exerciseTag.findMany({
          where: {
            id: {
              in: allTagIds
            }
          },
          select: {
            id: true,
            name: true
          }
        });
        
        // Добавляем найденные теги в результирующий массив
        exerciseTags.push(...tags);
      }
      
      // Формируем результат
      const result = {
        ...exercise,
        category: category ? { name: category.name } : { name: 'Без категории' },
        tags: exerciseTags
      };

      console.log('Упражнение успешно создано:', result);
      return NextResponse.json(result);
    } catch (dbError: any) {
      console.error('Ошибка создания упражнения в БД:', dbError);
      
      // Удаляем загруженный файл, если произошла ошибка при создании записи в БД
      if (fileData && fileData.fileName) {
        try {
          console.log(`[POST] Удаляем загруженный файл ${fileData.fileName} из-за ошибки создания упражнения`);
          
          const { data, error } = await supabaseAdmin
            .storage
            .from('exercises')
            .remove([fileData.fileName]);
            
          if (error) {
            console.error(`[POST] Ошибка при удалении файла: ${error.message}`);
          } else {
            console.log(`[POST] Файл успешно удален из Supabase Storage`);
          }
        } catch (fileError) {
          console.error(`[POST] Ошибка при попытке удаления файла:`, fileError);
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Не удалось создать упражнение в базе данных', 
          details: dbError.message || String(dbError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Общая ошибка при создании упражнения:', error);
    
    // Удаляем загруженный файл, если произошла общая ошибка
    if (fileData && fileData.fileName) {
      try {
        console.log(`[POST] Удаляем загруженный файл ${fileData.fileName} из-за общей ошибки`);
        
        const { data, error } = await supabaseAdmin
          .storage
          .from('exercises')
          .remove([fileData.fileName]);
          
        if (error) {
          console.error(`[POST] Ошибка при удалении файла: ${error.message}`);
        } else {
          console.log(`[POST] Файл успешно удален из Supabase Storage`);
        }
      } catch (fileError) {
        console.error(`[POST] Ошибка при попытке удаления файла:`, fileError);
      }
    }
    
    return NextResponse.json(
      { error: 'Не удалось создать упражнение', details: String(error) },
      { status: 500 }
    );
  }
}

// Функция для загрузки файла в Supabase Storage
async function uploadFileToSupabase(file: File) {
  if (!(file instanceof File) || file.size === 0) {
    console.error('[UPLOAD] Полученный файл не является допустимым:', file);
    return null;
  }

  try {
    // Генерируем уникальное имя файла с его оригинальным расширением
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    console.log(`[UPLOAD] Загрузка файла: ${fileName} Размер: ${file.size} Тип: ${file.type}`);
    console.log(`[UPLOAD] Используется URL Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    
    // ШАГ 1: Проверяем и создаем бакет, если он не существует
    console.log(`[UPLOAD] Проверка существования бакета exercises...`);
    let bucketExists = false;
    
    try {
      const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.getBucket('exercises');
      
      if (bucketError) {
        console.error(`[UPLOAD] Ошибка при проверке бакета:`, bucketError);
        console.log(`[UPLOAD] Попытка создать бакет exercises...`);
        
        try {
          const { data: createData, error: createError } = await supabaseAdmin.storage
            .createBucket('exercises', { public: true });
            
          if (createError) {
            console.error(`[UPLOAD] Не удалось создать бакет:`, createError);
          } else {
            console.log(`[UPLOAD] Бакет exercises успешно создан`);
            bucketExists = true;
          }
        } catch (e) {
          console.error(`[UPLOAD] Исключение при создании бакета:`, e);
        }
      } else {
        console.log(`[UPLOAD] Бакет exercises существует`);
        bucketExists = true;
      }
    } catch (bucketCheckError) {
      console.error(`[UPLOAD] Исключение при проверке бакета:`, bucketCheckError);
    }
    
    if (!bucketExists) {
      console.error(`[UPLOAD] Не удалось подтвердить существование бакета, прерываем загрузку`);
      return null;
    }
    
    // ШАГ 2: Загружаем файл в бакет
    console.log(`[UPLOAD] Начинаем загрузку файла...`);
    let fileBuffer;
    
    try {
      fileBuffer = await file.arrayBuffer();
      
      // ШАГ 3: Загрузка файла
      console.log(`[UPLOAD] Подготовлен буфер файла размером ${fileBuffer.byteLength} байт`);
      
      const uploadOptions = {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      };
      
      console.log(`[UPLOAD] Загрузка файла с опциями:`, uploadOptions);
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from('exercises')
        .upload(fileName, fileBuffer, uploadOptions);

      if (uploadError) {
        console.error(`[UPLOAD] Ошибка загрузки файла в Supabase:`, uploadError);
        console.error(`[UPLOAD] Код ошибки:`, uploadError.message);
        
        // Пробуем альтернативный метод загрузки
        console.log(`[UPLOAD] Попытка альтернативной загрузки...`);
        const formData = new FormData();
        formData.append('file', file);
        
        const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/exercises/${fileName}`;
        
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
            },
            body: formData
          });
          
          if (!response.ok) {
            console.error(`[UPLOAD] Альтернативная загрузка не удалась: ${response.status}`);
            return null;
          }
          
          console.log(`[UPLOAD] Альтернативная загрузка успешна!`);
        } catch (altError) {
          console.error(`[UPLOAD] Ошибка альтернативной загрузки:`, altError);
          return null;
        }
      }

      console.log(`[UPLOAD] Файл успешно загружен:`, uploadData?.path || 'путь не возвращен');

      // ШАГ 4: Получаем публичный URL файла
      console.log(`[UPLOAD] Получаем публичный URL файла...`);
      
      const publicUrlResult = supabaseAdmin
        .storage
        .from('exercises')
        .getPublicUrl(fileName);
      
      console.log(`[UPLOAD] Результат получения URL:`, publicUrlResult);
      
      if (!publicUrlResult.data || !publicUrlResult.data.publicUrl) {
        console.error(`[UPLOAD] Не удалось получить публичный URL файла`);
        
        // Пробуем сформировать URL вручную
        const manualUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercises/${fileName}`;
        console.log(`[UPLOAD] Сформирован URL вручную: ${manualUrl}`);
        
        return {
          fileUrl: manualUrl,
          fileName: fileName,
          fileType: file.type,
          fileSize: file.size
        };
      }

      const publicUrl = publicUrlResult.data.publicUrl;
      console.log(`[UPLOAD] Получен публичный URL:`, publicUrl);
      
      // Проверяем доступность файла по URL
      try {
        console.log(`[UPLOAD] Проверка доступности файла по URL...`);
        const testRequest = await fetch(publicUrl, { method: 'HEAD' });
        console.log(`[UPLOAD] Статус ответа при проверке URL: ${testRequest.status}`);
      } catch (urlTestError) {
        console.warn(`[UPLOAD] Ошибка при проверке URL (это предупреждение):`, urlTestError);
        // Продолжаем выполнение даже при ошибке проверки
      }

      return {
        fileUrl: publicUrl,
        fileName: fileName,
        fileType: file.type,
        fileSize: file.size
      };
    } catch (processError) {
      console.error(`[UPLOAD] Ошибка при обработке файла:`, processError);
      return null;
    }
  } catch (error) {
    console.error(`[UPLOAD] Общая ошибка при загрузке файла:`, error);
    return null;
  }
}

// Обновление упражнения по ID
export async function PUT(
  request: Request
) {
  // Extract the ID from the URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  
  if (!id || id === 'exercises') {
    return NextResponse.json(
      { error: 'Не указан ID упражнения' },
      { status: 400 }
    );
  }
  
  try {
    // Проверка авторизации пользователя
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    // Проверяем существование упражнения
    const existingExercise = await prisma.exercise.findUnique({
      where: { id }
    });
    
    if (!existingExercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }
    
    // Получаем данные формы
    const formData = await request.formData();
    
    console.log('[PUT] Входящие данные формы:', Object.fromEntries(formData.entries()));
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    
    // Преобразуем tagIds в массив
    let tagIds: string[] = [];
    
    if (formData.getAll('tagIds').length > 0) {
      // Получаем все значения с именем tagIds
      tagIds = formData.getAll('tagIds').map(tagId => tagId.toString());
    } else if (formData.get('tagIds')) {
      // Если есть одно поле tagIds
      const tagIdsValue = formData.get('tagIds');
      if (typeof tagIdsValue === 'string') {
        tagIds = [tagIdsValue];
      } else if (Array.isArray(tagIdsValue)) {
        tagIds = tagIdsValue.map(id => id.toString());
      }
    }
    
    // Преобразуем пустые строки в null для числовых полей
    const lengthValue = formData.get('length')?.toString();
    const widthValue = formData.get('width')?.toString();
    
    // Преобразуем строки в числа с проверкой на корректность
    const length = lengthValue ? parseInt(lengthValue, 10) : null;
    const width = widthValue ? parseInt(widthValue, 10) : null;
    
    const file = formData.get('file') as File | null;

    console.log('[PUT] Данные после обработки:', {
      name,
      description,
      categoryId,
      tagIds,
      length,
      width,
      file: file ? `${file.name} (${file.size} bytes)` : null
    });
    
    // Базовая валидация
    if (!name || !description || !categoryId) {
      return NextResponse.json(
        { 
          error: 'Не заполнены обязательные поля',
          details: {
            name: !name ? 'Требуется имя' : null,
            description: !description ? 'Требуется описание' : null,
            categoryId: !categoryId ? 'Требуется категория' : null
          }
        },
        { status: 400 }
      );
    }
    
    // Проверяем существование категории
    const category = await prisma.exerciseCategory.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Указанная категория не существует' },
        { status: 400 }
      );
    }
    
    // Проверяем существование тегов, если они указаны
    if (tagIds.length > 0) {
      const tagsCount = await prisma.exerciseTag.count({
        where: {
          id: { in: tagIds }
        }
      });
      
      if (tagsCount !== tagIds.length) {
        return NextResponse.json(
          { error: 'Один или несколько тегов не существуют' },
          { status: 400 }
        );
      }
    }
    
    // Создаем данные для обновления
    let updateData: any = {
      name,
      description,
      categoryId,
      length,
      width
    };
    
    // Загрузка файла в Supabase, если он есть
    let fileData = null;
    if (file) {
      console.log('[PUT] Начинаем загрузку файла в Supabase...');
      fileData = await uploadFileToSupabase(file);
      if (fileData) {
        console.log('[PUT] Файл успешно загружен, добавляем данные для обновления');
        updateData.fileUrl = fileData.fileUrl;
        updateData.fileName = fileData.fileName;
        updateData.fileType = fileData.fileType;
        updateData.fileSize = fileData.fileSize;
        
        console.log('[PUT] Данные файла добавлены в updateData:', {
          fileUrl: fileData.fileUrl,
          fileName: fileData.fileName
        });
      } else {
        console.error('[PUT] Не удалось загрузить файл в Supabase');
      }
    }
    
    console.log('[PUT] Данные для обновления:', updateData);
    
    try {
      // Транзакционно обновляем упражнение и связи с тегами
      const updatedExercise = await prisma.$transaction(async (tx) => {
        // Обновляем базовые данные упражнения
        const updated = await tx.exercise.update({
          where: { id },
          data: updateData
        });
        
        // Если есть теги, обновляем связи
        if (tagIds.length > 0) {
          // Удаляем все текущие связи в обеих таблицах
          try {
            await tx.$executeRaw`DELETE FROM "_ExerciseToExerciseTag" WHERE "A" = ${id}`;
            await tx.$executeRaw`DELETE FROM "_ExerciseToTags" WHERE "A" = ${id}`;
            
            // Добавляем новые связи в _ExerciseToExerciseTag
            await tx.$executeRaw`
              INSERT INTO "_ExerciseToExerciseTag" ("A", "B")
              SELECT ${id}, id FROM "exercise_tags" 
              WHERE id IN (${Prisma.join(tagIds)})
            `;
            
            // Также добавляем в _ExerciseToTags для совместимости
            await tx.$executeRaw`
              INSERT INTO "_ExerciseToTags" ("A", "B")
              SELECT ${id}, id FROM "tags" 
              WHERE id IN (${Prisma.join(tagIds)})
              ON CONFLICT DO NOTHING
            `;
          } catch (e) {
            console.log('[PUT] Ошибка при обновлении связей с тегами:', e);
            // Продолжаем выполнение даже если произошла ошибка связывания с тегами
          }
        }
        
        // Проверяем, правильно ли обновлен URL файла, если он был загружен
        if (fileData && fileData.fileUrl && (!updated.fileUrl || updated.fileUrl !== fileData.fileUrl)) {
          console.log('[PUT] Дополнительная проверка обновления URL файла...');
          // Повторное обновление, если URL файла не обновился в первом запросе
          return await tx.exercise.update({
            where: { id },
            data: { 
              fileUrl: fileData.fileUrl,
              fileName: fileData.fileName,
              fileType: fileData.fileType,
              fileSize: fileData.fileSize ? Number(fileData.fileSize) : null
            }
          });
        }
        
        return updated;
      });
      
      console.log('[PUT] Упражнение успешно обновлено:', {
        id: updatedExercise.id,
        name: updatedExercise.name,
        fileUrl: updatedExercise.fileUrl
      });
      
      // Получаем обновленные данные вместе с тегами
      // Получаем связи упражнений с тегами через обе возможные таблицы
      const tagRelations1 = await prisma.$queryRaw<Array<{exerciseId: string, tagId: string}>>`
        SELECT "A" as "exerciseId", "B" as "tagId" 
        FROM "_ExerciseToExerciseTag"
        WHERE "A" = ${id}
      `;
      
      const tagRelations2 = await prisma.$queryRaw<Array<{exerciseId: string, tagId: string}>>`
        SELECT "A" as "exerciseId", "B" as "tagId" 
        FROM "_ExerciseToTags"
        WHERE "A" = ${id}
      `;
      
      // Создаем объединенный набор уникальных тегов
      const tagIdsSet = new Set([
        ...tagRelations1.map(r => r.tagId),
        ...tagRelations2.map(r => r.tagId)
      ]);
      const updatedTagIds = Array.from(tagIdsSet);
      
      // Получаем теги по ID
      const tags = await prisma.exerciseTag.findMany({
        where: { id: { in: updatedTagIds } },
        select: { id: true, name: true }
      });
      
      // Формируем ответ
      const result = {
        ...updatedExercise,
        category: { name: category.name },
        tags
      };
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('[PUT] Ошибка при обновлении упражнения:', error);
      return NextResponse.json(
        { error: 'Ошибка при обновлении упражнения', details: String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[PUT] Общая ошибка при обновлении упражнения:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении упражнения', details: String(error) },
      { status: 500 }
    );
  }
}

// Удаление упражнения по ID
export async function DELETE(
  request: Request
) {
  // Extract the ID from the URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  
  if (!id || id === 'exercises') {
    return NextResponse.json(
      { error: 'Не указан ID упражнения' },
      { status: 400 }
    );
  }
  
  try {
    // Проверка авторизации пользователя
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    // Проверяем существование упражнения
    const existingExercise = await prisma.exercise.findUnique({
      where: { id }
    });
    
    if (!existingExercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }
    
    // Транзакционно удаляем упражнение и все связи
    await prisma.$transaction(async (tx) => {
      // Удаляем связи с тегами
      try {
        await tx.$executeRaw`DELETE FROM "_ExerciseToExerciseTag" WHERE "A" = ${id}`;
        await tx.$executeRaw`DELETE FROM "_ExerciseToTags" WHERE "A" = ${id}`;
      } catch (e) {
        console.log('Ошибка при удалении связей с тегами:', e);
        // Продолжаем выполнение даже если произошла ошибка
      }
      
      // Удаляем само упражнение
      await tx.exercise.delete({
        where: { id }
      });
    });
    
    // Если есть файл, пытаемся удалить его из Supabase
    const exerciseWithFile = existingExercise as ExtendedExercise;
    if (exerciseWithFile.fileUrl) {
      try {
        const fileKey = exerciseWithFile.fileUrl.split('/').pop();
        if (fileKey) {
          await supabaseAdmin.storage.from('exercises').remove([fileKey]);
        }
      } catch (e) {
        console.log('Ошибка при удалении файла из Supabase:', e);
        // Не критическая ошибка, продолжаем выполнение
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении упражнения:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении упражнения' },
      { status: 500 }
    );
  }
} 