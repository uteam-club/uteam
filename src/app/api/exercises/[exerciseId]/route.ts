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
    // Проверка существования бакета и настроек
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('[UPLOAD_ERROR] Отсутствуют обязательные переменные окружения для Supabase');
      return null;
    }

    // Проверка бакета
    try {
      const { data: buckets, error: bucketsError } = await supabaseAdmin
        .storage
        .listBuckets();
      
      if (bucketsError) {
        console.error('[UPLOAD_ERROR] Ошибка при получении списка бакетов:', bucketsError);
        throw new Error(`Ошибка доступа к бакетам: ${bucketsError.message}`);
      }
      
      const exercisesBucket = buckets?.find(b => b.name === 'exercises');
      if (!exercisesBucket) {
        console.error('[UPLOAD_ERROR] Бакет exercises не найден');
        throw new Error('Бакет exercises не найден. Требуется создать бакет.');
      }
    } catch (bucketError) {
      console.error('[UPLOAD_ERROR] Ошибка при доступе к бакетам:', bucketError);
      throw bucketError;
    }

    // Получаем расширение файла, безопасно обрабатываем кириллицу
    const fileNameParts = file.name.split('.');
    const fileExt = fileNameParts.length > 1 ? fileNameParts.pop() : 'png';
    
    // Полностью игнорируем оригинальное имя файла, генерируем новое безопасное имя
    const safeFileName = `image_${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    
    console.log(`[UPLOAD_DEBUG] Оригинальное имя файла: "${file.name}"`);
    console.log(`[UPLOAD_DEBUG] Безопасное имя файла: "${safeFileName}"`);
    console.log(`[UPLOAD_DEBUG] Загрузка файла: ${safeFileName}, размер: ${file.size}, тип: ${file.type}`);
    
    // Преобразуем файл в ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    
    if (!fileBuffer || fileBuffer.byteLength === 0) {
      console.error('[UPLOAD_ERROR] Не удалось получить содержимое файла');
      return null;
    }
    
    console.log(`[UPLOAD_DEBUG] Файл преобразован в ArrayBuffer, размер буфера: ${fileBuffer.byteLength}`);
    
    // Загрузка файла с повторными попытками
    let attempts = 0;
    const maxAttempts = 3;
    let uploadError = null;
    let data = null;
    
    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[UPLOAD_DEBUG] Попытка ${attempts} загрузки файла в бакет 'exercises'`);
        
        const result = await supabaseAdmin
          .storage
          .from('exercises')
          .upload(safeFileName, fileBuffer, {
            contentType: file.type,
            upsert: true
          });
        
        uploadError = result.error;
        data = result.data;
        
        if (!uploadError) {
          console.log(`[UPLOAD_DEBUG] Успешная загрузка после ${attempts} попыток`);
          break;
        }
        
        console.error(`[UPLOAD_DEBUG] Ошибка в попытке ${attempts}:`, uploadError);
        
        // Небольшая задержка перед повторной попыткой
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        console.error(`[UPLOAD_DEBUG] Исключение при попытке ${attempts}:`, e);
        uploadError = e;
      }
    }
    
    if (uploadError) {
      console.error(`[UPLOAD_DEBUG] Все попытки загрузки файла неудачны. Последняя ошибка:`, uploadError);
      return null;
    }
    
    // Получаем публичный URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('exercises')
      .getPublicUrl(safeFileName);
    
    if (!urlData || !urlData.publicUrl) {
      console.error('[UPLOAD_DEBUG] Не удалось получить публичный URL');
      return null;
    }
    
    console.log(`[UPLOAD_DEBUG] Файл успешно загружен, URL: ${urlData.publicUrl}`);
    
    return {
      fileUrl: urlData.publicUrl,
      fileName: safeFileName,
      fileType: file.type,
      fileSize: file.size
    };
    
  } catch (error) {
    console.error('[UPLOAD_DEBUG] Критическая ошибка при загрузке файла:', error);
    return null;
  }
}

