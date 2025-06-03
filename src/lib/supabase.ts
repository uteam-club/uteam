import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL или анонимный ключ не заданы в .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Проверка подключения к Supabase
export const checkSupabaseConnection = async () => {
  try {
    // Проверяем подключение, используя listBuckets вместо запроса к несуществующей таблице
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Ошибка подключения к Supabase:', error);
    return false;
  }
};

// Создаем клиент Supabase с сервисной ролью (только для серверной стороны!)
export const getServiceSupabase = (options?: { timeout?: number, retryCount?: number }) => {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY не задан в .env');
  }
  console.log('Использую сервисный ключ для Supabase', {
    url: supabaseUrl,
    keyLength: supabaseServiceKey.length,
    timeout: options?.timeout || 'default',
    retries: options?.retryCount || 'default'
  });
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      // Настраиваем таймауты для более быстрого взаимодействия
      fetch: (url, init) => {
        const controller = new AbortController();
        const timeoutValue = options?.timeout || 10000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutValue);
        
        return fetch(url, {
          ...init,
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
      }
    }
  });
};

// Функция для установки контекста клуба (для использования с RLS)
export const setClubContext = async (clubId: string) => {
  try {
    const { error } = await supabase.rpc('set_current_club_id', { club_id: clubId });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error setting club context:', error);
    return false;
  }
};

// Функция для загрузки файла в хранилище Supabase по структуре:
// clubs/{clubId}/teams/{teamId}/players/{playerId}/[avatars|documents]/filename
export async function uploadPlayerFile(
  file: File,
  clubId: string,
  teamId: string,
  playerId: string,
  fileType: 'avatar' | 'document',
  documentType?: string // дополнительная метка для типа документа
) {
  try {
    // Проверяем входные параметры
    if (!file) {
      throw new Error('Не указан файл для загрузки');
    }
    
    if (!clubId || !playerId) {
      throw new Error(`Неверные параметры для загрузки: clubId=${clubId}, playerId=${playerId}`);
    }
    
    // Проверяем соединение с Supabase перед загрузкой
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      throw new Error('Нет соединения с сервером хранения файлов');
    }
    
    console.log(`Загрузка файла игрока: ${file.name}, тип: ${fileType}, размер: ${file.size} байт`);
    
    // Создаем уникальное имя файла с временной меткой
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${file.name.replace(/\s+/g, '_')}`;
    
    // Формируем путь к файлу в хранилище по новой структуре
    // clubs/{clubId}/teams/{teamId}/players/{playerId}/{folderType}/{fileName}
    const folderType = fileType === 'avatar' ? 'avatars' : 'documents';
    const filePath = `clubs/${clubId}/teams/${teamId}/players/${playerId}/${folderType}/${fileName}`;
    
    console.log(`Загрузка файла по пути: ${filePath}`);

    // Инициализируем бакет при необходимости
    try {
      await initializeStorageBucket();
    } catch (err) {
      console.warn('Ошибка при инициализации бакета:', err);
      // Продолжаем выполнение, так как бакет может уже существовать
    }

    // Загружаем файл в хранилище
    const { data, error } = await supabase.storage
      .from('club-media')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
        // Добавляем метаданные для упрощения поиска в будущем
        cacheControl: '3600',
        metadata: {
          fileType,
          documentType,
          fileName: file.name,
          playerId,
          teamId,
          clubId
        }
      });

    if (error) {
      console.error('Ошибка загрузки в Supabase:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('Ошибка загрузки: не получены данные о файле');
    }
    
    console.log('Файл успешно загружен:', data);
    
    // Получаем публичный URL для доступа к файлу
    const { data: publicUrlData } = supabase.storage
      .from('club-media')
      .getPublicUrl(filePath);
      
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Не удалось получить публичный URL для файла');
    }
    
    console.log('Получен публичный URL:', publicUrlData.publicUrl);
      
    return {
      path: data?.path,
      url: data?.path,
      publicUrl: publicUrlData.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error uploading file to Supabase:', error);
    throw error;
  }
}

// Функция для инициализации бакета
async function initializeStorageBucket() {
  try {
    // Используем сервисный ключ для административных операций
    const adminSupabase = getServiceSupabase();
    
    // Проверяем существование бакета
    const { data: buckets, error } = await adminSupabase.storage.listBuckets();
    
    if (error) {
      console.error('Ошибка при получении списка бакетов:', error);
      throw error;
    }
    
    // Если бакет не существует, создаем его
    if (!buckets.find(bucket => bucket.name === 'club-media')) {
      const { error: createError } = await adminSupabase.storage.createBucket('club-media', {
        public: true,
        fileSizeLimit: 10485760, // 10 МБ
      });
      
      if (createError) {
        console.error('Ошибка при создании бакета:', createError);
        throw createError;
      }
      
      console.log('Бакет club-media успешно создан в Supabase');
    } else {
      console.log('Бакет club-media уже существует');
      
      // Обновляем настройки бакета, делаем его публичным
      try {
        await adminSupabase.storage.updateBucket('club-media', {
          public: true
        });
        console.log('Настройки бакета обновлены');
      } catch (updateError) {
        console.error('Ошибка при обновлении настроек бакета:', updateError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при инициализации бакета:', error);
    throw error;
  }
}

// Функция для удаления файла из хранилища
export async function deletePlayerFile(filePath: string) {
  try {
    const { error } = await supabase.storage
      .from('club-media')
      .remove([filePath]);
      
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting file from Supabase:', error);
    throw error;
  }
}

// Функция для получения данных с учетом мультитенантности
export const getDataForClub = async (
  table: string,
  clubId: string,
  options: {
    columns?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  } = {}
) => {
  try {
    // Устанавливаем контекст клуба для RLS
    await setClubContext(clubId);
    
    // Формируем запрос
    let query = supabase
      .from(table)
      .select(options.columns || '*');
    
    // Добавляем фильтры, включая clubId для мультитенантности
    const filters = { clubId, ...options.filters };
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
    
    // Добавляем сортировку
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending ?? true 
      });
    }
    
    // Добавляем лимит
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error(`Error getting data from ${table}:`, error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Клиент Supabase для серверных компонентов
export const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Клиент Supabase для клиентских компонентов
export const createBrowserSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
}; 