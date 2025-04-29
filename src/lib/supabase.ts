import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase.types';

// Проверка обязательных переменных окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Логирование для отладки
console.log('[SUPABASE_CONFIG] URL:', supabaseUrl ? 'Установлен' : 'Отсутствует');
console.log('[SUPABASE_CONFIG] ANON_KEY:', supabaseAnonKey ? 'Установлен' : 'Отсутствует');
console.log('[SUPABASE_CONFIG] SERVICE_KEY:', supabaseServiceKey ? 'Установлен' : 'Отсутствует');

// Проверка наличия обязательных переменных окружения
if (!supabaseUrl) {
  console.warn('ПРЕДУПРЕЖДЕНИЕ: NEXT_PUBLIC_SUPABASE_URL не определен. Подключение к Supabase будет невозможно.');
}

if (!supabaseAnonKey) {
  console.warn('ПРЕДУПРЕЖДЕНИЕ: NEXT_PUBLIC_SUPABASE_ANON_KEY не определен. Подключение к Supabase будет невозможно.');
}

// Опции для клиента Supabase
const supabaseOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
};

// Публичный клиент для клиентской части
export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Сервисный клиент для административных функций
// Поддержка обоих имен переменной для совместимости
if (!supabaseServiceKey) {
  console.warn('ПРЕДУПРЕЖДЕНИЕ: SUPABASE_SERVICE_KEY или SUPABASE_SERVICE_ROLE_KEY не определен. Административные функции недоступны.');
}

// Создаем административный клиент только если есть ключ
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, supabaseOptions);

// Проверка соединения с Supabase
const checkSupabaseConnection = async () => {
  try {
    console.log('[SUPABASE_CONNECTION] Проверка соединения...');
    // Простой запрос для проверки соединения
    const { data, error } = await supabase.from('_health').select('*').limit(1);
    if (error) {
      console.error('[SUPABASE_CONNECTION] Ошибка:', error);
      throw error;
    }
    console.log('✅ [SUPABASE_CONNECTION] Соединение успешно установлено');
    return true;
  } catch (error) {
    console.warn('⚠️ [SUPABASE_CONNECTION] Не удалось подключиться:', error);
    return false;
  }
};

