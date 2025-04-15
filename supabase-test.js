// Тестовый файл для проверки подключения к Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Проверка переменных окружения
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Отсутствуют необходимые переменные окружения для Supabase');
  process.exit(1);
}

// Создание Supabase клиента
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSupabaseConnection() {
  try {
    console.log('Проверка подключения к Supabase...');
    
    // Проверка соединения через простой запрос к таблице teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .limit(10);
    
    if (teamsError) {
      console.error('Ошибка при получении команд:', teamsError);
    } else {
      console.log(`Команд получено: ${teams.length}`);
      console.log('Пример данных:', teams);
    }
    
    // Получение списка таблиц
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_tables');
    
    if (tablesError) {
      console.error('Ошибка при получении списка таблиц:', tablesError);
      
      // Альтернативный вариант для получения данных
      console.log('Проверяем другие таблицы напрямую...');
      
      const tables = ['players', 'trainings', 'training_participants'];
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        console.log(`Таблица ${table}: ${error ? 'ошибка доступа' : 'доступна'}`);
      }
    } else {
      console.log('Таблицы в базе данных:', tablesData);
    }
    
  } catch (error) {
    console.error('Необработанная ошибка:', error);
  }
}

testSupabaseConnection(); 