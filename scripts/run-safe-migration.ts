#!/usr/bin/env tsx

/**
 * Безопасная миграция для добавления trainingId в RPESurveyResponse
 */

import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Эквивалент __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSafeMigration() {
  console.log('🔧 Запуск безопасной миграции для добавления trainingId...');
  
  try {
    // Читаем SQL файл
    const migrationPath = path.join(__dirname, 'add-training-id-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Выполняем миграцию...');
    
    // Выполняем миграцию
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Миграция выполнена успешно!');
    
    // Проверяем результат
    console.log('🔍 Проверяем результат...');
    
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'RPESurveyResponse' 
      AND column_name = 'trainingId'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Поле trainingId успешно добавлено:');
      console.log(`   Тип: ${result.rows[0].data_type}`);
      console.log(`   Nullable: ${result.rows[0].is_nullable}`);
    } else {
      console.log('❌ Поле trainingId не найдено');
    }
    
    // Проверяем индексы
    const indexResult = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'RPESurveyResponse' 
      AND indexname LIKE '%training%'
    `);
    
    console.log(`✅ Найдено ${indexResult.rows.length} индексов для trainingId`);
    indexResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
    process.exit(1);
  }
}

// Запускаем миграцию
runSafeMigration()
  .then(() => {
    console.log('\n🏁 Миграция завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
