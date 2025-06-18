// Скрипт устарел. Supabase Storage больше не используется. Используйте Яндекс Object Storage.
// Всё содержимое закомментировано для предотвращения случайного запуска.
// export default function() { return null; }
/**
 * Скрипт для инициализации хранилища Supabase с явной загрузкой .env
 *
 * Запуск: npx tsx scripts/init-storage-dotenv.ts
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
// Загружаем переменные окружения из .env файла
dotenv.config();
console.log('Начинаем инициализацию хранилища Supabase...');
// Получаем переменные окружения для Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'установлен' : 'не установлен');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'установлен' : 'не установлен');
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Не указаны переменные окружения для Supabase');
    process.exit(1);
}
// Создаем клиент Supabase с сервисной ролью
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
async function initializeStorage() {
    try {
        // Название бакета для хранения файлов
        const STORAGE_BUCKET = 'club-media';
        // Проверяем существование бакета
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
            console.error('Ошибка при получении списка бакетов:', error);
            return false;
        }
        console.log('Существующие бакеты:', buckets.map(b => b.name).join(', ') || 'Нет бакетов');
        // Если бакет не существует, создаем его
        if (!buckets.find(bucket => bucket.name === STORAGE_BUCKET)) {
            console.log(`Создаем бакет '${STORAGE_BUCKET}'...`);
            const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
                public: true, // Сразу создаем публичный бакет
                fileSizeLimit: 10485760, // 10 МБ
            });
            if (createError) {
                console.error('Ошибка при создании бакета:', createError);
                return false;
            }
            console.log(`✅ Бакет '${STORAGE_BUCKET}' успешно создан в Supabase`);
        }
        else {
            console.log(`ℹ️ Бакет '${STORAGE_BUCKET}' уже существует в Supabase`);
            // Обновляем существующий бакет, делаем его публичным
            const { error: updateError } = await supabase.storage.updateBucket(STORAGE_BUCKET, {
                public: true
            });
            if (updateError) {
                console.error('Ошибка при обновлении бакета:', updateError);
            }
            else {
                console.log('✅ Бакет обновлен и установлен как публичный');
            }
        }
        return true;
    }
    catch (error) {
        console.error('❌ Ошибка при инициализации хранилища Supabase:', error);
        return false;
    }
}
async function main() {
    try {
        const success = await initializeStorage();
        if (success) {
            console.log('✅ Хранилище Supabase успешно инициализировано!');
        }
        else {
            console.error('❌ Не удалось инициализировать хранилище Supabase');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Ошибка при инициализации хранилища:', error);
        process.exit(1);
    }
}
main();
