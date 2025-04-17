import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { Prisma } from '@prisma/client';

// Функция для загрузки файла в Supabase
async function uploadFileToSupabase(file: File) {
  if (!(file instanceof File) || file.size === 0) {
    console.error('[UPLOAD] Полученный файл недействителен:', file);
    return null;
  }

  try {
    // Проверка существования бакета
    console.log('[UPLOAD_DEBUG] Проверка настроек Supabase');
    console.log('[UPLOAD_DEBUG] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[UPLOAD_DEBUG] Ключ Supabase admin доступен:', !!process.env.SUPABASE_SERVICE_KEY || !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Проверка бакета
    try {
      const { data: buckets, error: bucketsError } = await supabaseAdmin
        .storage
        .listBuckets();
      
      console.log('[UPLOAD_DEBUG] Доступные бакеты:', buckets?.map(b => b.name));
      
      if (bucketsError) {
        console.error('[UPLOAD_DEBUG] Ошибка при получении списка бакетов:', bucketsError);
      }
    } catch (bucketError) {
      console.error('[UPLOAD_DEBUG] Ошибка при доступе к бакетам:', bucketError);
    }

    // Генерируем уникальное имя файла
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    console.log(`[UPLOAD] Загрузка файла: ${fileName}, размер: ${file.size}, тип: ${file.type}`);
    
    // Преобразуем файл в ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    
    console.log(`[UPLOAD_DEBUG] Файл преобразован в ArrayBuffer, размер буфера: ${fileBuffer.byteLength}`);
    
    // Более простая и прямая загрузка файла
    console.log(`[UPLOAD_DEBUG] Попытка загрузки файла в бакет 'exercises'`);
    const { data, error } = await supabaseAdmin
      .storage
      .from('exercises')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true
      });
    
    if (error) {
      console.error(`[UPLOAD_DEBUG] Детали ошибки загрузки:`, JSON.stringify(error));
      return null;
    } else {
      console.log(`[UPLOAD_DEBUG] Успешная загрузка, данные:`, JSON.stringify(data));
    }
    
    // Получаем публичный URL
    console.log(`[UPLOAD_DEBUG] Получение публичного URL для файла ${fileName}`);
    const { data: urlData } = supabaseAdmin
      .storage
      .from('exercises')
      .getPublicUrl(fileName);
    
    if (!urlData || !urlData.publicUrl) {
      console.error('[UPLOAD] Не удалось получить публичный URL');
      return null;
    }
    
    console.log(`[UPLOAD] Файл успешно загружен, URL: ${urlData.publicUrl}`);
    
    return {
      fileUrl: urlData.publicUrl,
      fileName: fileName,
      fileType: file.type,
      fileSize: file.size
    };
    
  } catch (error) {
    console.error('[UPLOAD] Ошибка при загрузке файла:', error);
    return null;
  }
}

// GET /api/exercises/[exerciseId] - получить упражнение по ID
export async function GET(
  request: Request,
  { params }: { params: { exerciseId: string } }
) {
  const exerciseId = params.exerciseId;
  
  if (!exerciseId) {
    return NextResponse.json(
      { error: 'Не указан ID упражнения' },
      { status: 400 }
    );
  }
  
  try {
    // Получаем упражнение по ID
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });
    
    if (!exercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }
    
    // Получаем категорию
    const category = await prisma.exerciseCategory.findUnique({
      where: { id: exercise.categoryId },
      select: { name: true }
    });
    
    // Получаем связи упражнений с тегами через обе возможные таблицы
    // Теги из _ExerciseToExerciseTag
    const tagRelations1 = await prisma.$queryRaw<Array<{exerciseId: string, tagId: string}>>`
      SELECT "A" as "exerciseId", "B" as "tagId" 
      FROM "_ExerciseToExerciseTag"
      WHERE "A" = ${exercise.id}
    `;
    
    // Теги из _ExerciseToTags
    const tagRelations2 = await prisma.$queryRaw<Array<{exerciseId: string, tagId: string}>>`
      SELECT "A" as "exerciseId", "B" as "tagId" 
      FROM "_ExerciseToTags"
      WHERE "A" = ${exercise.id}
    `;
    
    // Объединяем результаты
    const tagIds = Array.from(new Set([
      ...tagRelations1.map(r => r.tagId),
      ...tagRelations2.map(r => r.tagId)
    ]));
    
    // Получаем теги по ID
    const tags = await prisma.exerciseTag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true, name: true }
    });
    
    // Формируем ответ
    const result = {
      ...exercise,
      category: category ? { name: category.name } : null,
      tags
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при получении упражнения:', error);
    return NextResponse.json(
      { error: 'Не удалось получить упражнение' },
      { status: 500 }
    );
  }
}

