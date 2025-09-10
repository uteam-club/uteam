const { Pool } = require('pg');
require('dotenv').config();

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function recalculateGpsReport(reportId) {
  console.log(`🔄 Пересчёт GPS отчёта: ${reportId}\n`);

  try {
    // Получаем информацию об отчёте до пересчёта
    const beforeQuery = `
      SELECT 
        id,
        name,
        "createdAt",
        "gpsSystem",
        "profileId",
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

    if (parseInt(reportBefore.canonical_rows_length_before) > 0) {
      console.log('⚠️  Canonical данные уже есть - пересчёт может быть не нужен');
    }

    // Выполняем пересчёт через API
    console.log('\n🔄 Выполняем пересчёт...');
    
    // Создаем HTTP запрос к API
    const fetch = require('node-fetch');
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${baseUrl}/api/gps-reports/${reportId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Добавляем заголовки для авторизации если нужно
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Ошибка API: ${response.status} - ${errorText}`);
        return { success: false, reason: `API error: ${response.status}` };
      }

      const result = await response.json();
      console.log('✅ API ответ получен');

    } catch (apiError) {
      console.log(`❌ Ошибка вызова API: ${apiError.message}`);
      
      // Если API недоступен, попробуем прямой пересчёт через БД
      console.log('🔄 Пробуем прямой пересчёт через БД...');
      
      // Здесь можно добавить логику прямого пересчёта
      // Пока что просто возвращаем ошибку
      return { success: false, reason: `API unavailable: ${apiError.message}` };
    }

    // Получаем информацию об отчёте после пересчёта
    const afterQuery = `
      SELECT 
        CASE 
          WHEN "processedData" IS NOT NULL AND "processedData"->'canonical' IS NOT NULL 
          AND "processedData"->'canonical'->'rows' IS NOT NULL
          THEN jsonb_array_length("processedData"->'canonical'->'rows')::text
          ELSE '0'
        END as canonical_rows_length_after
      FROM public."GpsReport"
      WHERE id = $1
    `;

    const afterResult = await pool.query(afterQuery, [reportId]);
    const reportAfter = afterResult.rows[0];

    console.log('\n📊 Состояние ПОСЛЕ пересчёта:');
    console.log(`   Canonical строк: ${reportAfter.canonical_rows_length_after}`);

    const success = parseInt(reportAfter.canonical_rows_length_after) > 0;
    
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
        canonicalRows: parseInt(reportAfter.canonical_rows_length_after)
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
  console.log('❌ Укажите ID отчёта: node scripts/gps-recalculate.cjs <reportId>');
  process.exit(1);
}

recalculateGpsReport(reportId).then(result => {
  console.log('\n=== РЕЗУЛЬТАТ ===');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(console.error);
