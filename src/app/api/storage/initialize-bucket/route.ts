import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// API-маршрут для инициализации бакета
export async function POST(request: NextRequest) {
  try {
    // Для Яндекс Object Storage отдельная инициализация бакета не требуется
    return NextResponse.json({ success: true, message: 'Бакет для хранения файлов готов к использованию' });
  } catch (error) {
    console.error('Ошибка при инициализации бакета:', error);
    return NextResponse.json({ error: 'Ошибка при инициализации бакета' }, { status: 500 });
  }
} 