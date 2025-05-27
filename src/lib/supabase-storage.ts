import { supabase, getServiceSupabase } from './supabase';
import { uuidv4 } from './uuid-wrapper';
import path from 'path';
import { createSafeFileName } from './transliterate';

// Название бакета для хранения файлов
const STORAGE_BUCKET = 'club-media';

// Расширенная структура хранилища:
// /clubs/{clubId}/exercises/{exerciseId}/{fileUuid}-{safeFilename}
// Это обеспечивает четкую структуру для всех файлов и упрощает удаление

// Инициализация хранилища (создание бакета, если он не существует)
export const initializeStorage = async () => {
  try {
    // Используем сервисную роль для административных операций
    const adminSupabase = getServiceSupabase();
    
    // Проверяем существование бакета
    const { data: buckets, error } = await adminSupabase.storage.listBuckets();
    
    if (error) {
      throw error;
    }
    
    // Если бакет не существует, создаем его
    if (!buckets.find(bucket => bucket.name === STORAGE_BUCKET)) {
      const { error: createError } = await adminSupabase.storage.createBucket(STORAGE_BUCKET, {
        public: true, // Публичный бакет для доступа к файлам
        fileSizeLimit: 10485760, // 10 МБ
        allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
      });
      
      if (createError) {
        throw createError;
      }
      
      // Проверяем, что бакет создан и публичный
      const { data: newBucket, error: checkError } = await adminSupabase.storage.getBucket(STORAGE_BUCKET);
      
      if (checkError || !newBucket?.public) {
        console.error('Ошибка при проверке бакета:', checkError);
        throw new Error('Не удалось создать публичный бакет');
      }
      
      console.log(`Бакет '${STORAGE_BUCKET}' успешно создан в Supabase`);
    } else {
      // Обновляем существующий бакет, делаем его публичным и настраиваем CORS
      const { error: updateError } = await adminSupabase.storage.updateBucket(STORAGE_BUCKET, {
        public: true,
        allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
        fileSizeLimit: 10485760,
      });
      
      if (updateError) {
        console.error('Ошибка при обновлении бакета:', updateError);
      } else {
        // Проверяем, что бакет обновлен и публичный
        const { data: updatedBucket, error: checkError } = await adminSupabase.storage.getBucket(STORAGE_BUCKET);
        
        if (checkError || !updatedBucket?.public) {
          console.error('Ошибка при проверке бакета:', checkError);
          throw new Error('Не удалось сделать бакет публичным');
        }
        
        console.log(`Бакет '${STORAGE_BUCKET}' уже существует в Supabase и обновлен`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при инициализации хранилища Supabase:', error);
    return false;
  }
};

// Формирование базового пути для файлов клуба
export const getClubBasePath = (clubId: string) => {
  return `clubs/${clubId}`;
};

// Формирование пути для папки упражнений конкретного клуба
export const getClubExercisesPath = (clubId: string) => {
  return `${getClubBasePath(clubId)}/exercises`;
};

// Формирование пути для файлов конкретного упражнения
export const getExerciseFilesPath = (clubId: string, exerciseId: string) => {
  return `${getClubExercisesPath(clubId)}/${exerciseId}`;
};

// Сохранение файла упражнения в Supabase Storage
export const saveExerciseFile = async (
  clubId: string,
  exerciseId: string,
  file: File | Buffer,
  filename: string
) => {
  try {
    if (!clubId || !exerciseId) {
      throw new Error('Не указан ID клуба или упражнения для сохранения файла');
    }

    // Создаем путь для хранения файла - теперь с выделенной папкой для каждого упражнения
    const storagePath = getExerciseFilesPath(clubId, exerciseId);
    
    // Создаем безопасное имя файла с уникальным идентификатором
    const fileExt = path.extname(filename);
    const fileBase = path.basename(filename, fileExt);
    const uniqueId = uuidv4().slice(0, 8); // Короткий UUID для уникальности
    const safeFilename = createSafeFileName(`${uniqueId}-${fileBase}${fileExt}`);
    
    const filePath = `${storagePath}/${safeFilename}`;
    
    console.log(`Сохраняем файл по пути: ${filePath}`);
    
    // Загружаем файл в Supabase Storage
    let uploadData;
    
    if (Buffer.isBuffer(file)) {
      const fileExt = path.extname(safeFilename);
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          contentType: getContentType(fileExt),
          upsert: true
        });
      
      if (error) throw error;
      uploadData = data;
    } else {
      const fileExt = path.extname(safeFilename);
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          contentType: file.type || getContentType(fileExt),
          upsert: true
        });
      
      if (error) throw error;
      uploadData = data;
    }
    
    // Возвращаем полный путь к файлу (для сохранения в БД)
    return filePath;
  } catch (error) {
    console.error('Ошибка при сохранении файла упражнения в Supabase:', error);
    throw new Error('Не удалось сохранить файл упражнения');
  }
};

