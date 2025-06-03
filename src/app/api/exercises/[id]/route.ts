import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { saveExerciseFile, getFileUrl, deleteExerciseFiles } from '@/lib/supabase-storage';
import { db } from '@/lib/db';
import { exercise, user, exerciseCategory, exerciseTag, mediaItem, exerciseTagToExercise } from '@/db/schema';
import { eq, and, inArray, ilike } from 'drizzle-orm';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Обработчик GET-запроса для получения упражнения по ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    const clubId = session.user.clubId;
    if (!params.id) {
      return NextResponse.json({ error: 'ID упражнения не указан' }, { status: 400 });
    }
    // Получаем упражнение
    const exerciseRows = await db.select().from(exercise)
      .where(and(eq(exercise.id, params.id), eq(exercise.clubId, clubId)));
    if (!exerciseRows.length) {
      return NextResponse.json({ error: 'Упражнение не найдено' }, { status: 404 });
    }
    const ex = exerciseRows[0];
    // Получаем автора
    const author = await db.select().from(user).where(eq(user.id, ex.authorId));
    // Получаем категорию
    const category = await db.select().from(exerciseCategory).where(eq(exerciseCategory.id, ex.categoryId));
    // Получаем теги через join-таблицу
    const tagLinks = await db.select().from(exerciseTagToExercise).where(eq(exerciseTagToExercise.exerciseId, ex.id));
    const tagIds = tagLinks.map(t => t.exerciseTagId);
    let tags: any[] = [];
    if (tagIds.length) {
      tags = await db.select().from(exerciseTag).where(inArray(exerciseTag.id, tagIds));
    }
    // Получаем mediaItems
    const mediaItems = await db.select().from(mediaItem).where(eq(mediaItem.exerciseId, ex.id));
    return NextResponse.json({
      ...ex,
      authorName: author[0]?.name || null,
      categoryName: category[0]?.name || null,
      tags,
      mediaItems,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при получении упражнения' }, { status: 500 });
  }
}

