const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
  port: 6432,
  database: 'uteam',
  user: 'uteam-admin',
  password: 'Mell567234!',
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync('./yandex_root.crt').toString()
  }
});

async function checkGpsData() {
  try {
    console.log('🔍 Проверяем GPS данные в базе...\n');

    // Получаем статистику по клубам
    const clubsQuery = `
      SELECT 
        c.name as club_name, 
        c.id as club_id, 
        COUNT(gr.id) as reports_count,
        COUNT(CASE WHEN gr."processedData" IS NOT NULL AND jsonb_array_length(gr."processedData") > 0 THEN 1 END) as reports_with_data
      FROM "Club" c 
      LEFT JOIN "GpsReport" gr ON c.id = gr."clubId" 
      GROUP BY c.id, c.name 
      ORDER BY c.name;
    `;

    const clubsResult = await pool.query(clubsQuery);
    console.log('📊 Статистика по клубам:');
    console.table(clubsResult.rows);

    // Получаем детальную информацию по отчетам
    const reportsQuery = `
      SELECT 
        gr.id,
        gr.name,
        gr."gpsSystem",
        gr."eventType",
        gr."isProcessed",
        c.name as club_name,
        CASE 
          WHEN gr."processedData" IS NULL THEN 'NULL'
          WHEN jsonb_array_length(gr."processedData") = 0 THEN 'EMPTY'
          ELSE 'HAS_DATA'
        END as data_status,
        jsonb_array_length(gr."processedData") as data_length,
        gr."createdAt"
      FROM "GpsReport" gr
      JOIN "Club" c ON gr."clubId" = c.id
      ORDER BY c.name, gr."createdAt" DESC;
    `;

    const reportsResult = await pool.query(reportsQuery);
    console.log('\n📋 Детальная информация по отчетам:');
    console.table(reportsResult.rows);

    // Проверяем конкретные отчеты с данными
    const detailedQuery = `
      SELECT 
        gr.id,
        gr.name,
        c.name as club_name,
        gr."processedData",
        gr."rawData"
      FROM "GpsReport" gr
      JOIN "Club" c ON gr."clubId" = c.id
      WHERE gr."processedData" IS NOT NULL 
        AND jsonb_array_length(gr."processedData") > 0
      ORDER BY c.name, gr."createdAt" DESC
      LIMIT 5;
    `;

    const detailedResult = await pool.query(detailedQuery);
    console.log('\n🔍 Примеры отчетов с данными:');
    detailedResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.club_name} - ${row.name}:`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Обработанных записей: ${row.processedData.length}`);
      if (row.processedData.length > 0) {
        console.log(`   Первая запись:`, JSON.stringify(row.processedData[0], null, 2));
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке данных:', error);
  } finally {
    await pool.end();
  }
}

checkGpsData(); 