// Скрипт для проверки и создания бакетов Supabase при запуске приложения
console.log('Запуск скрипта проверки бакетов Supabase...');

const { createClient } = require('@supabase/supabase-js');

// Функция для создания клиента Supabase
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 
                             process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Ошибка: Не заданы переменные окружения NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_KEY');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Функция проверки бакетов с таймаутом
async function checkBucketsWithTimeout() {
  return new Promise(async (resolve) => {
    // Устанавливаем таймаут в 3 секунды, чтобы не блокировать запуск
    const timeout = setTimeout(() => {
      console.warn('Таймаут при проверке бакетов Supabase. Продолжаем запуск приложения.');
      resolve({
        success: false,
        message: 'Таймаут при проверке бакетов',
        error: 'Timeout exceeded'
      });
    }, 3000);
    
    try {
      const supabase = createSupabaseClient();
      
      if (!supabase) {
        clearTimeout(timeout);
        console.log('Проверка бакетов пропущена из-за отсутствия учетных данных Supabase');
        resolve({
          success: false,
          message: 'Отсутствуют учетные данные Supabase',
        });
        return;
      }
      
      // Проверка существующих бакетов
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        clearTimeout(timeout);
        console.error('Ошибка при получении списка бакетов:', error);
        resolve({
          success: false,
          message: 'Ошибка при получении списка бакетов',
          error
        });
        return;
      }
      
      const requiredBuckets = ['vista-media', 'exercises'];
      const existingBuckets = buckets.map(b => b.name);
      const missingBuckets = requiredBuckets.filter(name => !existingBuckets.includes(name));
      
      // Создаем отсутствующие бакеты
      for (const bucketName of missingBuckets) {
        console.log(`Создание бакета ${bucketName}...`);
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true
        });
        
        if (createError) {
          console.error(`Ошибка при создании бакета ${bucketName}:`, createError);
        } else {
          console.log(`Бакет ${bucketName} успешно создан`);
        }
      }
      
      clearTimeout(timeout);
      resolve({
        success: true,
        message: 'Проверка и настройка бакетов выполнена',
        buckets: [...existingBuckets, ...missingBuckets]
      });
    } catch (e) {
      clearTimeout(timeout);
      console.error('Ошибка при проверке бакетов:', e);
      resolve({
        success: false,
        message: 'Ошибка при проверке бакетов',
        error: e
      });
    }
  });
}

// Главная функция с обработкой ошибок
async function main() {
  try {
    const result = await checkBucketsWithTimeout();
    console.log('Результат проверки бакетов:', result);
    
    if (result.success) {
      console.log('Проверка бакетов Supabase успешно завершена');
    } else {
      console.warn(`Проверка бакетов завершилась с ошибкой: ${result.message}`);
      console.log('Продолжаем запуск приложения...');
    }
  } catch (error) {
    console.error('Критическая ошибка при проверке бакетов:', error);
    console.log('Запуск приложения продолжится несмотря на ошибку');
  }
  
  // Всегда завершаем скрипт успешно, чтобы не блокировать запуск приложения
  process.exit(0);
}

// Запуск скрипта
main(); 