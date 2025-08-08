import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const width = searchParams.get('width');
  const height = searchParams.get('height');
  const quality = searchParams.get('quality') || '75';

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }

  try {
    // Проверяем, что URL принадлежит Yandex Cloud
    if (!imageUrl.includes('storage.yandexcloud.net')) {
      return NextResponse.json({ error: 'Invalid image source' }, { status: 400 });
    }

    // Создаем оптимизированный URL для Next.js Image
    const optimizedUrl = new URL('/api/images/proxy', request.url);
    optimizedUrl.searchParams.set('url', imageUrl);
    if (width) optimizedUrl.searchParams.set('width', width);
    if (height) optimizedUrl.searchParams.set('height', height);
    optimizedUrl.searchParams.set('quality', quality);

    return NextResponse.json({ 
      optimizedUrl: optimizedUrl.toString(),
      originalUrl: imageUrl 
    });
  } catch (error) {
    console.error('Error optimizing image:', error);
    return NextResponse.json({ error: 'Failed to optimize image' }, { status: 500 });
  }
} 