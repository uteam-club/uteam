import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { transliterate } from '@/lib/transliterate';
import { db } from '@/lib/db';
import { player } from '@/db/schema';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string, playerId: string } }
) {
  // ГЛОБАЛЬНЫЙ ЛОГ ВХОДА
  console.log('[UPLOAD-IMAGE ENTRY]', {
    method: 'POST',
    params,
    time: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries()),
    url: request.url
  });
  try {
    // Проверяем авторизацию
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId, playerId } = params;

    // Проверяем существование игрока
    const playerRows = await db.select().from(player).where(eq(player.id, playerId)).limit(1);
    const foundPlayer = playerRows[0];
    if (!foundPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    if (foundPlayer.teamId !== teamId) {
      return NextResponse.json({ error: 'Player does not belong to this team' }, { status: 403 });
    }

    // Получаем файл из FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Оптимизация изображения на сервере (сжатие и конвертация в JPEG или PNG)
    let uploadBuffer: Buffer;
    let uploadMime = 'image/jpeg';
    let fileExt = 'jpg';
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    console.log('[IMAGE UPLOAD] Получен файл:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    try {
      const sharpInstance = sharp(inputBuffer).rotate();
      const metadata = await sharpInstance.metadata();
      console.log('[IMAGE UPLOAD] sharp metadata:', metadata);
      // Уменьшаем размер до 800px по большей стороне
      sharpInstance.resize({
        width: metadata.width && metadata.width > metadata.height ? 800 : undefined,
        height: metadata.height && metadata.height >= metadata.width ? 800 : undefined,
        fit: 'inside',
        withoutEnlargement: true
      });
      // Гарантируем сохранение PNG с прозрачностью
      const isPng = file.type === 'image/png' || (metadata.format && metadata.format.toLowerCase() === 'png') || file.name.toLowerCase().endsWith('.png');
      if (isPng) {
        if (metadata.hasAlpha !== true) {
          console.error('[IMAGE UPLOAD] PNG не содержит альфа-канал!');
          throw new Error('Загружаемый PNG не содержит прозрачности (альфа-канала)');
        }
        uploadBuffer = await sharpInstance.png({ force: true }).toBuffer();
        uploadMime = 'image/png';
        fileExt = 'png';
      } else {
        uploadBuffer = await sharpInstance.jpeg({ quality: 80 }).toBuffer();
        uploadMime = 'image/jpeg';
        fileExt = 'jpg';
      }
      console.log('[IMAGE UPLOAD] Сжатие через sharp успешно, размер:', uploadBuffer.length, 'MIME:', uploadMime, 'EXT:', fileExt);
    } catch (err) {
      console.error('[IMAGE UPLOAD] Ошибка оптимизации изображения через sharp:', err);
      uploadBuffer = inputBuffer; // fallback: оригинал
    }

    // Получаем clubId через команду
    const teamRows = await db.select().from(require('@/db/schema').team).where(eq(require('@/db/schema').team.id, teamId)).limit(1);
    const foundTeam = teamRows[0];
    if (!foundTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    const clubId = foundTeam.clubId;

    // Создаем безопасное имя файла
    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${transliterate(file.name.replace(/\.[^.]+$/, ''))}.${fileExt}`;
    const filePath = `clubs/${clubId}/teams/${teamId}/players/${playerId}/avatars/${safeFileName}`;

    console.log('Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      filePath
    });

    // Инициализируем бакет если нужно
    const supabase = getServiceSupabase();
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'club-media');

    if (!bucketExists) {
      console.log('Creating club-media bucket...');
      const { error: createError } = await supabase.storage.createBucket('club-media', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/*', 'video/*', 'application/pdf']
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return NextResponse.json({ error: 'Failed to initialize storage' }, { status: 500 });
      }

      // Настраиваем CORS
      const corsConfig = {
        origin: '*',
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag'],
        maxAgeSeconds: 3600
      };

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket/club-media/cors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify(corsConfig)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error configuring CORS:', errorText);
          throw new Error(`Failed to configure CORS: ${errorText}`);
        }

        console.log('CORS configured successfully');
      } catch (error) {
        console.error('Error configuring CORS:', error);
        return NextResponse.json({ error: 'Failed to configure CORS' }, { status: 500 });
      }
    }

    // Загружаем файл
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('club-media')
      .upload(filePath, uploadBuffer, {
        upsert: true,
        contentType: uploadMime,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    console.log('File uploaded successfully:', uploadData);

    // Получаем публичный URL
    const { data: publicUrlData } = supabase.storage
      .from('club-media')
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('Failed to get public URL');
      return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 });
    }

    // Проверяем валидность URL
    try {
      new URL(publicUrlData.publicUrl);
    } catch (e) {
      console.error('Invalid public URL generated:', publicUrlData.publicUrl);
      return NextResponse.json({ error: 'Invalid public URL generated' }, { status: 500 });
    }

    const publicUrl = publicUrlData.publicUrl;

    // Обновляем imageUrl игрока в базе данных
    await db.update(player).set({ imageUrl: publicUrl }).where(eq(player.id, playerId));

    console.log(`Updated player ${playerId} imageUrl:`, publicUrl);

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      path: filePath,
      fileName: file.name
    });
  } catch (error) {
    console.error('Error in upload handler:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 