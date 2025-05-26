import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { prisma } from '@/lib/prisma';
import { saveExerciseFile, getFileUrl, deleteExerciseFiles } from '@/lib/supabase-storage';

// Обработчик GET-запроса для получения упражнения по ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Начало обработки запроса на получение упражнения с ID: ${params.id}`);
    
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
    // Проверяем наличие ID упражнения
    if (!params.id) {
      return NextResponse.json({ error: 'ID упражнения не указан' }, { status: 400 });
    }
    
    // Находим упражнение по ID и проверяем принадлежность к клубу
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: params.id,
        clubId,
      },
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
    });
    
    // Если упражнение не найдено, возвращаем ошибку
    if (!exercise) {
      return NextResponse.json({ error: 'Упражнение не найдено' }, { status: 404 });
    }
    
    // Возвращаем найденное упражнение
    return NextResponse.json(exercise);
  } catch (error) {
    console.error(`Ошибка при получении упражнения:`, error);
    return NextResponse.json(
      { error: 'Ошибка при получении упражнения' },
      { status: 500 }
    );
  }
}

// Обработчик PUT-запроса для обновления упражнения по ID
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Начало обработки запроса на обновление упражнения с ID: ${params.id}`);
    
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию
    if (!session || !session.user) {
      console.log('Ошибка: пользователь не авторизован');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Получаем ID клуба и роль пользователя из сессии
    const clubId = session.user.clubId;
    const userId = session.user.id;
    const role = session.user.role;
    
    // Проверяем наличие ID упражнения
    if (!params.id) {
      return NextResponse.json({ error: 'ID упражнения не указан' }, { status: 400 });
    }
    
    // Находим существующее упражнение
    const existingExercise = await prisma.exercise.findFirst({
      where: {
        id: params.id,
        clubId,
      },
    });
    
    // Если упражнение не найдено, возвращаем ошибку
    if (!existingExercise) {
      return NextResponse.json({ error: 'Упражнение не найдено' }, { status: 404 });
    }
    
    // Проверяем, является ли пользователь автором упражнения или администратором
    if (existingExercise.authorId !== userId && !['ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'У вас нет прав на редактирование этого упражнения' },
        { status: 403 }
      );
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
      console.log('Ошибка: отсутствуют обязательные поля');
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }
    
    // Проверяем существование категории и принадлежность к клубу
    const category = await prisma.exerciseCategory.findFirst({
      where: {
        id: categoryId,
        clubId,
      },
    });
    
    if (!category) {
      console.log('Ошибка: категория не найдена');
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
          clubId,
        },
      });
      
      if (tags.length !== tagIdsArray.length) {
        console.log('Ошибка: некоторые теги не найдены');
        return NextResponse.json(
          { error: 'Некоторые теги не найдены' },
          { status: 400 }
        );
      }
    }
    
    // Преобразуем строковые значения длины и ширины в числа (если указаны)
    const length = lengthStr ? parseFloat(lengthStr) : null;
    const width = widthStr ? parseFloat(widthStr) : null;
    
    console.log('Обновление упражнения в базе данных');
    
    // Транзакция для обновления упражнения и связанных данных
    const updatedExercise = await prisma.$transaction(async (tx) => {
      // 1. Обновляем теги (удаляем все существующие и добавляем новые)
      await tx.exercise.update({
        where: { id: params.id },
        data: {
          tags: {
            set: [] // Удаляем все существующие связи
          }
        }
      });
      
      // 2. Обновляем данные упражнения
      const exercise = await tx.exercise.update({
        where: { id: params.id },
        data: {
          title,
          description,
          categoryId,
          length,
          width,
          tags: {
            connect: tagIdsArray.map(id => ({ id }))
          }
        },
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
          tags: true,
          mediaItems: true,
        },
      });
      
      return exercise;
    });
    
    console.log(`Упражнение успешно обновлено с ID: ${updatedExercise.id}`);
    
    // Если есть файл, сохраняем его
    if (file) {
      try {
        console.log('Загрузка файла для упражнения');
        
        // Определяем тип медиа файла
        let mediaType = 'OTHER';
        if (file.type.startsWith('image/')) {
          mediaType = 'IMAGE';
        } else if (file.type.startsWith('video/')) {
          mediaType = 'VIDEO';
        } else if (file.type.includes('pdf') || file.type.includes('document')) {
          mediaType = 'DOCUMENT';
        }
        
        // Сохраняем файл в Supabase Storage
        const storagePath = await saveExerciseFile(clubId, params.id, file, file.name);
        
        // Получаем публичный URL для файла
        const publicUrl = getFileUrl(storagePath);
        
        // Создаем запись о медиафайле в базе данных
        const mediaItem = await prisma.mediaItem.create({
          data: {
            name: file.name,
            type: mediaType as any,
            url: storagePath,
            publicUrl: publicUrl,
            size: file.size,
            clubId,
            exerciseId: params.id,
            uploadedById: userId,
          },
        });
        
        console.log(`Медиафайл успешно сохранен с ID: ${mediaItem.id}`);
      } catch (fileError) {
        console.error('Ошибка при сохранении файла:', fileError);
        // Продолжаем выполнение, даже если не удалось сохранить файл
      }
    }
    
    // Возвращаем обновленное упражнение
    return NextResponse.json(updatedExercise);
  } catch (error) {
    console.error('Ошибка при обновлении упражнения:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении упражнения' },
      { status: 500 }
    );
  }
}

// Обработчик DELETE-запроса для удаления упражнения по ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Начало обработки запроса на удаление упражнения с ID: ${params.id}`);
    
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию
    if (!session || !session.user) {
      console.log('Ошибка: пользователь не авторизован');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Получаем ID клуба и роль пользователя из сессии
    const clubId = session.user.clubId;
    const userId = session.user.id;
    const role = session.user.role;
    
    // Проверяем наличие ID упражнения
    if (!params.id) {
      return NextResponse.json({ error: 'ID упражнения не указан' }, { status: 400 });
    }
    
    // Находим существующее упражнение вместе с медиафайлами
    const existingExercise = await prisma.exercise.findFirst({
      where: {
        id: params.id,
        clubId,
      },
      include: {
        mediaItems: true,
      },
    });
    
    // Если упражнение не найдено, возвращаем ошибку
    if (!existingExercise) {
      return NextResponse.json({ error: 'Упражнение не найдено' }, { status: 404 });
    }
    
    // Проверяем, является ли пользователь автором упражнения или администратором
    if (existingExercise.authorId !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'У вас нет прав на удаление этого упражнения' },
        { status: 403 }
      );
    }
    
    // ВАЖНО: сначала удаляем файлы из хранилища Supabase,
    // а затем удаляем записи из базы данных

    // Удаляем файлы из хранилища Supabase
    console.log(`Удаляем файлы для упражнения ${params.id}`);
    
    // Если есть медиафайлы, сохраняем их ID для отслеживания
    const mediaItemIds = existingExercise.mediaItems.map(item => item.id);
    
    // Удаляем файлы из хранилища
    const storageResult = await deleteExerciseFiles(clubId, params.id);
    console.log(`Результат удаления файлов: ${storageResult ? 'успешно' : 'с ошибками'}`);
    
    // Транзакция для удаления упражнения и связанных данных из базы данных
    await prisma.$transaction(async (tx) => {
      // 1. Удаляем связанные медиафайлы из базы данных
      if (mediaItemIds.length > 0) {
        console.log(`Удаляем ${mediaItemIds.length} записей о медиафайлах из базы данных`);
        await tx.mediaItem.deleteMany({
          where: {
            id: {
              in: mediaItemIds
            }
          },
        });
      }
      
      // 2. Удаляем связи с тегами
      console.log(`Удаляем связи с тегами для упражнения ${params.id}`);
      await tx.exercise.update({
        where: {
          id: params.id,
        },
        data: {
          tags: {
            set: [] // Удаляем все связи с тегами
          }
        }
      });
      
      // 3. Удаляем само упражнение
      console.log(`Удаляем упражнение ${params.id} из базы данных`);
      await tx.exercise.delete({
        where: {
          id: params.id,
        },
      });
    });
    
    console.log(`Упражнение успешно удалено с ID: ${params.id}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Упражнение и все связанные файлы успешно удалены'
    });
    
  } catch (error) {
    console.error(`Ошибка при удалении упражнения:`, error);
    return NextResponse.json(
      { error: 'Ошибка при удалении упражнения' },
      { status: 500 }
    );
  }
} 