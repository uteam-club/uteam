require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateExerciseFiles() {
  console.log('Начало миграции файлов упражнений...');
  
  try {
    // Получаем список файлов из папки player-photos
    const { data: playerPhotos, error: listError } = await supabase.storage
      .from('vista-media')
      .list('player-photos');
    
    if (listError) {
      throw new Error(`Ошибка получения списка файлов: ${listError.message}`);
    }
    
    // Определяем шаблоны для определения файлов упражнений
    const exercisePatterns = /(exercise|training|rondo|passing|finishing|warm_up|game|football|handball|attacking|ball_possession|juggling)/i;
    const videoExtPatterns = /\.(mp4|webm|ogg|mov)$/i;
    
    // Фильтруем файлы, которые следует переместить
    const filesToMove = playerPhotos.filter(file => 
      exercisePatterns.test(file.name) || videoExtPatterns.test(file.name)
    );
    
    console.log(`Найдено ${filesToMove.length} файлов упражнений для переноса`);
    
    // Перемещаем каждый файл
    for (const file of filesToMove) {
      console.log(`Перемещение файла: ${file.name}`);
      
      // 1. Скачиваем файл из player-photos
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('vista-media')
        .download(`player-photos/${file.name}`);
      
      if (downloadError) {
        console.error(`Ошибка скачивания файла ${file.name}: ${downloadError.message}`);
        continue;
      }
      
      // 2. Загружаем файл в exercises
      const { error: uploadError } = await supabase.storage
        .from('vista-media')
        .upload(`exercises/${file.name}`, fileData, {
          contentType: file.metadata.mimetype,
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error(`Ошибка загрузки файла ${file.name} в exercises: ${uploadError.message}`);
        continue;
      }
      
      // 3. Получаем публичный URL нового файла
      const { data: urlData } = supabase.storage
        .from('vista-media')
        .getPublicUrl(`exercises/${file.name}`);
      
      console.log(`Новый URL: ${urlData.publicUrl}`);
      
      // 4. Удаляем оригинальный файл
      const { error: deleteError } = await supabase.storage
        .from('vista-media')
        .remove([`player-photos/${file.name}`]);
      
      if (deleteError) {
        console.error(`Ошибка удаления оригинального файла ${file.name}: ${deleteError.message}`);
        continue;
      }
      
      console.log(`Файл ${file.name} успешно перемещен`);
    }
    
    console.log('Миграция файлов завершена');
    
  } catch (error) {
    console.error('Ошибка миграции файлов:', error);
  }
}

// Запускаем миграцию
migrateExerciseFiles(); 