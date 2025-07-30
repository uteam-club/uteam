const { Pool } = require('pg');
require('dotenv').config();

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkGpsData() {
  console.log('🔍 Проверяем GPS данные в базе...\n');

  try {
    // 1. Проверяем все GPS отчеты
    console.log('=== ВСЕ GPS ОТЧЕТЫ ===');
    const allReports = await pool.query(`
      SELECT 
        id,
        name,
        "eventId",
        "eventType",
        "teamId",
        "profileId",
        "isProcessed",
        "createdAt",
        "updatedAt",
        "clubId",
        "uploadedById",
        CASE 
          WHEN "processedData" IS NOT NULL AND jsonb_typeof("processedData") = 'array' 
          THEN jsonb_array_length("processedData")::text
          ELSE 'not array'
        END as processed_data_length,
        CASE 
          WHEN "rawData" IS NOT NULL AND jsonb_typeof("rawData") = 'array' 
          THEN jsonb_array_length("rawData")::text
          ELSE 'not array'
        END as raw_data_length
      FROM "GpsReport"
      ORDER BY "createdAt" DESC
    `);

    console.log(`📊 Всего отчетов: ${allReports.rows.length}`);
    allReports.rows.forEach((report, index) => {
      console.log(`${index + 1}. ${report.name} (${report.eventType}) - ${report.processed_data_length} записей`);
    });

    // 2. Проверяем отчеты за 22.07.2025
    console.log('\n=== ОТЧЕТЫ ЗА 22.07.2025 ===');
    const reportsForDate = await pool.query(`
      SELECT 
        id,
        name,
        "eventId",
        "eventType",
        "teamId",
        "profileId",
        "isProcessed",
        "createdAt",
        "updatedAt",
        "clubId",
        "uploadedById"
      FROM "GpsReport"
      WHERE DATE("createdAt") = '2025-07-22'
      ORDER BY "createdAt" DESC
    `);

    console.log(`📅 Отчетов за 22.07.2025: ${reportsForDate.rows.length}`);
    reportsForDate.rows.forEach((report, index) => {
      console.log(`${index + 1}. ${report.name} (${report.eventType}) - ID события: ${report.eventId}`);
    });

    // 3. Проверяем отчеты с данными
    console.log('\n=== ОТЧЕТЫ С ДАННЫМИ ===');
    const reportsWithData = await pool.query(`
      SELECT 
        id,
        name,
        "eventId",
        "eventType",
        "isProcessed",
        "processedData" IS NOT NULL as has_processed_data,
        "rawData" IS NOT NULL as has_raw_data,
        CASE 
          WHEN "processedData" IS NOT NULL AND jsonb_typeof("processedData") = 'array' 
          THEN jsonb_array_length("processedData")
          ELSE 0
        END as processed_data_count
      FROM "GpsReport"
      WHERE "processedData" IS NOT NULL OR "rawData" IS NOT NULL
      ORDER BY "createdAt" DESC
    `);

    console.log(`📊 Отчетов с данными: ${reportsWithData.rows.length}`);
    reportsWithData.rows.forEach((report, index) => {
      console.log(`${index + 1}. ${report.name} - ${report.processed_data_count} записей`);
    });

    // 4. Проверяем структуру данных в processedData
    if (reportsWithData.rows.length > 0) {
      console.log('\n=== СТРУКТУРА ДАННЫХ ===');
      const firstReport = reportsWithData.rows[0];
      const dataStructure = await pool.query(`
        SELECT 
          id,
          name,
          "processedData"->0 as first_row_sample
        FROM "GpsReport"
        WHERE id = $1
      `, [firstReport.id]);

      if (dataStructure.rows[0] && dataStructure.rows[0].first_row_sample) {
        console.log('📋 Первая запись в данных:');
        console.log(JSON.stringify(dataStructure.rows[0].first_row_sample, null, 2));
      }
    }

    // 5. Проверяем тренировки и матчи за 22.07.2025
    console.log('\n=== СОБЫТИЯ ЗА 22.07.2025 ===');
    const eventsForDate = await pool.query(`
      SELECT 
        'training' as type,
        id,
        title,
        date,
        "teamId"
      FROM "Training"
      WHERE DATE(date) = '2025-07-22'
      UNION ALL
      SELECT 
        'match' as type,
        id,
        "opponentName" as title,
        date,
        "teamId"
      FROM "Match"
      WHERE DATE(date) = '2025-07-22'
      ORDER BY date
    `);

    console.log(`📅 Событий за 22.07.2025: ${eventsForDate.rows.length}`);
    eventsForDate.rows.forEach((event, index) => {
      console.log(`${index + 1}. ${event.type.toUpperCase()}: ${event.title} (ID: ${event.id})`);
    });

    // 6. Проверяем связь между отчетами и событиями
    console.log('\n=== СВЯЗЬ ОТЧЕТОВ И СОБЫТИЙ ===');
    const reportEventLinks = await pool.query(`
      SELECT 
        r.id as report_id,
        r.name as report_name,
        r."eventId",
        r."eventType",
        CASE 
          WHEN r."eventType" = 'TRAINING' THEN t.title
          WHEN r."eventType" = 'MATCH' THEN m."opponentName"
          ELSE 'Unknown'
        END as event_name,
        CASE 
          WHEN r."eventType" = 'TRAINING' THEN t.date
          WHEN r."eventType" = 'MATCH' THEN m.date
          ELSE NULL
        END as event_date
      FROM "GpsReport" r
      LEFT JOIN "Training" t ON r."eventId" = t.id AND r."eventType" = 'TRAINING'
      LEFT JOIN "Match" m ON r."eventId" = m.id AND r."eventType" = 'MATCH'
      ORDER BY r."createdAt" DESC
    `);

    console.log(`🔗 Связей отчет-событие: ${reportEventLinks.rows.length}`);
    reportEventLinks.rows.forEach((link, index) => {
      console.log(`${index + 1}. ${link.report_name} -> ${link.event_name} (${link.event_date})`);
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке базы данных:', error);
  } finally {
    await pool.end();
  }
}

checkGpsData(); 