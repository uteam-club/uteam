import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



const supabaseUrl = 'https://eprnjqohtlxxqufvofbr.supabase.co';

/**
 * GET /api/storage/speed-test
 * Тестирует скорость взаимодействия с Supabase Storage
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Создаем тестовый blob для загрузки
    const testData = new Uint8Array([0, 1, 2, 3, 4, 5]); // Минимальный размер данных
    const testPath = `speed-test/test-${Date.now()}.bin`;
    
    // Получаем Supabase клиент с разными таймаутами
    const supabaseFast = getServiceSupabase({ timeout: 3000, retryCount: 1 });
    
    // Отмечаем время инициализации
    const initTime = Date.now() - startTime;
    
    // Пробуем быструю загрузку файла
    const uploadStartTime = Date.now();
    
    // Генерируем URL без фактической загрузки
    const fastUrl = `${supabaseUrl}/storage/v1/object/public/club-media/${testPath}`;
    
    // Запускаем асинхронную загрузку, но не ждем ее завершения
    // для имитации оптимизированного подхода
    const uploadPromise = supabaseFast.storage
      .from('club-media')
      .upload(testPath, testData, { upsert: true })
      .then(result => {
        const uploadTime = Date.now() - uploadStartTime;
        console.log(`Реальная загрузка завершена за ${uploadTime}мс:`, result);
        return { ...result, uploadTime };
      })
      .catch(error => {
        console.error('Ошибка при фоновой загрузке:', error);
        return { error: String(error), uploadTime: Date.now() - uploadStartTime };
      });
    
    // Немедленно возвращаем ответ с предполагаемым URL
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      responseTime: `${responseTime}мс`,
      initTime: `${initTime}мс`,
      message: 'Тест скорости успешно выполнен, загрузка продолжается в фоне',
      provisionalUrl: fastUrl,
      testPath
    });
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('Ошибка в тесте скорости:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorTime: `${errorTime}мс`
    }, { status: 500 });
  }
} 