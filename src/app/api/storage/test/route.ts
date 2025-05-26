import { NextRequest, NextResponse } from 'next/server';
import { supabase, getServiceSupabase } from '@/lib/supabase';

// Тестовый API-маршрут для проверки соединения с Supabase Storage
export async function GET(request: NextRequest) {
  try {
    // Проверка соединения с Supabase Storage
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Ошибка при получении списка бакетов:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Проверка наличия бакета club-media
    const bucketNames = buckets.map(bucket => bucket.name);
    const hasBucket = bucketNames.includes('club-media');
    
    // Попытка создать бакет, если его нет
    let bucketCreated = false;
    if (!hasBucket) {
      try {
        const adminSupabase = getServiceSupabase();
        const { data, error: createError } = await adminSupabase.storage.createBucket('club-media', {
          public: true,
          fileSizeLimit: 10485760, // 10 МБ
        });
        
        if (createError) {
          console.error('Ошибка при создании бакета:', createError);
          return NextResponse.json({ 
            status: 'error',
            connected: true,
            buckets: bucketNames,
            hasBucket: false,
            bucketCreated: false,
            error: createError.message
          });
        }
        
        bucketCreated = true;
        console.log('Бакет club-media успешно создан в Supabase');
      } catch (createErr) {
        console.error('Ошибка при создании бакета:', createErr);
        return NextResponse.json({ 
          status: 'error',
          connected: true,
          buckets: bucketNames,
          hasBucket: false,
          bucketCreated: false,
          error: createErr instanceof Error ? createErr.message : 'Неизвестная ошибка'
        });
      }
    }
    
    return NextResponse.json({
      status: 'success',
      connected: true,
      buckets: bucketNames,
      hasBucket: hasBucket || bucketCreated,
      bucketCreated
    });
  } catch (error) {
    console.error('Ошибка при проверке соединения с Supabase Storage:', error);
    return NextResponse.json({ 
      status: 'error',
      connected: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
} 