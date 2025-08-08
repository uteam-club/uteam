import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const width = searchParams.get('width');
  const height = searchParams.get('height');
  const quality = parseInt(searchParams.get('quality') || '75');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }

  try {
    // Проверяем, что URL принадлежит Yandex Cloud
    if (!imageUrl.includes('storage.yandexcloud.net')) {
      return NextResponse.json({ error: 'Invalid image source' }, { status: 400 });
    }

    // Загружаем изображение
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    
    // Обрабатываем изображение с помощью Sharp
    let sharpInstance = sharp(Buffer.from(imageBuffer));

    // Применяем ресайз если указаны размеры
    if (width || height) {
      const resizeOptions: any = {};
      if (width) resizeOptions.width = parseInt(width);
      if (height) resizeOptions.height = parseInt(height);
      resizeOptions.fit = 'inside'; // Сохраняем пропорции
      resizeOptions.withoutEnlargement = true; // Не увеличиваем изображение
      
      sharpInstance = sharpInstance.resize(resizeOptions);
    }

    // Оптимизируем качество и формат
    const optimizedBuffer = await sharpInstance
      .webp({ quality: Math.min(quality, 85) }) // Используем WebP для лучшего сжатия
      .toBuffer();

    // Возвращаем оптимизированное изображение
    return new NextResponse(optimizedBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable', // Кешируем на год
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
} 