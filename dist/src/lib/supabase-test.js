import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Создаем клиент Supabase с анонимным ключом
export const supabaseTestClient = createClient(supabaseUrl, supabaseAnonKey);
// Создаем клиент Supabase с сервисным ключом
export const supabaseTestAdmin = createClient(supabaseUrl, supabaseServiceKey);
// Проверка подключения к Supabase Storage
export const testStorageConnection = async () => {
    try {
        // Листинг бакетов
        const { data: buckets, error } = await supabaseTestAdmin.storage.listBuckets();
        if (error) {
            throw error;
        }
        return { success: true, buckets };
    }
    catch (error) {
        console.error('Ошибка при тестировании подключения к Supabase Storage:', error);
        return { success: false, error };
    }
};
// Проверка наличия и создание бакета
export const ensureBucket = async (bucketName = 'club-media') => {
    try {
        // Проверяем существование бакета
        const { data: buckets, error } = await supabaseTestAdmin.storage.listBuckets();
        if (error) {
            throw error;
        }
        // Проверяем наличие бакета
        const bucketExists = buckets.find(bucket => bucket.name === bucketName);
        if (bucketExists) {
            console.log(`Бакет ${bucketName} уже существует`);
            // Обновляем настройки бакета
            const { error: updateError } = await supabaseTestAdmin.storage.updateBucket(bucketName, {
                public: true
            });
            if (updateError) {
                throw updateError;
            }
            return { success: true, created: false, message: `Бакет ${bucketName} обновлен` };
        }
        // Создаем бакет, если он не существует
        const { error: createError } = await supabaseTestAdmin.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 10485760 // 10 МБ
        });
        if (createError) {
            throw createError;
        }
        return { success: true, created: true, message: `Бакет ${bucketName} создан` };
    }
    catch (error) {
        console.error('Ошибка при проверке или создании бакета:', error);
        return { success: false, error };
    }
};
