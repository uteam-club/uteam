import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { transliterate } from '@/lib/transliterate';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Импортируем URL из настроек
const supabaseUrl = 'https://eprnjqohtlxxqufvofbr.supabase.co';

// Кеш для статуса бакета
let bucketInitialized = false;

/**
 * POST /api/teams/[id]/players/[playerId]/upload-image
 * Загрузка изображения игрока через FormData - оптимизированная версия
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string, playerId: string } }
) {
  try {
    // Проверка авторизации
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('POST /player/upload-image: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Получаем параметры запроса
    const clubId = token.clubId as string;
    const teamId = params.id;
    const playerId = params.playerId;
    
    console.log(`POST /player/upload-image: Загрузка изображения для игрока ${playerId} из команды ${teamId} клуба ${clubId}`);
    
    // Проверяем существование игрока
    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
        teamId: teamId,
        team: {
          clubId: clubId
        }
      }
    });
    
    if (!player) {
      console.log(`POST /player/upload-image: Игрок ${playerId} не найден`);
      return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
    }
    
    // Получаем данные формы
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден в запросе' }, { status: 400 });
    }
    
    console.log(`POST /player/upload-image: Получен файл ${file.name} (${file.size} байт)`);
    
    // Проверяем размер файла
    if (file.size > 5 * 1024 * 1024) { // 5MB
      return NextResponse.json({ error: 'Файл слишком большой (макс. 5MB)' }, { status: 400 });
    }
    
    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Неверный формат файла. Разрешены только изображения' }, { status: 400 });
    }
    
    // Создаем путь к файлу
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '_');
    const safeFileName = `${timestamp}-${transliterate(originalName)}`;
    const filePath = `clubs/${clubId}/players/${playerId}/avatars/${safeFileName}`;
    
    console.log(`POST /player/upload-image: Загрузка файла по пути ${filePath}`);
    
    // Получаем сервисный клиент Supabase с уменьшенным таймаутом
    const supabase = getServiceSupabase({ 
      timeout: 5000, 
      retryCount: 1 
    });
    
    // Проверяем и создаем бакет только если еще не инициализирован
    try {
      if (!bucketInitialized) {
        // Инициализируем бакет синхронно перед загрузкой
        bucketInitialized = await initializeBucketAsync(supabase);
        console.log(`Бакет инициализирован: ${bucketInitialized}`);
      }
    } catch (error) {
      // Ошибка инициализации бакета не должна блокировать загрузку
      console.warn('Ошибка при проверке/создании бакета:', error);
    }
    
    // Получаем данные файла в виде ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    
    try {
      // Загружаем файл синхронно
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('club-media')
        .upload(filePath, fileBuffer, {
          upsert: true,
          contentType: file.type,
        });
      
      if (uploadError) {
        console.error('Ошибка загрузки файла в Supabase:', uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
      
      console.log('Файл успешно загружен:', uploadData);
      
      // Формируем публичный URL
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/club-media/${filePath}`;
      
      // Проверяем доступность файла перед обновлением профиля
      const fileCheckResponse = await fetch(publicUrl, { method: 'HEAD' });
      if (!fileCheckResponse.ok) {
        console.warn(`Файл загружен, но недоступен по URL ${publicUrl}`);
      }
      
      // Обновляем imageUrl игрока в базе данных
      await prisma.player.update({
        where: { id: playerId },
        data: { imageUrl: publicUrl }
      });
      
      console.log(`Обновлен imageUrl игрока ${playerId}:`, publicUrl);
      
      return NextResponse.json({
        success: true,
        imageUrl: publicUrl,
        path: uploadData.path,
        fileName: file.name
      });
    } catch (uploadError) {
      console.error('Ошибка при загрузке файла:', uploadError);
      return NextResponse.json(
        { error: uploadError instanceof Error ? uploadError.message : 'Ошибка загрузки файла' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Ошибка при загрузке изображения игрока:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Непредвиденная ошибка при загрузке файла' }, 
      { status: 500 }
    );
  }
}

/**
 * Асинхронная инициализация бакета без блокировки основного потока
 */
async function initializeBucketAsync(supabase: any): Promise<boolean> {
  try {
    // Проверяем существование бакета
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Ошибка при получении списка бакетов:', bucketsError);
      return false;
    }
    
    // Проверяем, существует ли бакет club-media
    const bucketExists = buckets.some((bucket: any) => bucket.name === 'club-media');
    
    if (!bucketExists) {
      // Создаем бакет
      const { error: createError } = await supabase.storage.createBucket('club-media', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
      
      if (createError) {
        console.error('Ошибка при создании бакета:', createError);
        return false;
      }
      
      console.log('Бакет club-media успешно создан');
    } else {
      // Обновляем настройки бакета
      try {
        await supabase.storage.updateBucket('club-media', {
          public: true
        });
        console.log('Настройки бакета обновлены');
      } catch (updateError) {
        console.warn('Ошибка при обновлении настроек бакета:', updateError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при инициализации бакета:', error);
    return false;
  }
}

/**
 * Асинхронная загрузка файла в хранилище Supabase
 */
async function uploadFileAsync(
  supabase: any, 
  bucket: string, 
  filePath: string, 
  fileBuffer: Uint8Array, 
  contentType: string,
  playerId: string
): Promise<any> {
  try {
    // Загружаем файл в хранилище
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        upsert: true,
        contentType,
      });
    
    if (uploadError) {
      console.error('Ошибка загрузки файла в Supabase:', uploadError);
      throw uploadError;
    }
    
    console.log('Файл успешно загружен:', uploadData);
    
    // Формируем публичный URL вручную
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
    
    return {
      success: true,
      path: uploadData.path,
      publicUrl: publicUrl
    };
  } catch (error) {
    console.error('Ошибка при асинхронной загрузке файла:', error);
    throw error;
  }
} 