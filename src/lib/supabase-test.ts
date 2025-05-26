import { createClient } from '@supabase/supabase-js';

// Используем явные значения для тестирования
const supabaseUrl = 'https://eprnjqohtlxxqufvofbr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcm5qcW9odGx4eHF1ZnZvZmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODcxMzYsImV4cCI6MjA2MTc2MzEzNn0.K-rKPFwPc-DOMgzMOXVB09NUyWtETTmewndRQwQYPtg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcm5qcW9odGx4eHF1ZnZvZmJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjE4NzEzNiwiZXhwIjoyMDYxNzYzMTM2fQ.SEcVYg6fzswxAGShe0EDtY8ZPz0zO3as_39fjHIOZA4';

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
  } catch (error) {
    console.error('Ошибка при тестировании подключения к Supabase Storage:', error);
    return { success: false, error };
  }
};

// Проверка наличия и создание бакета
export const ensureBucket = async (bucketName: string = 'club-media') => {
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
  } catch (error) {
    console.error('Ошибка при проверке или создании бакета:', error);
    return { success: false, error };
  }
}; 