import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// API-маршрут для инициализации бакета
export async function POST(request: NextRequest) {
  try {
    console.log('Начало инициализации бакета в Supabase Storage');
    
    const adminSupabase = getServiceSupabase();
    
    // Проверяем существование бакета
    const { data: buckets, error: bucketsError } = await adminSupabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Ошибка при получении списка бакетов:', bucketsError);
      return NextResponse.json({ 
        success: false, 
        error: bucketsError.message 
      }, { status: 500 });
    }
    
    console.log('Найдены бакеты:', buckets.map(b => b.name).join(', '));
    
    // Проверяем, существует ли бакет club-media
    const bucketName = 'club-media';
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`Бакет ${bucketName} уже существует`);
      
      // Обновляем настройки бакета, делаем его публичным
      const { error: updateError } = await adminSupabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
      
      if (updateError) {
        console.error('Ошибка при обновлении настроек бакета:', updateError);
        return NextResponse.json({ 
          success: false, 
          error: updateError.message 
        }, { status: 500 });
      }
      
      console.log(`Настройки бакета ${bucketName} успешно обновлены`);
      
      return NextResponse.json({
        success: true,
        message: `Бакет ${bucketName} успешно обновлен`,
        updated: true,
        created: false
      });
    }
    
    // Создаем бакет, если он не существует
    const { error: createError } = await adminSupabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });
    
    if (createError) {
      console.error('Ошибка при создании бакета:', createError);
      return NextResponse.json({ 
        success: false, 
        error: createError.message 
      }, { status: 500 });
    }
    
    console.log(`Бакет ${bucketName} успешно создан`);
    
    return NextResponse.json({
      success: true,
      message: `Бакет ${bucketName} успешно создан`,
      updated: false,
      created: true
    });
  } catch (error) {
    console.error('Непредвиденная ошибка при инициализации бакета:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
    }, { status: 500 });
  }
} 