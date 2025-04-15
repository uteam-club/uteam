const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Создаем клиент Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkStorage() {
  try {
    // Получаем список всех бакетов
    console.log('Получение списка бакетов...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Ошибка при получении списка бакетов:', bucketsError);
      return;
    }
    
    console.log('Найдены бакеты:', buckets);
    
    // Если бакет vista-media существует, проверяем его содержимое
    const vistaBucket = buckets.find(b => b.name === 'vista-media');
    
    if (vistaBucket) {
      console.log('\nПроверка бакета vista-media...');
      
      // Проверяем настройки бакета
      console.log('Настройки бакета:', {
        id: vistaBucket.id,
        name: vistaBucket.name,
        public: vistaBucket.public,
        created_at: vistaBucket.created_at,
        updated_at: vistaBucket.updated_at
      });
      
      // Получаем содержимое бакета
      const { data: files, error: filesError } = await supabase.storage
        .from('vista-media')
        .list();
      
      if (filesError) {
        console.error('Ошибка при получении содержимого бакета:', filesError);
      } else {
        console.log('\nСодержимое корневой директории бакета vista-media:');
        files.forEach(item => {
          console.log(`- ${item.name} (${item.id}, папка: ${item.metadata ? 'нет' : 'да'})`);
        });
      }
      
      // Проверяем директорию player-documents
      console.log('\nПроверка директории player-documents:');
      const { data: docsFiles, error: docsError } = await supabase.storage
        .from('vista-media')
        .list('player-documents');
      
      if (docsError) {
        console.error('Ошибка при получении содержимого директории player-documents:', docsError);
      } else if (docsFiles && docsFiles.length === 0) {
        console.log('Директория player-documents существует, но пуста');
      } else {
        console.log('Содержимое директории player-documents:');
        docsFiles.forEach(item => {
          console.log(`- ${item.name} (${item.id}, папка: ${item.metadata ? 'нет' : 'да'})`);
        });
      }
      
      // Создадим тестовый файл
      console.log('\nПробуем создать тестовый файл в директории player-documents...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vista-media')
        .upload('player-documents/test-file.txt', 'Тестовый файл для проверки загрузки', {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Ошибка при создании тестового файла:', uploadError);
      } else {
        console.log('Тестовый файл успешно создан:', uploadData);
        
        // Получаем публичный URL
        const { data: { publicUrl } } = supabase.storage
          .from('vista-media')
          .getPublicUrl('player-documents/test-file.txt');
        
        console.log('Публичный URL тестового файла:', publicUrl);
      }
    } else {
      // Если бакета нет, создаем его
      console.log('\nБакет vista-media не найден, создаем...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('vista-media', {
        public: true
      });
      
      if (createError) {
        console.error('Ошибка при создании бакета vista-media:', createError);
      } else {
        console.log('Бакет vista-media успешно создан:', newBucket);
        
        // Создаем директорию player-documents
        console.log('\nСоздаем директорию player-documents...');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vista-media')
          .upload('player-documents/.gitkeep', '', {
            contentType: 'text/plain',
            upsert: true
          });
        
        if (uploadError) {
          console.error('Ошибка при создании директории player-documents:', uploadError);
        } else {
          console.log('Директория player-documents успешно создана');
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при проверке хранилища:', error);
  }
}

checkStorage(); 