async function isTableExists(tx: Prisma.TransactionClient, tableName: string): Promise<boolean> {
  try {
    const result = await tx.$queryRaw<Array<{exists: boolean}>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `;
    return result[0]?.exists || false;
  } catch (error) {
    console.warn(`Ошибка при проверке существования таблицы ${tableName}:`, error);
    return false;
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
    let tagRelations2: Array<{exerciseId: string, tagId: string}> = [];
    try {
      tagRelations2 = await prisma.$queryRaw<Array<{exerciseId: string, tagId: string}>>`
        SELECT "A" as "exerciseId", "B" as "tagId" 
        FROM "_ExerciseToTags"
        WHERE "A" = ${exercise.id}
      `;
    } catch (e) {
      console.warn('Таблица _ExerciseToTags не существует или другая ошибка:', e);
      // Игнорируем ошибку - это опциональная таблица
    }
    
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
      { error: 'Не удалось получить упражнение', details: error instanceof Error ? error.message : 'Неизвестная ошибка' },
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
    const formData = await request.formData().catch(e => {
      console.error('[UPDATE_ERROR] Ошибка при получении данных формы:', e);
      throw new Error('Не удалось обработать данные формы');
    });
    
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
    const length = lengthValue && lengthValue.trim() !== '' ? parseInt(lengthValue, 10) : null;
    const width = widthValue && widthValue.trim() !== '' ? parseInt(widthValue, 10) : null;
    
    const file = formData.get('file') as File | null;
    console.log(`[EXERCISE_UPDATE_DEBUG] Получен файл: ${file ? 'Да' : 'Нет'}`);
    if (file && file instanceof File) {
      console.log(`[EXERCISE_UPDATE_DEBUG] Данные файла: имя=${file.name}, тип=${file.type}, размер=${file.size}`);
    } else if (file) {
      console.warn(`[EXERCISE_UPDATE_DEBUG] Поле 'file' получено, но не является объектом File: ${typeof file}`);
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
    if (file && file instanceof File && file.size > 0) {
      console.log('[EXERCISE_UPDATE_DEBUG] Начинаем процесс загрузки файла');
      
      // Если у упражнения уже есть файл, удаляем его перед загрузкой нового
      if (existingExercise.fileName) {
        try {
          console.log(`[EXERCISE_UPDATE_DEBUG] Удаляем старый файл ${existingExercise.fileName} из бакета exercises`);
          
          const { data: deleteData, error: deleteError } = await supabaseAdmin
            .storage
            .from('exercises')
            .remove([existingExercise.fileName]);
            
          if (deleteError) {
            console.error(`[EXERCISE_UPDATE_DEBUG] Ошибка при удалении старого файла: ${deleteError.message}`);
          } else {
            console.log(`[EXERCISE_UPDATE_DEBUG] Старый файл успешно удален из Supabase Storage`);
          }
        } catch (fileError) {
          console.error(`[EXERCISE_UPDATE_DEBUG] Ошибка при попытке удаления старого файла:`, fileError);
          // Продолжаем загрузку нового файла даже если старый не удалось удалить
        }
      }
      
      const fileData = await uploadFileToSupabase(file);
      if (fileData) {
        console.log('[EXERCISE_UPDATE_DEBUG] Файл успешно загружен, URL:', fileData.fileUrl);
        updateData.fileUrl = fileData.fileUrl;
        updateData.fileName = fileData.fileName;
        updateData.fileType = fileData.fileType;
        updateData.fileSize = fileData.fileSize;
      } else {
        console.error('[EXERCISE_UPDATE_DEBUG] Ошибка загрузки файла - fileData is null');
        return NextResponse.json(
          { error: 'Не удалось загрузить файл' },
          { status: 500 }
        );
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
          
          // Проверяем существование таблицы перед удалением
          try {
            const exists = await isTableExists(tx, '_ExerciseToTags');
            
            if (exists) {
              await tx.$executeRaw`DELETE FROM "_ExerciseToTags" WHERE "A" = ${exerciseId}`;
            }
          } catch (tableCheckError) {
            console.warn('Ошибка при проверке существования таблицы _ExerciseToTags:', tableCheckError);
          }
          
          // Добавляем новые связи в _ExerciseToExerciseTag
          for (const tagId of tagIds) {
            await tx.$executeRaw`
              INSERT INTO "_ExerciseToExerciseTag" ("A", "B")
              VALUES (${exerciseId}, ${tagId})
            `;
          }
          
          // Также добавляем в _ExerciseToTags для совместимости если таблица существует
          try {
            const exists = await isTableExists(tx, '_ExerciseToTags');
            
            if (exists) {
              for (const tagId of tagIds) {
                try {
                  await tx.$executeRaw`
                    INSERT INTO "_ExerciseToTags" ("A", "B")
                    VALUES (${exerciseId}, ${tagId})
                    ON CONFLICT DO NOTHING
                  `;
                } catch (e) {
                  console.warn(`Не удалось добавить связь в _ExerciseToTags для тега ${tagId}:`, e);
                }
              }
            }
          } catch (tableCheckError) {
            console.warn('Ошибка при проверке существования таблицы _ExerciseToTags:', tableCheckError);
          }
        } catch (e) {
          console.error('Ошибка при обновлении связей с тегами:', e);
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
      // Проверяем существование таблицы перед запросом
      const exists = await isTableExists(prisma as unknown as Prisma.TransactionClient, '_ExerciseToTags');
      
      if (exists) {
        // Пробуем получить теги из второй таблицы, но не критично если не получится
        tagRelations2 = await prisma.$queryRaw<Array<{exerciseId: string, tagId: string}>>`
          SELECT "A" as "exerciseId", "B" as "tagId" 
          FROM "_ExerciseToTags"
          WHERE "A" = ${exerciseId}
        `;
      }
    } catch (e) {
      console.warn('Ошибка при проверке или запросе _ExerciseToTags:', e);
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
      { 
        error: 'Ошибка при обновлении упражнения', 
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
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
    
    // Проверяем существование упражнения и получаем его данные для удаления файла
    const existingExercise = await prisma.exercise.findUnique({
      where: { id: exerciseId }
    });
    
    if (!existingExercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }
    
    // Если у упражнения есть файл, удаляем его из Supabase
    if (existingExercise.fileName) {
      try {
        console.log(`[DELETE] Удаляем файл ${existingExercise.fileName} из бакета exercises`);
        
        const { data, error } = await supabaseAdmin
          .storage
          .from('exercises')
          .remove([existingExercise.fileName]);
          
        if (error) {
          console.error(`[DELETE] Ошибка при удалении файла: ${error.message}`);
        } else {
          console.log(`[DELETE] Файл успешно удален из Supabase Storage`);
        }
      } catch (fileError) {
        console.error(`[DELETE] Ошибка при попытке удаления файла:`, fileError);
        // Продолжаем удаление упражнения даже если файл не удалось удалить
      }
    }
    
    // Удаляем упражнение вместе со связями
    await prisma.$transaction(async (tx) => {
      // Сначала проверяем и удаляем все связи с тегами
      // Удаляем связи в _ExerciseToExerciseTag
      await tx.$executeRaw`DELETE FROM "_ExerciseToExerciseTag" WHERE "A" = ${exerciseId}`;
      
      // Проверяем существование таблицы _ExerciseToTags перед удалением
      try {
        const exists = await isTableExists(tx, '_ExerciseToTags');
        
        if (exists) {
          await tx.$executeRaw`DELETE FROM "_ExerciseToTags" WHERE "A" = ${exerciseId}`;
        }
      } catch (tableCheckError) {
        console.warn('[DELETE] Ошибка при проверке существования таблицы _ExerciseToTags:', tableCheckError);
      }
      
      // Затем удаляем само упражнение
      return tx.exercise.delete({
        where: { id: exerciseId }
      });
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Упражнение успешно удалено',
      deletedFile: existingExercise.fileName ? true : false
    });
  } catch (error) {
    console.error('Ошибка при удалении упражнения:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка при удалении упражнения',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
} 