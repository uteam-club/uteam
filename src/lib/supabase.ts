import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Публичный клиент для клиентской части
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Сервисный клиент для административных функций
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey); 