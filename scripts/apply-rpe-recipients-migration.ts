import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * Миграция для добавления поля recipientsConfig в таблицу RPESchedule
 */
async function applyRPERecipientsMigration() {
  console.log('🔧 Запуск миграции для добавления recipientsConfig в RPESchedule...');
  
  try {
    // Проверяем, существует ли уже поле recipientsConfig
    const checkColumnQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'RPESchedule' 
      AND column_name = 'recipientsConfig'
    `;
    
    const existingColumns = await db.execute(checkColumnQuery);
    
    if (existingColumns.rows.length > 0) {
      console.log('✅ Поле recipientsConfig уже существует в таблице RPESchedule');
      return;
    }
    
    // Добавляем поле recipientsConfig
    const addColumnQuery = sql`
      ALTER TABLE "RPESchedule" 
      ADD COLUMN "recipientsConfig" text
    `;
    
    await db.execute(addColumnQuery);
    console.log('✅ Поле recipientsConfig успешно добавлено в таблицу RPESchedule');
    
    // Проверяем структуру таблицы
    const tableStructureQuery = sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'RPESchedule'
      ORDER BY ordinal_position
    `;
    
    const structure = await db.execute(tableStructureQuery);
    console.log('📋 Структура таблицы RPESchedule:');
    structure.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    throw error;
  }
}

// Запуск миграции
applyRPERecipientsMigration()
  .then(() => {
    console.log('✅ Миграция завершена успешно!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Миграция завершилась с ошибкой:', error);
    process.exit(1);
  });
