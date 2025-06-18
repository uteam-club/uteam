/**
 * Скрипт для инициализации хранилища Supabase
 *
 * Запуск: npx tsx scripts/init-storage.ts
 */
// Сначала импортируем только dotenv и настраиваем переменные окружения
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
// Загружаем переменные окружения из файла .env
const dotenvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(dotenvPath)) {
    config({ path: dotenvPath });
    console.log('Переменные окружения загружены из файла .env');
}
else {
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
import { initializeStorageBucket } from './supabase-admin';
// Константы
const STORAGE_BUCKET = 'club-media';
async function initStorage() {
    console.log('====================================================');
    console.log('Инициализация хранилища Supabase');
    console.log('====================================================');
    try {
        const result = await initializeStorageBucket(STORAGE_BUCKET, true);
        if (result) {
            console.log('====================================================');
            console.log('Хранилище успешно инициализировано!');
            console.log('====================================================');
        }
        else {
            console.error('====================================================');
            console.error('Ошибка при инициализации хранилища');
            console.error('====================================================');
        }
    }
    catch (error) {
        console.error('Произошла ошибка:', error);
    }
}
// Запускаем инициализацию
initStorage();
