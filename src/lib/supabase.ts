import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase.types';

// Проверка обязательных переменных окружения
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('Ошибка: NEXT_PUBLIC_SUPABASE_URL не определен');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Ошибка: NEXT_PUBLIC_SUPABASE_ANON_KEY не определен');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Опции для клиента Supabase
const supabaseOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
};

// Публичный клиент для клиентской части
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Сервисный клиент для административных функций
// Поддержка обоих имен переменной для совместимости
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('Ошибка: SUPABASE_SERVICE_KEY или SUPABASE_SERVICE_ROLE_KEY не определен');
}

console.log('[DEBUG] Используется ключ сервиса Supabase, доступен:', !!supabaseServiceKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Функция для проверки бакетов и создания их при необходимости
export async function checkAndCreateBucket(bucketName: string): Promise<boolean> {
  try {
    // Получаем информацию о бакете
    const { data, error } = await supabaseAdmin.storage.getBucket(bucketName);
    
    // Если бакет не существует, создаем его
    if (error) {
      console.log(`Бакет ${bucketName} не найден, создаем...`);
      const { data: createData, error: createError } = await supabaseAdmin.storage
        .createBucket(bucketName, { public: true });
      
      if (createError) {
        console.error(`Ошибка при создании бакета ${bucketName}:`, createError);
        return false;
      }
      console.log(`Бакет ${bucketName} успешно создан`);
      
      // Настраиваем публичную политику доступа для бакета
      try {
        console.log(`Настройка публичных политик для бакета ${bucketName}...`);
        
        // Политика для чтения (разрешить всем)
        const { error: policyReadError } = await supabaseAdmin
          .storage
          .from(bucketName)
          .createSignedUrl('test.txt', 60);
          
        if (policyReadError && !policyReadError.message.includes('does not exist')) {
          console.error(`Ошибка при проверке прав чтения для ${bucketName}:`, policyReadError);
        } else {
          console.log(`Права чтения для ${bucketName} настроены или проверены`);
        }
        
        console.log(`Создание тестового файла в бакете ${bucketName} для проверки политик...`);
        // Создаем тестовый файл для проверки политик доступа
        const { error: uploadError } = await supabaseAdmin
          .storage
          .from(bucketName)
          .upload('test-policy.txt', 'Test file for policy check', {
            contentType: 'text/plain',
            upsert: true
          });
          
        if (uploadError) {
          console.error(`Ошибка при создании тестового файла в ${bucketName}:`, uploadError);
        } else {
          console.log(`Тестовый файл успешно создан в ${bucketName}`);
          
          // Получаем публичный URL для проверки
          const { data: urlData } = supabaseAdmin
            .storage
            .from(bucketName)
            .getPublicUrl('test-policy.txt');
            
          console.log(`Публичный URL для тестового файла: ${urlData?.publicUrl || 'не удалось получить'}`);
        }
      } catch (policyError) {
        console.error(`Ошибка при настройке политик для бакета ${bucketName}:`, policyError);
      }
    } else {
      console.log(`Бакет ${bucketName} существует`);
      
      // Проверяем наличие публичного доступа
      try {
        const { data: urlData } = supabaseAdmin
          .storage
          .from(bucketName)
          .getPublicUrl('test-policy.txt');
          
        console.log(`Публичный URL для тестового файла: ${urlData?.publicUrl || 'не удалось получить'}`);
        
        // Пробуем загрузить новый тестовый файл для проверки прав записи
        const testFilename = `test-policy-${Date.now()}.txt`;
        const { error: uploadError } = await supabaseAdmin
          .storage
          .from(bucketName)
          .upload(testFilename, 'Test file for policy check', {
            contentType: 'text/plain',
            upsert: true
          });
          
        if (uploadError) {
          console.error(`Ошибка при создании тестового файла в ${bucketName}:`, uploadError);
        } else {
          console.log(`Тестовый файл ${testFilename} успешно создан в ${bucketName}`);
          
          // Удаляем тестовый файл
          await supabaseAdmin.storage.from(bucketName).remove([testFilename]);
        }
      } catch (accessError) {
        console.error(`Ошибка при проверке доступа к бакету ${bucketName}:`, accessError);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Ошибка при проверке бакета ${bucketName}:`, error);
    return false;
  }
}

// Функция для обработки ошибок Supabase
export function handleSupabaseError(error: any): string {
  console.error('Supabase Error:', error);
  
  if (error?.message) {
    return `Ошибка: ${error.message}`;
  }
  
  return 'Произошла неизвестная ошибка';
} 