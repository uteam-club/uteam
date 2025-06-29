import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/auth-options';
import { uploadFile, getFileUrl } from '@/lib/yandex-storage';
import { db } from '@/lib/db';
import { exercise, user, exerciseCategory, exerciseTag, mediaItem, exerciseTagToExercise } from '@/db/schema';
import { eq, and, inArray, desc, ilike } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Добавляю тип Token
type Token = { clubId: string; [key: string]: any };

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

// GET: получить все упражнения с фильтрацией и join по авторам, категориям, тегам, mediaItems
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(req, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  try {
    const clubId = token.clubId;
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search') || '';
    const authorId = url.searchParams.get('authorId') || undefined;
    const categoryId = url.searchParams.get('categoryId') || undefined;
    const tagsParam = url.searchParams.get('tags') || '';
    const tagIds = tagsParam ? tagsParam.split(',') : [];

    // Собираем условия фильтрации
    const whereArr = [eq(exercise.clubId, clubId)];
    if (searchQuery) {
      whereArr.push(ilike(exercise.title, `%${searchQuery}%`));
    }
    if (authorId) {
      whereArr.push(eq(exercise.authorId, authorId));
    }
    if (categoryId) {
      whereArr.push(eq(exercise.categoryId, categoryId));
    }

    // Получаем упражнения
    const exercises = await db.select().from(exercise)
      .where(and(...whereArr))
      .orderBy(desc(exercise.createdAt));

    // Получаем все связи упражнение-тег для этих упражнений
    const exerciseIds = exercises.map(e => e.id);
    const tagLinks = await db.select().from(exerciseTagToExercise)
      .where(inArray(exerciseTagToExercise.exerciseId, exerciseIds));
    const tagIdsAll = tagLinks.map(l => l.exerciseTagId);
    const tags = tagIdsAll.length
      ? await db.select().from(exerciseTag).where(inArray(exerciseTag.id, tagIdsAll))
      : [];

    // Собираем теги по упражнениям
    const tagsByExercise: Record<string, any[]> = {};
    tagLinks.forEach(link => {
      if (!tagsByExercise[link.exerciseId]) tagsByExercise[link.exerciseId] = [];
      const tag = tags.find(t => t.id === link.exerciseTagId);
      if (tag) tagsByExercise[link.exerciseId].push(tag);
    });

    // Фильтрация по тегам (если указаны)
    let filteredExercises = exercises;
    if (tagIds.length > 0) {
      filteredExercises = exercises.filter(e => {
        const exTagIds = (tagsByExercise[e.id] || []).map(t => t.id);
        return tagIds.every(tid => exTagIds.includes(tid));
      });
    }

    // Получаем mediaItems для упражнений
    const mediaItems = await db.select().from(mediaItem).where(inArray(mediaItem.exerciseId, exerciseIds));
    const mediaByExercise: Record<string, any[]> = {};
    mediaItems.forEach(m => {
      if (!m.exerciseId) return;
      if (!mediaByExercise[m.exerciseId]) mediaByExercise[m.exerciseId] = [];
      mediaByExercise[m.exerciseId].push(m);
    });

    // Получаем все категории для упражнений
    const categoryIds = Array.from(new Set(exercises.map(e => e.categoryId)));
    const categories = await db.select().from(exerciseCategory).where(inArray(exerciseCategory.id, categoryIds));
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, { id: c.id, name: c.name }]));

    // Собираем финальный результат с join
    const result = filteredExercises.map(e => ({
      ...e,
      tags: tagsByExercise[e.id] || [],
      mediaItems: mediaByExercise[e.id] || [],
      category: categoryMap[e.categoryId] || { id: '', name: 'Без категории' },
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при получении упражнений:', error);
    return NextResponse.json({ error: 'Ошибка при получении упражнений' }, { status: 500 });
  }
}

// POST: создать упражнение с тегами и mediaItem
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  console.log('[DEBUG] POST /api/exercises called');
  try {
    const session = await getServerSession(authOptions);
    console.log('[DEBUG] session:', session);
    if (!session?.user) {
      console.log('[DEBUG] Нет сессии пользователя');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    const formData = await req.formData();
    console.log('[DEBUG] formData:', Array.from(formData.entries()));
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    const lengthStr = formData.get('length') as string | null;
    const widthStr = formData.get('width') as string | null;
    const tagIdsArray = formData.getAll('tags') as string[];
    const file = formData.get('file') as File | null;
    console.log('[DEBUG] title:', title);
    console.log('[DEBUG] description:', description);
    console.log('[DEBUG] categoryId:', categoryId);
    console.log('[DEBUG] tagIdsArray:', tagIdsArray);
    console.log('[DEBUG] file:', file);
    if (!title || !description || !categoryId) {
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }
    // Проверяем существование категории
    const [category] = await db.select().from(exerciseCategory).where(and(eq(exerciseCategory.id, categoryId), eq(exerciseCategory.clubId, session.user.clubId)));
    if (!category) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 });
    }
    // Проверяем существование тегов
    let tags: any[] = [];
    if (tagIdsArray.length > 0) {
      tags = await db.select().from(exerciseTag).where(and(inArray(exerciseTag.id, tagIdsArray), eq(exerciseTag.clubId, session.user.clubId)));
      if (tags.length !== tagIdsArray.length) {
        return NextResponse.json({ error: 'Некоторые теги не найдены' }, { status: 400 });
      }
    }
    const length = lengthStr ? parseFloat(lengthStr) : null;
    const width = widthStr ? parseFloat(widthStr) : null;
    // Создаём упражнение
    const [createdExercise] = await db.insert(exercise).values({
      id: uuidv4(),
      title,
      description,
      categoryId,
      width,
      length,
      authorId: session.user.id,
      clubId: session.user.clubId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    // Добавляем связи с тегами
    if (tagIdsArray.length > 0) {
      await db.insert(exerciseTagToExercise).values(tagIdsArray.map(tagId => ({
        exerciseId: createdExercise.id,
        exerciseTagId: tagId,
      })));
    }
    // Если есть файл — сохраняем mediaItem
    let createdMediaItem = null;
    if (file) {
      let mediaType = 'OTHER';
      if (file.type.startsWith('image/')) mediaType = 'IMAGE';
      else if (file.type.startsWith('video/')) mediaType = 'VIDEO';
      else if (file.type.includes('pdf') || file.type.includes('document')) mediaType = 'DOCUMENT';
      const storagePath = `clubs/${session.user.clubId}/exercises/${createdExercise.id}/${file.name}`;
      // Преобразуем File в Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await uploadFile(buffer, storagePath, file.type);
      const publicUrl = getFileUrl(storagePath);
      [createdMediaItem] = await db.insert(mediaItem).values({
        id: uuidv4(),
        name: file.name,
        type: mediaType,
        url: storagePath,
        publicUrl,
        size: file.size,
        clubId: session.user.clubId,
        exerciseId: createdExercise.id,
        uploadedById: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
    }
    // Возвращаем упражнение с тегами и mediaItem и категорией
    const exerciseTags = tagIdsArray.length > 0 ? tags : [];
    return NextResponse.json({
      ...createdExercise,
      tags: exerciseTags,
      mediaItems: createdMediaItem ? [createdMediaItem] : [],
      category: { id: category.id, name: category.name },
    });
  } catch (error: any) {
    console.error('[ERROR] Ошибка при создании упражнения:', error, error?.stack);
    return NextResponse.json({ error: 'Ошибка при создании упражнения', details: error?.message, stack: error?.stack }, { status: 500 });
  }
}

// Функция для чтения токена из заголовка Authorization
async function getTokenFromRequest(request: NextRequest) {
  // ... existing code ...
}

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
} 