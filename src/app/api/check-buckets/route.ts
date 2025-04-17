import { NextResponse } from 'next/server';
import { checkAndCreateBucket } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Начинаем проверку и настройку бакетов Supabase...');
    
    // Получаем список всех бакетов для диагностики
    const { data: buckets, error: bucketsError } = await supabaseAdmin
      .storage
      .listBuckets();
      
    if (bucketsError) {
      console.error('Ошибка при получении списка бакетов:', bucketsError);
      return NextResponse.json({
        error: 'Ошибка при получении списка бакетов',
        details: bucketsError.message
      }, { status: 500 });
    }
    
    console.log('Доступные бакеты:', buckets.map(b => b.name));
    
    // Проверяем и создаем бакет для exercises если нужно
    const exercisesBucketResult = await checkAndCreateBucket('exercises');
    
    if (!exercisesBucketResult) {
      return NextResponse.json({
        error: 'Не удалось создать или проверить бакет exercises'
      }, { status: 500 });
    }
    
    // Настраиваем политики доступа для бакета exercises
    try {
      console.log('Проверка политик для бакета exercises...');
      
      // Создаем тестовый файл
      const testFilename = `test-policy-${Date.now()}.txt`;
      const { error: uploadError } = await supabaseAdmin
        .storage
        .from('exercises')
        .upload(testFilename, 'Test content for checking upload permission', {
          contentType: 'text/plain',
          upsert: true
        });
        
      if (uploadError) {
        console.error('Ошибка при создании тестового файла в бакете exercises:', uploadError);
      } else {
        console.log(`Тестовый файл ${testFilename} успешно создан в бакете exercises`);
        
        // Получаем публичный URL
        const { data: urlData } = supabaseAdmin
          .storage
          .from('exercises')
          .getPublicUrl(testFilename);
          
        console.log(`Публичный URL для тестового файла: ${urlData?.publicUrl || 'не удалось получить'}`);
        
        // Удаляем тестовый файл
        await supabaseAdmin.storage.from('exercises').remove([testFilename]);
        console.log(`Тестовый файл ${testFilename} успешно удален`);
      }
    } catch (policyError) {
      console.error('Ошибка при настройке или проверке политик для бакета exercises:', policyError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Проверка и настройка бакетов выполнена',
      buckets: buckets.map(b => b.name)
    });
  } catch (error: any) {
    console.error('Ошибка при проверке бакетов:', error);
    return NextResponse.json({
      error: 'Ошибка при проверке бакетов',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 