// Получение URL для доступа к файлу
export const getFileUrl = async (relativePath: string) => {
  if (!relativePath) return '';
  
  try {
    // Получаем публичный URL напрямую
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(relativePath);
    
    if (!data?.publicUrl) {
      console.error('Не удалось получить публичный URL для файла:', relativePath);
      return '';
    }

    // Заменяем домен Supabase на CDN URL
    const cdnUrl = data.publicUrl.replace(
      'eprnjqohtlxxqufvofbr.supabase.co',
      'eprnjqohtlxxqufvofbr.supabase.co/storage/v1/object/public'
    );

    // Добавляем логирование для отладки
    console.log('Generated public URL:', {
      relativePath,
      originalUrl: data.publicUrl,
      cdnUrl,
      bucket: STORAGE_BUCKET
    });
    
    return cdnUrl;
  } catch (error) {
    console.error('Ошибка при получении URL файла:', error);
    return '';
  }
};

// Удаление файла
export const deleteFile = async (relativePath: string) => {
  if (!relativePath) return false;
  
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([relativePath]);
    
    if (error) {
      console.error('Ошибка при удалении файла из Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при удалении файла:', error);
    return false;
  }
};

// Удаление всех файлов упражнения
export const deleteExerciseFiles = async (clubId: string, exerciseId: string) => {
  try {
    console.log(`Начинаем удаление файлов упражнения: clubId=${clubId}, exerciseId=${exerciseId}`);
    
    if (!clubId || !exerciseId) {
      console.error('Не указан ID клуба или упражнения для удаления файлов');
      return false;
    }
    
    // 1. Сначала получаем записи о медиафайлах из базы данных
    const { prisma } = await import('./prisma');
    
    const mediaItems = await prisma.mediaItem.findMany({
      where: {
        exerciseId: exerciseId,
        clubId: clubId
      }
    });
    
    console.log(`Найдено ${mediaItems.length} связанных медиафайлов в базе данных`);
    
    // 2. Удаляем медиафайлы из хранилища Supabase по их URL из базы данных
    if (mediaItems.length > 0) {
      for (const item of mediaItems) {
        if (item.url) {
          console.log(`Удаляем файл: ${item.url}`);
          await deleteFile(item.url);
        }
      }
    }
    
    // 3. Дополнительно пытаемся удалить всю папку упражнения целиком
    // Получаем путь к папке упражнения
    const exerciseFolderPath = getExerciseFilesPath(clubId, exerciseId);
    console.log(`Проверяем наличие папки упражнения: ${exerciseFolderPath}`);
    
    try {
      // Получаем список всех файлов в папке упражнения
      const { data: exerciseFiles, error: listError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(exerciseFolderPath);
      
      if (listError) {
        console.error('Ошибка при получении списка файлов упражнения:', listError);
      } else if (exerciseFiles && exerciseFiles.length > 0) {
        console.log(`В папке упражнения найдено ${exerciseFiles.length} файлов`);
        
        // Формируем полные пути к файлам для удаления
        const filePaths = exerciseFiles.map(file => `${exerciseFolderPath}/${file.name}`);
        
        if (filePaths.length > 0) {
          // Разбиваем на группы по 100 файлов из-за ограничений API
          for (let i = 0; i < filePaths.length; i += 100) {
            const batch = filePaths.slice(i, i + 100);
            console.log(`Удаление группы файлов ${i+1}-${i+batch.length} из ${filePaths.length}`);
            
            const { error: deleteError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .remove(batch);
            
            if (deleteError) {
              console.error('Ошибка при удалении группы файлов:', deleteError);
            }
          }
          
          console.log(`Все файлы упражнения успешно удалены из хранилища`);
        }
      } else {
        console.log('В папке упражнения файлы не найдены');
      }
    } catch (folderError) {
      console.error('Ошибка при удалении папки упражнения:', folderError);
    }
    
    // 4. Проверяем, есть ли "потерянные" файлы в других местах
    try {
      // Ищем в старой структуре: clubId/exercises/
      const oldStructurePath = getClubExercisesPath(clubId);
      const { data: oldFiles, error: oldListError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(oldStructurePath);
      
      if (!oldListError && oldFiles && oldFiles.length > 0) {
        // Ищем файлы, которые могут быть связаны с этим упражнением
        const exerciseIdParts = [
          exerciseId.slice(0, 6),
          exerciseId.slice(0, 8),
          exerciseId
        ];
        
        const relatedFiles = oldFiles.filter(file => 
          exerciseIdParts.some(part => file.name.includes(part))
        );
        
        if (relatedFiles.length > 0) {
          console.log(`Найдено ${relatedFiles.length} файлов в старой структуре`);
          
          const oldFilePaths = relatedFiles.map(file => `${oldStructurePath}/${file.name}`);
          
          const { error: deleteOldError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove(oldFilePaths);
          
          if (deleteOldError) {
            console.error('Ошибка при удалении файлов в старой структуре:', deleteOldError);
          } else {
            console.log('Файлы в старой структуре успешно удалены');
          }
        }
      }
    } catch (legacyError) {
      console.error('Ошибка при проверке файлов в старой структуре:', legacyError);
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при удалении файлов упражнения:', error);
    return false;
  }
};

// Миграция файлов из старой структуры в новую
export const migrateExerciseFiles = async (clubId: string, exerciseId: string) => {
  try {
    console.log(`Миграция файлов упражнения ${exerciseId} клуба ${clubId} в новую структуру`);
    
    // Получаем записи о медиафайлах из базы данных
    const { prisma } = await import('./prisma');
    
    const mediaItems = await prisma.mediaItem.findMany({
      where: {
        exerciseId: exerciseId,
        clubId: clubId
      }
    });
    
    if (mediaItems.length === 0) {
      console.log('Медиафайлы для миграции не найдены');
      return true;
    }
    
    console.log(`Найдено ${mediaItems.length} медиафайлов для миграции`);
    
    // Новый путь к папке упражнения
    const newExercisePath = getExerciseFilesPath(clubId, exerciseId);
    
    // Перебираем все файлы и мигрируем их в новую структуру
    for (const item of mediaItems) {
      if (!item.url) continue;
      
      try {
        // Проверяем, находится ли файл уже в правильной структуре
        if (item.url.startsWith(newExercisePath)) {
          console.log(`Файл ${item.url} уже в новой структуре`);
          continue;
        }
        
        console.log(`Миграция файла ${item.url}`);
        
        // Получаем имя файла из полного пути
        const fileName = item.url.split('/').pop() || '';
        
        // Создаем новый путь к файлу
        const newFilePath = `${newExercisePath}/${fileName}`;
        
        // Копируем файл в новую структуру
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(item.url);
        
        if (downloadError) {
          console.error(`Ошибка при скачивании файла ${item.url}:`, downloadError);
          continue;
        }
        
        // Загружаем файл в новую структуру
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(newFilePath, downloadData, {
            contentType: getContentType(path.extname(fileName)),
            upsert: true
          });
        
        if (uploadError) {
          console.error(`Ошибка при загрузке файла в новую структуру:`, uploadError);
          continue;
        }
        
        // Обновляем URL в базе данных
        await prisma.mediaItem.update({
          where: { id: item.id },
          data: { 
            url: newFilePath,
            publicUrl: await getFileUrl(newFilePath)
          }
        });
        
        console.log(`Файл успешно мигрирован в ${newFilePath}`);
        
        // Удаляем старый файл
        await deleteFile(item.url);
        
      } catch (itemError) {
        console.error(`Ошибка при миграции файла ${item.url}:`, itemError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при миграции файлов:', error);
    return false;
  }
};

// Миграция всех файлов в новую структуру
export const migrateAllFiles = async () => {
  try {
    console.log('Начало миграции всех файлов в новую структуру');
    
    const { prisma } = await import('./prisma');
    
    // Получаем все клубы
    const clubs = await prisma.club.findMany();
    console.log(`Найдено ${clubs.length} клубов для миграции`);
    
    for (const club of clubs) {
      console.log(`Миграция файлов клуба ${club.name} (${club.id})`);
      
      // Получаем все упражнения клуба
      const exercises = await prisma.exercise.findMany({
        where: { clubId: club.id }
      });
      
      console.log(`Найдено ${exercises.length} упражнений для клуба ${club.name}`);
      
      for (const exercise of exercises) {
        await migrateExerciseFiles(club.id, exercise.id);
      }
    }
    
    console.log('Миграция всех файлов успешно завершена');
    return true;
  } catch (error) {
    console.error('Ошибка при миграции всех файлов:', error);
    return false;
  }
};

// Определение MIME-типа по расширению файла
const getContentType = (fileExtension: string): string => {
  const ext = fileExtension.toLowerCase().replace('.', '');
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}; 