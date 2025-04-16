import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { Prisma } from '@prisma/client';

// Функция для загрузки файла в Supabase
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

      // Финальная проверка - обновить информацию о файле напрямую через SQL
      try {
        console.log(`[UPLOAD] Пробуем выполнить прямое SQL-обновление для надежности...`);
        // Используем Supabase для прямого выполнения SQL запроса
        const { data: sqlData, error: sqlError } = await supabaseAdmin.rpc('update_exercise_file', {
          exerciseId: 'id', // Заменяется при вызове функции
          fileUrl: publicUrl,
          fileName: fileName
        });
        
        if (sqlError) {
          console.warn(`[UPLOAD] Ошибка прямого SQL-обновления (не критично): ${sqlError.message}`);
        } else {
          console.log(`[UPLOAD] Прямое SQL-обновление успешно выполнено`);
        }
      } catch (sqlError) {
        console.warn(`[UPLOAD] Исключение при прямом SQL-обновлении (не критично):`, sqlError);
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