// Скрипт устарел. Supabase Storage больше не используется. Используйте Яндекс Object Storage.
// Всё содержимое закомментировано для предотвращения случайного запуска.
// export default function() { return null; }
import { createClient } from '@supabase/supabase-js';
// Создаем админский клиент Supabase для скриптов 
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Не указаны переменные окружения NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
// Инициализация бакета хранилища
export async function initializeStorageBucket(bucketName, isPublic = true) {
    try {
        const supabase = createAdminClient();
        // Проверяем существование бакета
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
            throw error;
        }
        // Если бакет не существует, создаем его
        if (!buckets.find(bucket => bucket.name === bucketName)) {
            const { error: createError } = await supabase.storage.createBucket(bucketName, {
                public: isPublic,
                fileSizeLimit: 10485760, // 10 МБ
            });
            if (createError) {
                throw createError;
            }
            console.log(`Бакет '${bucketName}' успешно создан в Supabase`);
        }
        else {
            // Обновляем существующий бакет
            const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
                public: isPublic
            });
            if (updateError) {
                console.error('Ошибка при обновлении бакета:', updateError);
            }
            else {
                console.log(`Бакет '${bucketName}' уже существует в Supabase и обновлен`);
            }
        }
        return true;
    }
    catch (error) {
        console.error('Ошибка при инициализации бакета:', error);
        return false;
    }
}
// Список файлов в бакете
export async function listFilesInBucket(bucketName, folderPath) {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase.storage
            .from(bucketName)
            .list(folderPath || '');
        if (error) {
            throw error;
        }
        return data || [];
    }
    catch (error) {
        console.error('Ошибка при получении списка файлов:', error);
        return [];
    }
}
// Удаление файлов из бакета
export async function deleteFilesFromBucket(bucketName, filePaths) {
    try {
        if (!filePaths.length)
            return true;
        const supabase = createAdminClient();
        // Разбиваем на группы по 100 файлов (ограничение API)
        for (let i = 0; i < filePaths.length; i += 100) {
            const batch = filePaths.slice(i, i + 100);
            const { error } = await supabase.storage
                .from(bucketName)
                .remove(batch);
            if (error) {
                console.error(`Ошибка при удалении файлов (группа ${i / 100 + 1}):`, error);
            }
        }
        return true;
    }
    catch (error) {
        console.error('Ошибка при удалении файлов:', error);
        return false;
    }
}