// Обработчик PUT-запроса для обновления упражнения по ID
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    const clubId = session.user.clubId;
    const userId = session.user.id;
    const role = session.user.role;
    if (!params.id) {
      return NextResponse.json({ error: 'ID упражнения не указан' }, { status: 400 });
    }
    // Проверяем существование упражнения
    const exerciseRows = await db.select().from(exercise).where(and(eq(exercise.id, params.id), eq(exercise.clubId, clubId)));
    if (!exerciseRows.length) {
      return NextResponse.json({ error: 'Упражнение не найдено' }, { status: 404 });
    }
    const ex = exerciseRows[0];
    if (ex.authorId !== userId && !['ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Нет прав на редактирование' }, { status: 403 });
    }
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    const lengthStr = formData.get('length') as string | null;
    const widthStr = formData.get('width') as string | null;
    const tagIdsArray = formData.getAll('tags') as string[];
    const file = formData.get('file') as File | null;
    if (!title || !description || !categoryId) {
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }
    // Проверяем существование категории
    const categoryRows = await db.select().from(exerciseCategory).where(and(eq(exerciseCategory.id, categoryId), eq(exerciseCategory.clubId, clubId)));
    if (!categoryRows.length) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 });
    }
    // Проверяем существование тегов
    if (tagIdsArray.length > 0) {
      const tags = await db.select().from(exerciseTag).where(and(inArray(exerciseTag.id, tagIdsArray), eq(exerciseTag.clubId, clubId)));
      if (tags.length !== tagIdsArray.length) {
        return NextResponse.json({ error: 'Некоторые теги не найдены' }, { status: 400 });
      }
    }
    const length = lengthStr ? parseFloat(lengthStr) : null;
    const width = widthStr ? parseFloat(widthStr) : null;
    // Транзакция
    await db.transaction(async (tx) => {
      // Удаляем старые связи тегов
      await tx.delete(exerciseTagToExercise).where(eq(exerciseTagToExercise.exerciseId, params.id));
      // Добавляем новые связи тегов
      if (tagIdsArray.length > 0) {
        await tx.insert(exerciseTagToExercise).values(tagIdsArray.map(tagId => ({ exerciseId: params.id, exerciseTagId: tagId })));
      }
      // Обновляем упражнение
      await tx.update(exercise).set({ title, description, categoryId, length, width }).where(eq(exercise.id, params.id));
    });
    // Если есть файл, сохраняем
    if (file) {
      const storagePath = `clubs/${clubId}/exercises/${params.id}/${file.name}`;
      await saveExerciseFile(file, storagePath);
      const publicUrl = getFileUrl(storagePath);
      await db.insert(mediaItem).values({
        name: file.name,
        type: 'OTHER',
        url: storagePath,
        publicUrl,
        size: file.size,
        clubId,
        exerciseId: params.id,
        uploadedById: userId,
      });
    }
    // После обновления возвращаем полный объект упражнения
    // Получаем упражнение
    const updatedRows = await db.select().from(exercise).where(and(eq(exercise.id, params.id), eq(exercise.clubId, clubId)));
    const updated = updatedRows[0];
    // Получаем автора
    const author = await db.select().from(user).where(eq(user.id, updated.authorId));
    // Получаем категорию
    const category = await db.select().from(exerciseCategory).where(eq(exerciseCategory.id, updated.categoryId));
    // Получаем теги через join-таблицу
    const tagLinks = await db.select().from(exerciseTagToExercise).where(eq(exerciseTagToExercise.exerciseId, updated.id));
    const tagIds = tagLinks.map(t => t.exerciseTagId);
    let tags: any[] = [];
    if (tagIds.length) {
      tags = await db.select().from(exerciseTag).where(inArray(exerciseTag.id, tagIds));
    }
    // Получаем mediaItems
    const mediaItems = await db.select().from(mediaItem).where(eq(mediaItem.exerciseId, updated.id));
    return NextResponse.json({
      ...updated,
      author: author[0] ? { id: author[0].id, name: author[0].name || 'Неизвестно' } : { id: null, name: 'Неизвестно' },
      category: category[0] ? { id: category[0].id, name: category[0].name } : null,
      tags,
      mediaItems,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при обновлении упражнения' }, { status: 500 });
  }
}

// Обработчик DELETE-запроса для удаления упражнения по ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    const clubId = session.user.clubId;
    const userId = session.user.id;
    const role = session.user.role;
    if (!params.id) {
      return NextResponse.json({ error: 'ID упражнения не указан' }, { status: 400 });
    }
    // Получаем упражнение и mediaItems
    const exerciseRows = await db.select().from(exercise).where(and(eq(exercise.id, params.id), eq(exercise.clubId, clubId)));
    if (!exerciseRows.length) {
      return NextResponse.json({ error: 'Упражнение не найдено' }, { status: 404 });
    }
    const ex = exerciseRows[0];
    if (ex.authorId !== userId && !['ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Нет прав на удаление' }, { status: 403 });
    }
    const mediaItems = await db.select().from(mediaItem).where(eq(mediaItem.exerciseId, ex.id));
    // Удаляем файлы из Supabase
    if (mediaItems.length > 0) {
      await deleteExerciseFiles(mediaItems.map(m => m.url));
    }
    // Транзакция удаления
    await db.transaction(async (tx) => {
      if (mediaItems.length > 0) {
        await tx.delete(mediaItem).where(inArray(mediaItem.id, mediaItems.map(m => m.id)));
      }
      await tx.delete(exerciseTagToExercise).where(eq(exerciseTagToExercise.exerciseId, params.id));
      await tx.delete(exercise).where(eq(exercise.id, params.id));
    });
    return NextResponse.json({ success: true, message: 'Упражнение и все связанные файлы успешно удалены' });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при удалении упражнения' }, { status: 500 });
  }
}