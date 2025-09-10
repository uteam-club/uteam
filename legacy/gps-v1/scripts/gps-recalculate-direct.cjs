const { Pool } = require('pg');
require('dotenv').config();

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function recalculateGpsReportDirect(reportId) {
  console.log(`🔄 Прямой пересчёт GPS отчёта: ${reportId}\n`);

  try {
    // Получаем информацию об отчёте до пересчёта
    const beforeQuery = `
      SELECT 
        id,
        name,
        "createdAt",
        "gpsSystem",
        "profileId",
        "rawData",
        "processedData",
        CASE 
          WHEN "profileSnapshot" IS NOT NULL AND "profileSnapshot"->'columns' IS NOT NULL 
          THEN jsonb_array_length("profileSnapshot"->'columns')::text
          ELSE '0'
        END as profileSnapshot_columns_length,
        CASE 
          WHEN "processedData" IS NOT NULL AND "processedData"->'canonical' IS NOT NULL 
          AND "processedData"->'canonical'->'rows' IS NOT NULL
          THEN jsonb_array_length("processedData"->'canonical'->'rows')::text
          ELSE '0'
        END as canonical_rows_length_before
      FROM public."GpsReport"
      WHERE id = $1
    `;

    const beforeResult = await pool.query(beforeQuery, [reportId]);
    
    if (beforeResult.rows.length === 0) {
      console.log('❌ Отчёт не найден');
      return { success: false, reason: 'Report not found' };
    }

    const reportBefore = beforeResult.rows[0];
    console.log('📊 Состояние ДО пересчёта:');
    console.log(`   ID: ${reportBefore.id}`);
    console.log(`   Название: ${reportBefore.name}`);
    console.log(`   ProfileSnapshot колонок: ${reportBefore.profilesnapshot_columns_length}`);
    console.log(`   Canonical строк: ${reportBefore.canonical_rows_length_before}`);

    // Проверяем, нужен ли пересчёт
    if (parseInt(reportBefore.profilesnapshot_columns_length) === 0) {
      console.log('⚠️  ProfileSnapshot пуст - пересчёт невозможен');
      return { success: false, reason: 'Empty profileSnapshot' };
    }

    if (!reportBefore.rawData || reportBefore.rawData.length === 0) {
      console.log('⚠️  RawData пуст - пересчёт невозможен');
      return { success: false, reason: 'Empty rawData' };
    }

    // Получаем профиль
    const profileQuery = `
      SELECT 
        id,
        name,
        "gpsSystem",
        "columnMapping",
        "metricsConfig"
      FROM public."GpsProfile"
      WHERE id = $1
    `;
    
    const profileResult = await pool.query(profileQuery, [reportBefore.profileId]);
    
    if (profileResult.rows.length === 0) {
      console.log('❌ Профиль не найден!');
      return { success: false, reason: 'Profile not found' };
    }
    
    const profile = profileResult.rows[0];
    console.log(`📋 Профиль: ${profile.name} (${profile.gpsSystem})`);

    // Выполняем пересчёт
    console.log('\n🔄 Выполняем пересчёт...');
    
    try {
      // Импортируем необходимые модули
      const { GpsDataProcessor } = require('../src/services/gps.service.ts');
      
      // Создаем процессор
      const processor = new GpsDataProcessor(reportBefore.rawData, profile);
      
      // Обрабатываем данные
      const processedData = await processor.processData();
      
      console.log('✅ Обработка завершена');
      console.log(`   Обработано игроков: ${processedData.players ? processedData.players.length : 0}`);
      
      // Обновляем отчёт в БД
      const updateQuery = `
        UPDATE public."GpsReport"
        SET 
          "processedData" = $1,
          "isProcessed" = true,
          "updatedAt" = NOW()
        WHERE id = $2
      `;
      
      await pool.query(updateQuery, [JSON.stringify(processedData), reportId]);
      console.log('✅ Отчёт обновлён в БД');

    } catch (processingError) {
      console.log(`❌ Ошибка обработки: ${processingError.message}`);
      return { success: false, reason: `Processing error: ${processingError.message}` };
    }

    // Получаем информацию об отчёте после пересчёта
    const afterQuery = `
      SELECT 
        CASE 
          WHEN "processedData" IS NOT NULL AND "processedData"->'canonical' IS NOT NULL 
          AND "processedData"->'canonical'->'rows' IS NOT NULL
          THEN jsonb_array_length("processedData"->'canonical'->'rows')::text
          ELSE '0'
        END as canonical_rows_length_after,
        CASE 
          WHEN "processedData" IS NOT NULL AND "processedData"->'players' IS NOT NULL 
          THEN jsonb_array_length("processedData"->'players')::text
          ELSE '0'
        END as players_count_after
      FROM public."GpsReport"
      WHERE id = $1
    `;

    const afterResult = await pool.query(afterQuery, [reportId]);
    const reportAfter = afterResult.rows[0];

    console.log('\n📊 Состояние ПОСЛЕ пересчёта:');
    console.log(`   Canonical строк: ${reportAfter.canonical_rows_length_after}`);
    console.log(`   Игроков обработано: ${reportAfter.players_count_after}`);

    const success = parseInt(reportAfter.players_count_after) > 0;
    
    if (success) {
      console.log('✅ Пересчёт успешен!');
    } else {
      console.log('❌ Пересчёт не дал результатов');
    }

    return {
      success,
      before: {
        profileSnapshotColumns: parseInt(reportBefore.profilesnapshot_columns_length),
        canonicalRows: parseInt(reportBefore.canonical_rows_length_before)
      },
      after: {
        canonicalRows: parseInt(reportAfter.canonical_rows_length_after),
        playersCount: parseInt(reportAfter.players_count_after)
      }
    };

  } catch (error) {
    console.error('❌ Ошибка пересчёта:', error);
    return { success: false, reason: error.message };
  } finally {
    await pool.end();
  }
}

// Запускаем пересчёт
const reportId = process.argv[2];
if (!reportId) {
  console.log('❌ Укажите ID отчёта: node scripts/gps-recalculate-direct.cjs <reportId>');
  process.exit(1);
}

recalculateGpsReportDirect(reportId).then(result => {
  console.log('\n=== РЕЗУЛЬТАТ ===');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(console.error);
