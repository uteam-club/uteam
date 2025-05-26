// Скрипт для инициализации хранилища Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Клиент для новой базы данных
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Инициализация хранилища
async function initStorage() {
  try {
    console.log('Начало инициализации хранилища...');
    
    // Создаем bucket для фотографий игроков, если его нет
    const { data: bucketPlayers, error: errorPlayers } = await supabase
      .storage
      .createBucket('players', {
        public: true, // Публичный доступ
        fileSizeLimit: 10485760, // 10MB
      });
    
    if (errorPlayers && !errorPlayers.message.includes('already exists')) {
      console.error('Ошибка при создании bucket players:', errorPlayers);
    } else {
      console.log('Bucket players создан или уже существует');
    }
    
    // Создаем bucket для документов игроков, если его нет
    const { data: bucketDocs, error: errorDocs } = await supabase
      .storage
      .createBucket('player-documents', {
        public: true, // Публичный доступ
        fileSizeLimit: 20971520, // 20MB
      });
    
    if (errorDocs && !errorDocs.message.includes('already exists')) {
      console.error('Ошибка при создании bucket player-documents:', errorDocs);
    } else {
      console.log('Bucket player-documents создан или уже существует');
    }
    
    console.log('Инициализация хранилища завершена');
  } catch (error) {
    console.error('Критическая ошибка при инициализации хранилища:', error);
  }
}

// Запуск инициализации
initStorage().catch((error) => {
  console.error('Ошибка при выполнении инициализации:', error);
  process.exit(1);
}); 