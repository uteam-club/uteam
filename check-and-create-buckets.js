const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Создаем клиент Supabase с сервисным ключом
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAndCreateBuckets() {
  try {
    console.log('Проверка подключения к Supabase...');
    
    // Получаем список всех бакетов
    console.log('Получение списка бакетов...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Ошибка при получении списка бакетов:', bucketsError);
      return;
    }
    
    console.log('Найдены бакеты:', buckets.map(b => b.name));
    
    // Проверяем и создаем бакет vista-media если он не существует
    await checkAndCreateBucket('vista-media', buckets);
    
    // Проверяем и создаем бакет exercises если он не существует
    await checkAndCreateBucket('exercises', buckets);
    
    // Проверяем и создаем папки в бакете vista-media
    if (buckets.some(b => b.name === 'vista-media')) {
      await checkAndCreateFolder('vista-media', 'player-documents');
      await checkAndCreateFolder('vista-media', 'player-photos');
    }

    console.log('Проверка завершена успешно');
  } catch (error) {
    console.error('Произошла ошибка:', error);
  }
}

async function checkAndCreateBucket(bucketName, existingBuckets) {
  // Проверяем существует ли бакет
  if (!existingBuckets.some(b => b.name === bucketName)) {
    console.log(`Бакет ${bucketName} не найден, создаем...`);
    
    try {
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: true
      });
      
      if (error) {
        console.error(`Ошибка при создании бакета ${bucketName}:`, error);
      } else {
        console.log(`Бакет ${bucketName} успешно создан`);
        
        // Установка публичной политики для чтения из бакета
        if (bucketName === 'exercises' || bucketName === 'vista-media') {
          console.log(`Настройка публичной политики для бакета ${bucketName}...`);
          
          // Добавляем политику доступа для анонимного чтения
          const { error: policyError } = await supabase.storage.from(bucketName)
            .createSignedUrl('test-policy', 10); // Просто для проверки работоспособности подписанных URL
          
          if (policyError) {
            // Если есть ошибка с подписанным URL, проверяем прямые права доступа
            console.log(`Настройка прямых прав доступа для бакета ${bucketName}...`);
            try {
              // Проверяем работоспособность через тестовый файл
              const testFileName = `test-policy-${Date.now()}.txt`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(testFileName, 'Test public access', {
                  contentType: 'text/plain',
                  upsert: true
                });
                
              if (uploadError) {
                console.error(`Ошибка при загрузке тестового файла в бакет ${bucketName}:`, uploadError);
              } else {
                console.log(`Тестовый файл для проверки политик загружен в бакет ${bucketName}`);
                
                // Получаем публичный URL
                const { data: urlData } = supabase.storage
                  .from(bucketName)
                  .getPublicUrl(testFileName);
                  
                if (urlData && urlData.publicUrl) {
                  console.log(`Публичный URL для тестового файла: ${urlData.publicUrl}`);
                  
                  // Удаляем тестовый файл
                  await supabase.storage
                    .from(bucketName)
                    .remove([testFileName]);
                    
                  console.log(`Тестовый файл политик удален из бакета ${bucketName}`);
                } else {
                  console.error(`Не удалось получить публичный URL для тестового файла в бакете ${bucketName}`);
                }
              }
            } catch (testError) {
              console.error(`Ошибка при проверке политик для бакета ${bucketName}:`, testError);
            }
          } else {
            console.log(`Политика публичного доступа для бакета ${bucketName} успешно настроена`);
          }
        }
      }
    } catch (error) {
      console.error(`Ошибка при создании бакета ${bucketName}:`, error);
    }
  } else {
    console.log(`Бакет ${bucketName} уже существует`);
    
    // Проверяем политики доступа для существующего бакета
    if (bucketName === 'exercises') {
      console.log(`Проверка политик доступа для существующего бакета ${bucketName}...`);
      
      try {
        // Загружаем тестовый файл для проверки доступа
        const testFileName = `test-access-${Date.now()}.txt`;
        const { data: testUpload, error: testUploadError } = await supabase.storage
          .from(bucketName)
          .upload(testFileName, 'Test access for existing bucket', {
            contentType: 'text/plain',
            upsert: true
          });
          
        if (testUploadError) {
          console.error(`Проблема с доступом к бакету ${bucketName}:`, testUploadError);
        } else {
          // Если файл загружен успешно, проверяем его публичный URL
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(testFileName);
            
          if (urlData && urlData.publicUrl) {
            console.log(`Бакет ${bucketName} настроен корректно, публичный URL: ${urlData.publicUrl}`);
            
            // Удаляем тестовый файл
            const { error: removeError } = await supabase.storage
              .from(bucketName)
              .remove([testFileName]);
              
            if (removeError) {
              console.error(`Ошибка при удалении тестового файла из бакета ${bucketName}:`, removeError);
            } else {
              console.log(`Тестовый файл успешно удален из бакета ${bucketName}`);
            }
          } else {
            console.error(`Не удалось получить публичный URL для бакета ${bucketName}`);
          }
        }
      } catch (error) {
        console.error(`Ошибка при проверке доступа к бакету ${bucketName}:`, error);
      }
    }
  }
}

async function checkAndCreateFolder(bucketName, folderName) {
  console.log(`Проверка папки ${folderName} в бакете ${bucketName}...`);
  
  try {
    // Проверяем существование папки
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folderName);
    
    if (error && error.message !== 'The resource was not found') {
      console.error(`Ошибка при проверке папки ${folderName}:`, error);
    }
    
    // Если данные пустые или произошла ошибка "not found", создаем папку
    if (!data || error) {
      console.log(`Создаем папку ${folderName}...`);
      
      // Создаем папку через загрузку пустого файла .gitkeep
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(`${folderName}/.gitkeep`, '', {
          contentType: 'text/plain',
          upsert: true
        });
        
      if (uploadError) {
        console.error(`Ошибка при создании папки ${folderName}:`, uploadError);
      } else {
        console.log(`Папка ${folderName} успешно создана`);
      }
    } else {
      console.log(`Папка ${folderName} уже существует`);
    }
    
    // Проверяем доступность через создание тестового файла
    const testFileName = `${folderName}/test-${Date.now()}.txt`;
    const { data: testData, error: testError } = await supabase.storage
      .from(bucketName)
      .upload(testFileName, 'Тестовый файл для проверки доступа', {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (testError) {
      console.error(`Не удалось создать тестовый файл в папке ${folderName}:`, testError);
    } else {
      console.log(`Тестовый файл успешно создан в папке ${folderName}`);
      
      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(testFileName);
      
      console.log(`Публичный URL: ${urlData.publicUrl}`);
      
      // Удаляем тестовый файл
      await supabase.storage
        .from(bucketName)
        .remove([testFileName]);
      
      console.log(`Тестовый файл удален`);
    }
  } catch (error) {
    console.error(`Ошибка при работе с папкой ${folderName}:`, error);
  }
}

// Запускаем проверку
checkAndCreateBuckets(); 