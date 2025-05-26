// Сначала импортируем только dotenv и настраиваем переменные окружения
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { StorageClient } from '@supabase/storage-js';
import { PrismaClient } from '@/generated/prisma';
import { createAdminClient, initializeStorageBucket, listFilesInBucket } from './supabase-admin';

// Загружаем переменные окружения из файла .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Для операций на стороне сервера

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('Supabase URL, Anon Key, or Service Role Key is not defined in .env');
  process.exit(1);
}

const prisma = new PrismaClient();
const storage = new StorageClient(supabaseUrl, {
    apikey: supabaseServiceRoleKey, // Используем service role key для серверных операций
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
});

const BUCKET_NAME = 'media'; // Замените на имя вашего бакета

// Формирование пути для файлов конкретного упражнения
const getExerciseFilesPath = (clubId: string, exerciseId: string) => {
  return `clubs/${clubId}/exercises/${exerciseId}`;
};

/**
 * Скрипт для миграции всех существующих файлов в новую структуру хранилища
 * Запуск: npx tsx scripts/migrate-media-files.ts
 */
async function migrateMediaFiles() {
  try {
    console.log('Начало миграции медиафайлов...');

    // Получаем административный клиент Supabase
    const supabase = createAdminClient();
    if (!supabase) {
      console.error('Не удалось создать административный клиент Supabase.');
      return;
    }

    // Инициализируем хранилище
    console.log('Инициализация хранилища...');
    await initializeStorageBucket(BUCKET_NAME, true);
    
    // Считаем количество файлов в базе данных
    const totalMediaItems = await prisma.mediaItem.count();
    console.log(`Всего медиафайлов в базе данных: ${totalMediaItems}`);
    let processedCount = 0;

    // Получаем все медиафайлы из базы данных
    const mediaItems = await prisma.mediaItem.findMany({
        where: {
            exerciseId: {
                not: null
            }
        }
    });
    console.log(`Найдено медиафайлов для миграции: ${mediaItems.length}`);

    for (const mediaItem of mediaItems) {
      processedCount++;
      console.log(`Обработка файла ${processedCount} из ${mediaItems.length}: ${mediaItem.name} (ID: ${mediaItem.id})`);

      if (!mediaItem.exerciseId) {
        console.log(`Пропуск файла ${mediaItem.name}: отсутствует exerciseId.`);
        continue;
      }

      const exercise = await prisma.exercise.findUnique({
        where: { id: mediaItem.exerciseId },
        include: { club: true },
      });

      if (!exercise) {
        console.error(`Упражнение с ID ${mediaItem.exerciseId} не найдено для медиафайла ${mediaItem.name}.`);
        continue;
      }

      const clubSubdomain = exercise.club.subdomain;
      const newFilePath = `${clubSubdomain}/exercises/${mediaItem.exerciseId}/${mediaItem.name}`;
      console.log(`Новый путь для файла ${mediaItem.name}: ${newFilePath}`);

      try {
        // Проверяем, существует ли файл в старом месте
        // Для этого нам нужно знать старый путь или предположить его структуру
        // В данном случае, предполагаем, что mediaItem.url - это старый путь к файлу в бакете
        console.log(`Проверка старого файла по пути: ${mediaItem.url}`);
        
        // Скачиваем файл
        const { data: fileData, error: downloadError } = await storage
          .from(BUCKET_NAME)
          .download(mediaItem.url);

        if (downloadError) {
          console.error(`Ошибка скачивания файла ${mediaItem.url}:`, downloadError.message);
          // Попробуем проверить, существует ли файл по новому пути (возможно, миграция уже была)
          
          let newFilePublicUrl: string | null = null;
          try {
            // Check if file exists at newFilePath by attempting to list it
            const newFileDir = path.dirname(newFilePath);
            const newFileName = path.basename(newFilePath);

            const { data: listResult, error: listError } = await storage
              .from(BUCKET_NAME)
              .list(newFileDir, { search: newFileName, limit: 1 });

            if (listError) {
              console.warn(`Предупреждение при проверке файла ${newFilePath} через list(): ${listError.message}. Предполагаем, что файл не существует.`);
            } else if (listResult && listResult.length > 0) {
              // File exists, get its public URL
              const publicUrlData = storage.from(BUCKET_NAME).getPublicUrl(newFilePath);
              newFilePublicUrl = publicUrlData.data.publicUrl;
            }
          } catch (e: any) {
            console.warn(`Исключение при проверке файла ${newFilePath} через list(): ${e.message}. Предполагаем, что файл не существует.`);
          }

          if (!newFilePublicUrl) { // If newFilePublicUrl is still null, file was not found at new path
             console.log(`Файл ${newFilePath} (по новому пути) также не найден. Пропускаем файл ${mediaItem.name}.`);
          } else { // File found at new path
            console.log(`Файл ${newFilePath} уже существует по новому пути. Обновляем запись в БД для ${mediaItem.name}.`);
            await prisma.mediaItem.update({
              where: { id: mediaItem.id },
              data: { publicUrl: newFilePublicUrl, url: newFilePath },
            });
            console.log(`Запись в БД для ${mediaItem.name} обновлена новым URL: ${newFilePublicUrl}`);
          }
          continue;
        }

        if (!fileData) {
          console.error(`Скачанные данные для файла ${mediaItem.url} пусты.`);
          continue;
        }
        console.log(`Файл ${mediaItem.url} успешно скачан.`);

        // Загружаем файл в новое место
        const { data: uploadData, error: uploadError } = await storage
          .from(BUCKET_NAME)
          .upload(newFilePath, fileData, {
            contentType: mediaItem.type === 'IMAGE' ? 'image/jpeg' : // Пример, уточните типы
                         mediaItem.type === 'VIDEO' ? 'video/mp4' : 'application/octet-stream',
            upsert: true, // Перезаписываем, если файл существует
          });

        if (uploadError) {
          console.error(`Ошибка загрузки файла ${newFilePath}:`, uploadError.message);
          continue;
        }
        console.log(`Файл ${newFilePath} успешно загружен.`);

        // Получаем публичный URL для нового файла
        const { data: urlData } = storage
          .from(BUCKET_NAME)
          .getPublicUrl(newFilePath);

        if (!urlData || !urlData.publicUrl) {
            console.error(`Не удалось получить публичный URL для ${newFilePath}`);
            continue;
        }
        console.log(`Новый публичный URL для ${mediaItem.name}: ${urlData.publicUrl}`);


        // Обновляем запись в базе данных с новым URL
        await prisma.mediaItem.update({
          where: { id: mediaItem.id },
          data: { publicUrl: urlData.publicUrl, url: newFilePath }, // Сохраняем и новый относительный путь
        });
        console.log(`Запись в БД для ${mediaItem.name} обновлена новым URL: ${urlData.publicUrl}`);

        // Удаляем старый файл, если он не совпадает с новым путем
        // И если mediaItem.url не был пустым и не является новым путем
        if (mediaItem.url && mediaItem.url !== newFilePath) {
            console.log(`Попытка удаления старого файла: ${mediaItem.url}`);
            const { error: deleteError } = await storage
              .from(BUCKET_NAME)
              .remove([mediaItem.url]);

            if (deleteError) {
              console.error(`Ошибка удаления старого файла ${mediaItem.url}:`, deleteError.message);
            } else {
              console.log(`Старый файл ${mediaItem.url} успешно удален.`);
            }
        }


      } catch (error: any) {
        console.error(`Произошла ошибка при обработке файла ${mediaItem.name}:`, error.message);
      }
    }

    console.log('Миграция медиафайлов завершена.');
  } catch (error: any) {
    console.error('Критическая ошибка в процессе миграции:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('Соединение с базой данных закрыто.');
  }
}

migrateMediaFiles();

export {}; // Добавляем, чтобы сделать файл модулем и избежать ошибки "Cannot compile namespaces when the '--isolatedModules' flag is provided" 