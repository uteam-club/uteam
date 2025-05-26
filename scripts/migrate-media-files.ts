// Сначала импортируем только dotenv и настраиваем переменные окружения
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Загружаем переменные окружения из файла .env
const dotenvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(dotenvPath)) {
  config({ path: dotenvPath });
  console.log('Переменные окружения загружены из файла .env');
} else {
  console.warn('Файл .env не найден!');
}

// Проверяем, что переменные окружения загружены
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Ошибка: не найдены переменные окружения Supabase.');
  console.error('Убедитесь, что файл .env содержит:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// После настройки переменных окружения импортируем остальные модули
import { PrismaClient } from '@prisma/client';
import { createAdminClient, initializeStorageBucket, listFilesInBucket } from './supabase-admin';

// Константы
const STORAGE_BUCKET = 'club-media';
const prisma = new PrismaClient();

// Формирование пути для файлов конкретного упражнения
const getExerciseFilesPath = (clubId: string, exerciseId: string) => {
  return `clubs/${clubId}/exercises/${exerciseId}`;
};

/**
 * Скрипт для миграции всех существующих файлов в новую структуру хранилища
 * Запуск: npx tsx scripts/migrate-media-files.ts
 */
async function migrateMediaFiles() {
  console.log('====================================================');
  console.log('Запуск миграции файлов в новую структуру хранилища');
  console.log('====================================================');
  
  try {
    // Инициализируем хранилище
    console.log('Инициализация хранилища...');
    await initializeStorageBucket(STORAGE_BUCKET, true);
    
    // Считаем количество файлов в базе данных
    const mediaCount = await prisma.mediaItem.count();
    console.log(`Всего файлов в базе данных: ${mediaCount}`);
    
    // Получаем статистику по упражнениям
    const exercisesCount = await prisma.exercise.count();
    console.log(`Всего упражнений в базе данных: ${exercisesCount}`);
    
    // Запускаем миграцию всех файлов
    console.log('====================================================');
    console.log('Запуск процесса миграции...');
    console.log('====================================================');
    
    const supabase = createAdminClient();
    
    // Получаем список всех клубов
    const clubs = await prisma.club.findMany();
    console.log(`Найдено ${clubs.length} клубов для миграции`);
    
    // Обрабатываем каждый клуб
    for (const club of clubs) {
      console.log(`\nМиграция файлов клуба "${club.name}" (${club.id})`);
      
      // Получаем все упражнения этого клуба
      const exercises = await prisma.exercise.findMany({
        where: { clubId: club.id },
        include: { mediaItems: true }
      });
      
      console.log(`Найдено ${exercises.length} упражнений для клуба "${club.name}"`);
      
      // Обрабатываем каждое упражнение
      for (const exercise of exercises) {
        console.log(`\n-- Обработка упражнения "${exercise.title}" (${exercise.id})`);
        
        if (exercise.mediaItems.length === 0) {
          console.log(`   У упражнения нет медиафайлов в базе данных`);
          continue;
        }
        
        // Новый путь для файлов этого упражнения
        const newPath = getExerciseFilesPath(club.id, exercise.id);
        
        // Перебираем все медиафайлы упражнения
        for (const mediaItem of exercise.mediaItems) {
          if (!mediaItem.url) {
            console.log(`   Медиафайл ${mediaItem.id} не имеет URL в базе данных`);
            continue;
          }
          
          // Проверяем, находится ли файл уже в правильной структуре
          if (mediaItem.url.startsWith(newPath)) {
            console.log(`   Файл ${mediaItem.name} уже в правильной структуре`);
            continue;
          }
          
          console.log(`   Миграция файла ${mediaItem.name} (${mediaItem.id})`);
          
          try {
            // Извлекаем имя файла из URL
            const fileName = mediaItem.url.split('/').pop() || '';
            
            // Формируем новый путь
            const newFilePath = `${newPath}/${fileName}`;
            
            // Скачиваем файл
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .download(mediaItem.url);
            
            if (downloadError) {
              console.error(`   Ошибка при скачивании файла ${mediaItem.url}:`, downloadError);
              continue;
            }
            
            // Загружаем файл в новое место
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .upload(newFilePath, fileData, {
                contentType: mediaItem.type === 'IMAGE' ? 'image/jpeg' : 
                             mediaItem.type === 'VIDEO' ? 'video/mp4' : 
                             'application/octet-stream',
                upsert: true
              });
            
            if (uploadError) {
              console.error(`   Ошибка при загрузке файла в новую структуру:`, uploadError);
              continue;
            }
            
            // Получаем публичный URL для нового файла
            const { data: urlData } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(newFilePath);
            
            // Обновляем запись в базе данных
            await prisma.mediaItem.update({
              where: { id: mediaItem.id },
              data: { 
                url: newFilePath,
                publicUrl: urlData.publicUrl
              }
            });
            
            console.log(`   Файл успешно мигрирован в ${newFilePath}`);
            
            // Удаляем старый файл
            const { error: deleteError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .remove([mediaItem.url]);
            
            if (deleteError) {
              console.error(`   Ошибка при удалении старого файла:`, deleteError);
            } else {
              console.log(`   Старый файл успешно удален`);
            }
            
          } catch (fileError) {
            console.error(`   Ошибка при миграции файла ${mediaItem.name}:`, fileError);
          }
        }
      }
    }
    
    console.log('====================================================');
    console.log('Миграция файлов успешно завершена');
    console.log('====================================================');
    return true;
    
  } catch (error) {
    console.error('Ошибка при миграции файлов:', error);
    return false;
  } finally {
    // Закрываем соединение с базой данных
    await prisma.$disconnect();
  }
}

// Запускаем миграцию
migrateMediaFiles(); 