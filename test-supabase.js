const { createClient } = require('@supabase/supabase-js');

// Клиент для старой базы данных
const OLD_SUPABASE_URL = 'https://gtmpyyttkzjoiufiizwl.supabase.co';
const OLD_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bXB5eXR0a3pqb2l1ZmlpendsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDI2NTc1MCwiZXhwIjoyMDU5ODQxNzUwfQ.8TovFEqNKe5kwNbGC9Hwn3Zt8BDQvRJzfHvspoPj_qE';
const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY);

async function testConnection() {
  console.log('Проверка подключения к старой базе данных Supabase...');
  try {
    // Пытаемся получить список таблиц
    const { data, error } = await oldSupabase
      .from('players')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Ошибка при запросе к базе данных:', error.message);
    } else {
      console.log('Успешное подключение!');
      console.log('Получены данные:', data);
    }
  } catch (error) {
    console.error('Критическая ошибка при подключении:', error.message);
  }
}

testConnection(); 