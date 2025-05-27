import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { transliterate } from '@/lib/transliterate';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string, playerId: string } }
) {
  try {
    // Проверяем авторизацию
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId, playerId } = params;

    // Проверяем существование игрока
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, teamId: true }
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (player.teamId !== teamId) {
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

    // Создаем безопасное имя файла
    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${transliterate(file.name)}`;
    const filePath = `clubs/${player.teamId}/players/${playerId}/avatars/${safeFileName}`;

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
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['*'],
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
          throw new Error('Failed to configure CORS');
        }
      } catch (error) {
        console.error('Error configuring CORS:', error);
      }
    }

    // Загружаем файл
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('club-media')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
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

    const publicUrl = publicUrlData.publicUrl;

    // Обновляем imageUrl игрока в базе данных
    await prisma.player.update({
      where: { id: playerId },
      data: { imageUrl: publicUrl }
    });

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