#!/usr/bin/env tsx

/**
 * Миграция для создания таблицы RPESchedule
 */

import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Эквивалент __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRPEScheduleMigration() {
  console.log('🔧 Запуск миграции для создания таблицы RPESchedule...');
  
  try {
    // Проверяем, существует ли таблица
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'RPESchedule'
      );
    `);

    const tableExists = tableCheck.rows[0]?.exists;

    if (tableExists) {
      console.log('✅ Таблица RPESchedule уже существует');
      return;
    }

    // Читаем SQL файл
    const migrationPath = path.join(__dirname, 'create-rpe-schedule-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Выполняем миграцию...');
    
    // Выполняем миграцию
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Таблица RPESchedule создана успешно!');
    
    // Проверяем результат
    console.log('🔍 Проверяем структуру таблицы...');
    
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'RPESchedule' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Структура таблицы RPESchedule:');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Проверяем индексы
    const indexResult = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'RPESchedule'
    `);
    
    console.log(`✅ Создано ${indexResult.rows.length} индексов:`);
    indexResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
    process.exit(1);
  }
}

// Запускаем миграцию
runRPEScheduleMigration()
  .then(() => {
    console.log('\n🏁 Миграция завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