// PUT /api/exercises/[exerciseId] - обновить упражнение
export async function PUT(
  request: Request,
  { params }: { params: { exerciseId: string } }
) {
  const exerciseId = params.exerciseId;
  
  if (!exerciseId) {
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
      where: { id: exerciseId }
    });
    
    if (!existingExercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }
    
    // Получаем данные формы
    const formData = await request.formData();
    
    console.log('[EXERCISE_UPDATE_DEBUG] Получены данные формы');
    console.log('[EXERCISE_UPDATE_DEBUG] Доступные поля:', Array.from(formData.keys()));
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    
    console.log(`[EXERCISE_UPDATE_DEBUG] Основные поля: name=${!!name}, description=${!!description}, categoryId=${!!categoryId}`);
    
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
    console.log(`[EXERCISE_UPDATE_DEBUG] Получен файл: ${file ? 'Да' : 'Нет'}`);
    if (file) {
      console.log(`[EXERCISE_UPDATE_DEBUG] Данные файла: имя=${file.name}, тип=${file.type}, размер=${file.size}`);
    }
    
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
      console.log('[EXERCISE_UPDATE_DEBUG] Начинаем процесс загрузки файла');
      const fileData = await uploadFileToSupabase(file);
      if (fileData) {
        console.log('[EXERCISE_UPDATE_DEBUG] Файл успешно загружен, URL:', fileData.fileUrl);
        updateData.fileUrl = fileData.fileUrl;
        updateData.fileName = fileData.fileName;
        updateData.fileType = fileData.fileType;
        updateData.fileSize = fileData.fileSize;
      } else {
        console.error('[EXERCISE_UPDATE_DEBUG] Ошибка загрузки файла - fileData is null');
      }
    }
    
    // Транзакционно обновляем упражнение и связи с тегами
    const updatedExercise = await prisma.$transaction(async (tx) => {
      // Обновляем базовые данные упражнения
      const updated = await tx.exercise.update({
        where: { id: exerciseId },
        data: updateData
      });
      
      // Если есть теги, обновляем связи
      if (tagIds.length > 0) {
        // Удаляем все текущие связи в обеих таблицах
        try {
          await tx.$executeRaw`DELETE FROM "_ExerciseToExerciseTag" WHERE "A" = ${exerciseId}`;
          await tx.$executeRaw`DELETE FROM "_ExerciseToTags" WHERE "A" = ${exerciseId}`;
          
          // Добавляем новые связи в _ExerciseToExerciseTag
          await tx.$executeRaw`
            INSERT INTO "_ExerciseToExerciseTag" ("A", "B")
            SELECT ${exerciseId}, id FROM "exercise_tags" 
            WHERE id IN (${Prisma.join(tagIds)})
          `;
          
          // Также добавляем в _ExerciseToTags для совместимости
          try {
            await tx.$executeRaw`
              INSERT INTO "_ExerciseToTags" ("A", "B")
              SELECT ${exerciseId}, id FROM "tags" 
              WHERE id IN (${Prisma.join(tagIds)})
              ON CONFLICT DO NOTHING
            `;
          } catch (e) {
            console.log('Таблица _ExerciseToTags не существует или другая ошибка:', e);
            // Игнорируем ошибку, это дополнительная совместимость
          }
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
      WHERE "A" = ${exerciseId}
    `;
    
    let tagRelations2: Array<{exerciseId: string, tagId: string}> = [];
    try {
      // Пробуем получить теги из второй таблицы, но не критично если не получится
      tagRelations2 = await prisma.$queryRaw<Array<{exerciseId: string, tagId: string}>>`
        SELECT "A" as "exerciseId", "B" as "tagId" 
        FROM "_ExerciseToTags"
        WHERE "A" = ${exerciseId}
      `;
    } catch (e) {
      console.log('Таблица _ExerciseToTags не существует или другая ошибка');
    }
    
    // Объединяем результаты
    const updatedTagIds = Array.from(new Set([
      ...tagRelations1.map(r => r.tagId),
      ...tagRelations2.map(r => r.tagId)
    ]));
    
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

// DELETE /api/exercises/[exerciseId] - удалить упражнение
export async function DELETE(
  request: Request,
  { params }: { params: { exerciseId: string } }
) {
  const exerciseId = params.exerciseId;
  
  if (!exerciseId) {
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
      where: { id: exerciseId }
    });
    
    if (!existingExercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }
    
    // Удаляем упражнение вместе со связями
    await prisma.$transaction(async (tx) => {
      // Сначала удаляем все связи с тегами
      await tx.$executeRaw`DELETE FROM "_ExerciseToExerciseTag" WHERE "A" = ${exerciseId}`;
      await tx.$executeRaw`DELETE FROM "_ExerciseToTags" WHERE "A" = ${exerciseId}`;
      
      // Затем удаляем само упражнение
      return tx.exercise.delete({
        where: { id: exerciseId }
      });
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении упражнения:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении упражнения' },
      { status: 500 }
    );
  }
} 