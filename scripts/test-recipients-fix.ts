import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * Тестовый скрипт для проверки исправлений с получателями опросников
 */
async function testRecipientsFix() {
  console.log('🧪 Тестирование исправлений с получателями опросников...\n');
  
  try {
    // 1. Проверяем, что поле recipientsConfig добавлено в RPESchedule
    console.log('1️⃣ Проверка поля recipientsConfig в таблице RPESchedule...');
    const checkRPEScheduleQuery = sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'RPESchedule' 
      AND column_name = 'recipientsConfig'
    `;
    
    const rpeScheduleColumns = await db.execute(checkRPEScheduleQuery);
    
    if (rpeScheduleColumns.rows.length > 0) {
      console.log('✅ Поле recipientsConfig найдено в RPESchedule');
      const column = rpeScheduleColumns.rows[0];
      console.log(`   - Тип: ${column.data_type}, Nullable: ${column.is_nullable}`);
    } else {
      console.log('❌ Поле recipientsConfig НЕ найдено в RPESchedule');
    }
    
    // 2. Проверяем, что поле recipientsConfig существует в SurveySchedule
    console.log('\n2️⃣ Проверка поля recipientsConfig в таблице SurveySchedule...');
    const checkSurveyScheduleQuery = sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'SurveySchedule' 
      AND column_name = 'recipientsConfig'
    `;
    
    const surveyScheduleColumns = await db.execute(checkSurveyScheduleQuery);
    
    if (surveyScheduleColumns.rows.length > 0) {
      console.log('✅ Поле recipientsConfig найдено в SurveySchedule');
      const column = surveyScheduleColumns.rows[0];
      console.log(`   - Тип: ${column.data_type}, Nullable: ${column.is_nullable}`);
    } else {
      console.log('❌ Поле recipientsConfig НЕ найдено в SurveySchedule');
    }
    
    // 3. Проверяем существующие настройки получателей
    console.log('\n3️⃣ Проверка существующих настроек получателей...');
    const checkRecipientsQuery = sql`
      SELECT 
        'SurveySchedule' as table_name,
        ss."teamId",
        ss."surveyType",
        ss."recipientsConfig"
      FROM "SurveySchedule" ss
      WHERE ss."recipientsConfig" IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'RPESchedule' as table_name,
        rs."teamId",
        'rpe' as "surveyType",
        rs."recipientsConfig"
      FROM "RPESchedule" rs
      WHERE rs."recipientsConfig" IS NOT NULL
    `;
    
    const existingRecipients = await db.execute(checkRecipientsQuery);
    
    if (existingRecipients.rows.length > 0) {
      console.log(`✅ Найдено ${existingRecipients.rows.length} настроек получателей:`);
      existingRecipients.rows.forEach((row: any, index: number) => {
        try {
          const config = JSON.parse(row.recipientsConfig);
          console.log(`   ${index + 1}. ${row.table_name} (${row.surveyType}):`);
          console.log(`      - Команда: ${row.teamId}`);
          console.log(`      - Индивидуальный режим: ${config.isIndividualMode}`);
          console.log(`      - Выбрано игроков: ${config.selectedPlayerIds ? config.selectedPlayerIds.length : 'все'}`);
        } catch (e) {
          console.log(`   ${index + 1}. ${row.table_name} (${row.surveyType}): Ошибка парсинга JSON`);
        }
      });
    } else {
      console.log('ℹ️ Настройки получателей не найдены (это нормально для новых установок)');
    }
    
    // 4. Проверяем структуру таблиц
    console.log('\n4️⃣ Структура таблиц...');
    
    const surveyScheduleStructure = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'SurveySchedule'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 SurveySchedule:');
    surveyScheduleStructure.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    const rpeScheduleStructure = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'RPESchedule'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 RPESchedule:');
    rpeScheduleStructure.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('\n✅ Тестирование завершено успешно!');
    console.log('\n📝 Следующие шаги:');
    console.log('   1. Перезапустить Telegram бота с обновленным кодом');
    console.log('   2. Протестировать настройки получателей в веб-интерфейсе');
    console.log('   3. Убедиться, что сообщения отправляются только выбранным игрокам');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
    throw error;
  }
}

// Запуск тестирования
testRecipientsFix()
  .then(() => {
    console.log('\n🎉 Все проверки пройдены!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Тестирование завершилось с ошибкой:', error);
    process.exit(1);
  });
