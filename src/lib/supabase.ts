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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Опции для клиента Supabase
const supabaseOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
};

// Публичный клиент для клиентской части
export const supabase: SupabaseClient = createClient(
  supabaseUrl, 
  supabaseAnonKey, 
  supabaseOptions
);

// Сервисный клиент для административных функций с повышенными правами
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl, 
  supabaseServiceKey, 
  {
    ...supabaseOptions,
    auth: {
      ...supabaseOptions.auth,
      // Используем сервисную роль
      autoRefreshToken: false,
    }
  }
);

// Функция для обработки ошибок Supabase
export function handleSupabaseError(error: any): string {
  console.error('Supabase Error:', error);
  
  if (error?.message) {
    return `Ошибка: ${error.message}`;
  }
  
  return 'Произошла неизвестная ошибка';
} 