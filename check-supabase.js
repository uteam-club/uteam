const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function main() {
  try {
    console.log('Проверка подключения к Supabase...');
    
    // Получаем настройки из переменных окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    console.log('URL:', supabaseUrl ? 'Установлен' : 'Отсутствует');
    console.log('ANON_KEY:', supabaseAnonKey ? 'Установлен' : 'Отсутствует');
    console.log('SERVICE_KEY:', supabaseServiceKey ? 'Установлен' : 'Отсутствует');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Отсутствуют необходимые переменные окружения для Supabase');
    }
    
    // Создаем клиент Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Тестовый запрос для проверки подключения
    console.log('Выполнение тестового запроса...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      throw error;
    }
    
    console.log('Успешное подключение к Supabase!');
    console.log('Данные сессии:', data);
    
    // Создаем административный клиент, если есть сервисный ключ
    if (supabaseServiceKey) {
      console.log('Проверка подключения с сервисным ключом...');
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      // Тестовый запрос для проверки административного доступа
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.getSession();
      
      if (adminError) {
        console.error('Ошибка при подключении с сервисным ключом:', adminError);
      } else {
        console.log('Успешное подключение с сервисным ключом!');
      }
    }
  } catch (error) {
    console.error('Ошибка при подключении к Supabase:', error);
    process.exit(1);
  }
}

main().catch(console.error); 