// Скрипт для проверки структуры таблицы RPESurveyResponse
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { rpeSurveyResponse } from '../src/db/schema/rpeSurveyResponse.ts';

// Загружаем переменные окружения
config();

async function checkTableStructure() {
  try {
    console.log('🔍 Проверка структуры таблицы RPESurveyResponse...\n');
    
    // Подключаемся к базе данных
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL не найден в .env файле');
    }
    
    const client = postgres(connectionString);
    const db = drizzle(client);
    
    // Проверяем структуру таблицы
    console.log('📊 Структура таблицы RPESurveyResponse:');
    console.log('=====================================');
    
    const columns = Object.keys(rpeSurveyResponse);
    columns.forEach((column, index) => {
      const columnInfo = rpeSurveyResponse[column];
      console.log(`${index + 1}. ${column}: ${columnInfo.dataType}${columnInfo.notNull ? ' (NOT NULL)' : ' (nullable)'}`);
    });
    
    console.log(`\n📈 Всего колонок: ${columns.length}`);
    
    // Проверяем, есть ли поле durationMinutes
    if ('durationMinutes' in rpeSurveyResponse) {
      console.log('✅ Поле durationMinutes уже существует в схеме!');
    } else {
      console.log('❌ Поле durationMinutes отсутствует в схеме');
    }
    
    // Проверяем количество записей
    try {
      const result = await db.select().from(rpeSurveyResponse).limit(1);
      console.log('\n📊 Проверка подключения к таблице:');
      console.log('✅ Таблица доступна для чтения');
      console.log(`📝 Пример записи:`, result.length > 0 ? 'Есть данные' : 'Таблица пуста');
    } catch (error) {
      console.log('\n❌ Ошибка при чтении таблицы:', error.message);
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkTableStructure();
