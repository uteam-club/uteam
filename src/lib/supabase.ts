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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
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
    } else {
      console.log(`Бакет ${bucketName} существует`);
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