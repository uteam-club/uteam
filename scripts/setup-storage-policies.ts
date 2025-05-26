/**
 * Скрипт для настройки политик безопасности Supabase Storage
 * 
 * Запуск: npx tsx scripts/setup-storage-policies.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Загружаем переменные окружения из .env файла
dotenv.config();

// Получаем переменные окружения для Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Проверка наличия необходимых переменных окружения
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Не указаны переменные окружения для Supabase');
  process.exit(1);
}

// Теперь TypeScript знает, что эти переменные не undefined
// Создаем клиент Supabase с сервисной ролью (административный доступ)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Название бакета
const STORAGE_BUCKET = 'club-media';

// Основная функция
async function setupStoragePolicies() {
  console.log('Начинаем настройку политик безопасности для Supabase Storage...');
  
  try {
    // Проверяем существование и настраиваем бакет
    console.log(`Настройка политик безопасности для бакета '${STORAGE_BUCKET}'...`);
    
    // Получаем список бакетов
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw new Error(`Не удалось получить список бакетов: ${error.message}`);
    }
    
    // Проверяем существование бакета
    const bucketExists = buckets.find(bucket => bucket.name === STORAGE_BUCKET);
    
    if (bucketExists) {
      console.log(`ℹ️ Бакет '${STORAGE_BUCKET}' уже существует в Supabase`);
      
      // Обновляем настройки бакета
      const { error: updateError } = await supabase.storage.updateBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 52428800 // 50 MB
      });
      
      if (updateError) {
        throw new Error(`Не удалось обновить настройки бакета: ${updateError.message}`);
      }
      
      console.log('✅ Бакет обновлен и установлен как публичный');
    } else {
      // Создаем новый бакет
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 52428800 // 50 MB
      });
      
      if (createError) {
        throw new Error(`Не удалось создать бакет: ${createError.message}`);
      }
      
      console.log(`✅ Бакет '${STORAGE_BUCKET}' успешно создан и установлен как публичный`);
    }
    
    // Создаем структуру папок
    console.log('Создаем структуру папок в бакете...');
    
    // Создаем папку для упражнений
    const exercisesFolder = 'Exercises';
    
    // Попытка "создать" папку путем загрузки пустого файла
    const { error: folderError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(`${exercisesFolder}/.keep`, new Uint8Array(0), {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (folderError) {
      console.warn(`⚠️ Не удалось создать папку ${exercisesFolder}: ${folderError.message}`);
    } else {
      console.log(`✅ Папка ${exercisesFolder} создана успешно`);
    }
    
    // Настраиваем политики через REST API (это не всегда работает через SDK)
    console.log('Настройка политики для бакета через REST API...');
    
    // Инструкции для ручной настройки
    console.log(`Из-за ограничений API, вам нужно вручную настроить RLS политики через Supabase Dashboard:
1. Перейдите в раздел Storage в консоли Supabase
2. Выберите бакет ${STORAGE_BUCKET}
3. Перейдите на вкладку Policies и добавьте следующие политики:
   - INSERT (для загрузки): auth.role() = 'authenticated'
   - SELECT (для чтения): true
   - UPDATE (для обновления): auth.role() = 'authenticated'
   - DELETE (для удаления): auth.role() = 'authenticated'`);
    
    console.log('✅ Настройки бакета Supabase Storage обновлены!');
    console.log('Пожалуйста, настройте RLS политики вручную через Supabase Dashboard согласно инструкциям выше.');
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Ошибка: ${error.message}`);
    } else {
      console.error('❌ Произошла неизвестная ошибка');
    }
    process.exit(1);
  }
}

// Запускаем основную функцию
setupStoragePolicies(); 