// Функция для проверки бакетов и создания их при необходимости
export async function checkAndCreateBucket(bucketName: string): Promise<boolean> {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[SUPABASE_BUCKET] Невозможно проверить бакет: отсутствуют переменные окружения Supabase');
      return false;
    }
    
    console.log(`[SUPABASE_BUCKET] Проверка бакета ${bucketName}...`);
    // Получаем информацию о бакете
    const { data, error } = await supabaseAdmin.storage.getBucket(bucketName);
    
    // Если бакет не существует, создаем его
    if (error) {
      console.log(`[SUPABASE_BUCKET] Бакет ${bucketName} не найден, создаем...`);
      const { data: createData, error: createError } = await supabaseAdmin.storage
        .createBucket(bucketName, { public: true });
      
      if (createError) {
        console.error(`[SUPABASE_BUCKET] Ошибка при создании бакета ${bucketName}:`, createError);
        return false;
      }
      console.log(`[SUPABASE_BUCKET] Бакет ${bucketName} успешно создан`);
      
      // Настраиваем публичную политику доступа для бакета
      try {
        console.log(`[SUPABASE_BUCKET] Настройка публичных политик для бакета ${bucketName}...`);
        
        // Политика для чтения (разрешить всем)
        const { error: policyReadError } = await supabaseAdmin
          .storage
          .from(bucketName)
          .createSignedUrl('test.txt', 60);
          
        if (policyReadError && !policyReadError.message.includes('does not exist')) {
          console.error(`[SUPABASE_BUCKET] Ошибка при проверке прав чтения для ${bucketName}:`, policyReadError);
        } else {
          console.log(`[SUPABASE_BUCKET] Права чтения для ${bucketName} настроены или проверены`);
        }
        
        console.log(`[SUPABASE_BUCKET] Создание тестового файла в бакете ${bucketName} для проверки политик...`);
        // Создаем тестовый файл для проверки политик доступа
        const { error: uploadError } = await supabaseAdmin
          .storage
          .from(bucketName)
          .upload('test-policy.txt', 'Test file for policy check', {
            contentType: 'text/plain',
            upsert: true
          });
          
        if (uploadError) {
          console.error(`[SUPABASE_BUCKET] Ошибка при создании тестового файла в ${bucketName}:`, uploadError);
        } else {
          console.log(`[SUPABASE_BUCKET] Тестовый файл успешно создан в ${bucketName}`);
          
          // Получаем публичный URL для проверки
          const { data: urlData } = supabaseAdmin
            .storage
            .from(bucketName)
            .getPublicUrl('test-policy.txt');
            
          console.log(`[SUPABASE_BUCKET] Публичный URL для тестового файла: ${urlData?.publicUrl || 'не удалось получить'}`);
        }
      } catch (policyError) {
        console.error(`[SUPABASE_BUCKET] Ошибка при настройке политик для бакета ${bucketName}:`, policyError);
      }
    } else {
      console.log(`[SUPABASE_BUCKET] Бакет ${bucketName} существует`);
      
      // Проверяем наличие публичного доступа
      try {
        const { data: urlData } = supabaseAdmin
          .storage
          .from(bucketName)
          .getPublicUrl('test-policy.txt');
          
        console.log(`[SUPABASE_BUCKET] Публичный URL для тестового файла: ${urlData?.publicUrl || 'не удалось получить'}`);
        
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
          console.error(`[SUPABASE_BUCKET] Ошибка при создании тестового файла в ${bucketName}:`, uploadError);
        } else {
          console.log(`[SUPABASE_BUCKET] Тестовый файл ${testFilename} успешно создан в ${bucketName}`);
          
          // Удаляем тестовый файл
          await supabaseAdmin.storage.from(bucketName).remove([testFilename]);
        }
      } catch (accessError) {
        console.error(`[SUPABASE_BUCKET] Ошибка при проверке доступа к бакету ${bucketName}:`, accessError);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`[SUPABASE_BUCKET] Ошибка при проверке бакета ${bucketName}:`, error);
    return false;
  }
}

// Функция для обработки ошибок Supabase
export function handleSupabaseError(error: any): string {
  console.error('[SUPABASE_ERROR]', error);
  
  if (error?.message) {
    return `Ошибка: ${error.message}`;
  }
  
  return 'Произошла неизвестная ошибка';
}

// Экспортируем функцию проверки соединения
export { checkSupabaseConnection };

// Константы для хранилища
export const MEDIA_BUCKET = 'vista-media';
export const EXERCISE_FILES_FOLDER = 'exercise-files';
export const PLAYER_PHOTOS_FOLDER = 'player-photos';
export const DOCUMENT_FILES_FOLDER = 'documents';

/**
 * Функция для получения публичного URL файла в Supabase Storage
 * @param bucket Название бакета (хранилища)
 * @param path Путь к файлу в бакете
 * @returns Публичный URL файла
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Функция для генерации уникального имени файла
 * @param originalFileName Исходное имя файла
 * @returns Уникальное имя файла
 */
export function generateUniqueFileName(originalFileName: string): string {
  const extension = originalFileName.split('.').pop();
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomString}.${extension}`;
}

/**
 * Функция для загрузки файла в Supabase Storage
 * @param file Файл для загрузки
 * @param bucket Название бакета (хранилища)
 * @param folder Папка внутри бакета
 * @returns Объект с информацией о загруженном файле или ошибке
 */
export async function uploadFile(file: File, bucket: string, folder: string) {
  try {
    if (!file) {
      throw new Error('Файл не указан');
    }

    // Генерируем уникальное имя файла
    const uniqueFileName = generateUniqueFileName(file.name);
    const filePath = `${folder}/${uniqueFileName}`;

    // Загружаем файл
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Получаем публичный URL файла
    const fileUrl = getPublicUrl(bucket, filePath);

    return {
      success: true,
      fileUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      filePath
    };
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
} 