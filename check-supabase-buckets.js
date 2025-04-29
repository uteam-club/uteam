const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function main() {
  try {
    console.log('Проверка бакетов в Supabase...');
    
    // Получаем настройки из переменных окружения
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Отсутствуют необходимые переменные окружения для Supabase');
    }
    
    // Создаем административный клиент с сервисным ключом
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Получаем список всех бакетов
    console.log('Получение списка бакетов...');
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    
    if (error) {
      throw error;
    }
    
    console.log('Список бакетов:');
    console.log(data);
    
    // Проверяем наличие определенных бакетов
    const requiredBuckets = ['vista-media'];
    const missingBuckets = requiredBuckets.filter(
      bucket => !data.find(b => b.name === bucket)
    );
    
    if (missingBuckets.length > 0) {
      console.log('Отсутствующие бакеты:', missingBuckets);
      
      // Создаем отсутствующие бакеты
      for (const bucketName of missingBuckets) {
        console.log(`Создание бакета ${bucketName}...`);
        const { data: createData, error: createError } = await supabaseAdmin.storage
          .createBucket(bucketName, { public: true });
        
        if (createError) {
          console.error(`Ошибка при создании бакета ${bucketName}:`, createError);
        } else {
          console.log(`Бакет ${bucketName} успешно создан`);
        }
      }
    } else {
      console.log('Все необходимые бакеты существуют');
    }
    
    // Проверяем содержимое бакета vista-media
    if (data.find(b => b.name === 'vista-media')) {
      console.log('Проверка содержимого бакета vista-media...');
      const { data: listData, error: listError } = await supabaseAdmin.storage
        .from('vista-media')
        .list();
      
      if (listError) {
        console.error('Ошибка при получении содержимого бакета vista-media:', listError);
      } else {
        console.log('Содержимое бакета vista-media:');
        console.log(listData);
      }
    }
  } catch (error) {
    console.error('Ошибка при работе с бакетами Supabase:', error);
    process.exit(1);
  }
}

main().catch(console.error); 