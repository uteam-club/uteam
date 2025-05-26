import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { saveExerciseFile, getFileUrl } from '@/lib/supabase-storage';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Типы медиафайлов из схемы Prisma
const MediaType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  OTHER: 'OTHER'
} as const;

export async function POST(request: NextRequest) {
  try {
    // Проверка аутентификации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Получаем ID клуба из сессии
    const clubId = session.user.clubId;
    if (!clubId) {
      return NextResponse.json({ error: 'Клуб не определен' }, { status: 400 });
    }

    // Получаем multipart/form-data
    const formData = await request.formData();
    
    // Получаем exerciseId и файл
    const exerciseId = formData.get('exerciseId') as string;
    const file = formData.get('file') as File;
    
    if (!exerciseId) {
      return NextResponse.json({ error: 'ID упражнения обязателен' }, { status: 400 });
    }
    
    if (!file) {
      return NextResponse.json({ error: 'Файл обязателен' }, { status: 400 });
    }

    // Проверяем, что упражнение существует и принадлежит клубу
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        clubId: clubId,
      },
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Упражнение не найдено' }, { status: 404 });
    }

    // Сохраняем файл в Supabase Storage
    const storagePath = await saveExerciseFile(clubId, exerciseId, file, file.name);

    // Определяем тип медиа файла
    let mediaType;
    if (file.type.startsWith('image/')) {
      mediaType = MediaType.IMAGE;
    } else if (file.type.startsWith('video/')) {
      mediaType = MediaType.VIDEO;
    } else if (file.type.includes('pdf') || file.type.includes('document')) {
      mediaType = MediaType.DOCUMENT;
    } else {
      mediaType = MediaType.OTHER;
    }

    // Получаем публичный URL для файла
    const publicUrl = getFileUrl(storagePath);

    // Записываем информацию о файле в БД
    const mediaItem = await prisma.mediaItem.create({
      data: {
        name: file.name,
        type: mediaType,
        url: storagePath, // Сохраняем путь в хранилище
        publicUrl: publicUrl, // Сохраняем публичный URL
        size: file.size,
        clubId: clubId,
        uploadedById: session.user.id,
        exerciseId: exerciseId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      mediaId: mediaItem.id,
      url: publicUrl
    });
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    return NextResponse.json({ error: 'Ошибка при загрузке файла' }, { status: 500 });
  }
}

// Устанавливаем максимальный размер файла (10 МБ)
export const runtime = 'nodejs';
// Здесь можно добавить другие опции, если необходимо 