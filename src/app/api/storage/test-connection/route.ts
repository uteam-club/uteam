import { NextRequest, NextResponse } from 'next/server';
import { testStorageConnection, ensureBucket } from '@/lib/supabase-test';

// Тестовый API-маршрут для проверки соединения с Supabase Storage
export async function GET(request: NextRequest) {
  try {
    console.log('Начало тестирования подключения к Supabase Storage');
    
    // Проверяем подключение
    const connectionResult = await testStorageConnection();
    
    if (!connectionResult.success) {
      console.error('Ошибка при подключении к Supabase Storage:', connectionResult.error);
      return NextResponse.json({ 
        status: 'error',
        message: 'Не удалось подключиться к Supabase Storage',
        error: connectionResult.error
      }, { status: 500 });
    }
    
    console.log('Успешное подключение к Supabase Storage');
    console.log('Найдены бакеты:', connectionResult.buckets);
    
    // Проверяем наличие и создаем бакет club-media
    const bucketResult = await ensureBucket('club-media');
    
    if (!bucketResult.success) {
      console.error('Ошибка при проверке/создании бакета:', bucketResult.error);
      return NextResponse.json({ 
        status: 'error',
        message: 'Не удалось создать или обновить бакет',
        connection: connectionResult,
        bucketError: bucketResult.error
      }, { status: 500 });
    }
    
    console.log('Результат операции с бакетом:', bucketResult.message);
    
    return NextResponse.json({
      status: 'success',
      connection: connectionResult,
      bucket: bucketResult
    });
  } catch (error) {
    console.error('Непредвиденная ошибка при тестировании Supabase Storage:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Непредвиденная ошибка при тестировании Supabase Storage',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
} 