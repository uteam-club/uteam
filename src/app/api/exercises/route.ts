import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';

// GET /api/exercises - получить все упражнения
export async function GET() {
  try {
    // Получаем базовые данные упражнений с использованием raw SQL
    const exercises = await prisma.$queryRaw`
      SELECT * FROM "exercises" ORDER BY "name" ASC
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
    const authorIds = [...new Set(
      exercisesArray
        .filter((ex: any) => ex.authorId)
        .map((ex: any) => ex.authorId)
    )];
    
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

    return NextResponse.json(formattedExercises);
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
    console.log('Входящие данные формы:', Object.fromEntries(formData.entries()));
    
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

    console.log('Данные после обработки:', {
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
      console.error('Ошибка валидации категории/тегов:', e);
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

    console.log('Данные для создания упражнения:', {
      name,
      description,
      difficulty: 1,
      categoryId,
      authorId: session.user.id
    });

    // Загрузка файла в Supabase, если он есть
    if (file) {
      const fileData = await uploadFileToSupabase(file);
      if (fileData) {
        createData.fileUrl = fileData.fileUrl;
        createData.fileName = fileData.fileName;
        createData.fileType = fileData.fileType;
        createData.fileSize = fileData.fileSize;
        
        console.log('Файл успешно загружен:', fileData);
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

      // Вставляем упражнение напрямую через SQL
      await prisma.$executeRaw`
        INSERT INTO "exercises" (
          "id", "name", "description", "difficulty", "categoryId", 
          "length", "width", "authorId", "fileUrl", "fileName", 
          "fileType", "fileSize", "createdAt", "updatedAt"
        ) VALUES (
          ${baseData.id}, ${baseData.name}, ${baseData.description}, ${baseData.difficulty}, ${baseData.categoryId},
          ${baseData.length}, ${baseData.width}, ${baseData.authorId}, ${baseData.fileUrl}, ${baseData.fileName},
          ${baseData.fileType}, ${baseData.fileSize}, ${baseData.createdAt}, ${baseData.updatedAt}
        )
      `;
      
      // Затем добавляем теги отдельным запросом, если есть
      if (tagIds.length > 0) {
        try {
          // Сначала проверяем, существуют ли теги
          const result = await prisma.$queryRaw<Array<{count: string}>>`
            SELECT COUNT(*) as count FROM "exercise_tags" 
            WHERE "id" IN (${Prisma.join(tagIds)})
          `;
          
          const tagsCount = result[0] ? Number(result[0].count) : 0;
          console.log(`Найдено ${tagsCount} тегов из ${tagIds.length}`);
          
          // Добавляем в таблицу _ExerciseToExerciseTag
          if (tagsCount > 0) {
            await prisma.$executeRaw`
              INSERT INTO "_ExerciseToExerciseTag" ("A", "B")
              SELECT ${baseData.id}, id FROM "exercise_tags" 
              WHERE id IN (${Prisma.join(tagIds)})
            `;
            
            // Также добавляем в таблицу _ExerciseToTags для совместимости
            await prisma.$executeRaw`
              INSERT INTO "_ExerciseToTags" ("A", "B")
              SELECT ${baseData.id}, id FROM "exercise_tags" 
              WHERE id IN (${Prisma.join(tagIds)})
            `;
            
            console.log('Теги успешно добавлены к упражнению в обе таблицы');
          }
        } catch (tagError) {
          console.error('Ошибка при добавлении тегов:', tagError);
          // Не прерываем выполнение, продолжаем без тегов
        }
      }
      
      // Получаем созданное упражнение
      const exercise = await prisma.exercise.findUnique({
        where: {
          id: baseData.id
        },
        include: {
          category: {
            select: {
              name: true
            }
          }
        }
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
      
      // Добавляем теги к результату
      const result = {
        ...exercise,
        tags: exerciseTags
      };

      console.log('Упражнение успешно создано:', result);
      return NextResponse.json(result);
    } catch (dbError: any) {
      console.error('Ошибка создания упражнения в БД:', dbError);
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
    return NextResponse.json(
      { error: 'Не удалось создать упражнение', details: String(error) },
      { status: 500 }
    );
  }
}

// Функция для загрузки файла в Supabase Storage
async function uploadFileToSupabase(file: File) {
  if (!(file instanceof File) || file.size === 0) {
    console.log('Полученный файл не является допустимым:', file);
    return null;
  }

  try {
    // Генерируем уникальное имя файла с его оригинальным расширением
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    console.log(`Загрузка файла: ${fileName} Размер: ${file.size} Тип: ${file.type}`);
    
    let fileBuffer;
    try {
      fileBuffer = await file.arrayBuffer();
      
      // Используем supabaseAdmin для загрузки файла
      const { data, error } = await supabaseAdmin
        .storage
        .from('exercises')
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          cacheControl: '3600'
        });

      if (error) {
        console.error('Ошибка загрузки файла в Supabase:', error);
        return null;
      }

      // Получаем публичный URL файла
      const { data: urlData } = supabaseAdmin
        .storage
        .from('exercises')
        .getPublicUrl(fileName);

      return {
        fileUrl: urlData.publicUrl,
        fileName: fileName,
        fileType: file.type,
        fileSize: file.size
      };
    } catch (error) {
      console.error('Ошибка при обработке файла:', error);
      return null;
    }
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
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
    if (file) {
      const fileData = await uploadFileToSupabase(file);
      if (fileData) {
        updateData.fileUrl = fileData.fileUrl;
        updateData.fileName = fileData.fileName;
        updateData.fileType = fileData.fileType;
        updateData.fileSize = fileData.fileSize;
      }
    }
    
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
          console.log('Ошибка при обновлении связей с тегами:', e);
          // Продолжаем выполнение даже если произошла ошибка связывания с тегами
        }
      }
      
      return updated;
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
    
    // Объединяем результаты
    const updatedTagIds = [...new Set([
      ...tagRelations1.map(r => r.tagId),
      ...tagRelations2.map(r => r.tagId)
    ])];
    
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
    console.error('Ошибка при обновлении упражнения:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении упражнения' },
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
    if (existingExercise.fileUrl) {
      try {
        const fileKey = existingExercise.fileUrl.split('/').pop();
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