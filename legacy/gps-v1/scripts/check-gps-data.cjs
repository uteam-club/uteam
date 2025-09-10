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

    // Детальная проверка FDC Vista
    console.log('\n🔍 ДЕТАЛЬНАЯ ПРОВЕРКА FDC VISTA:');
    const fdcVistaQuery = `
      SELECT 
        gr.id,
        gr.name,
        gr."processedData",
        gr."rawData",
        gr."profileId",
        gr."teamId",
        gr."eventId",
        gr."eventType"
      FROM "GpsReport" gr
      JOIN "Club" c ON gr."clubId" = c.id
      WHERE c.name = 'FDC Vista'
        AND gr."processedData" IS NOT NULL 
        AND jsonb_array_length(gr."processedData") > 0
      ORDER BY gr."createdAt" DESC
      LIMIT 3;
    `;

    const fdcVistaResult = await pool.query(fdcVistaQuery);
    console.log(`\n📊 Найдено отчетов FDC Vista: ${fdcVistaResult.rows.length}`);
    
    fdcVistaResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. FDC Vista отчет: ${row.name}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Team ID: ${row.teamId}`);
      console.log(`   Event ID: ${row.eventId}`);
      console.log(`   Event Type: ${row.eventType}`);
      console.log(`   Profile ID: ${row.profileId}`);
      console.log(`   Обработанных записей: ${row.processedData.length}`);
      
      if (row.processedData.length > 0) {
        console.log(`   Все записи:`);
        row.processedData.forEach((record, recordIndex) => {
          console.log(`     ${recordIndex + 1}. ${JSON.stringify(record)}`);
        });
      }
    });

    // Проверяем профили GPS
    console.log('\n🔍 ПРОВЕРКА GPS ПРОФИЛЕЙ:');
    const profilesQuery = `
      SELECT 
        gp.id,
        gp.name,
        gp."gpsSystem",
        c.name as club_name,
        gp."columnMapping"
      FROM "GpsProfile" gp
      JOIN "Club" c ON gp."clubId" = c.id
      ORDER BY c.name, gp."createdAt" DESC;
    `;

    const profilesResult = await pool.query(profilesQuery);
    console.log(`\n📊 Найдено профилей: ${profilesResult.rows.length}`);
    
    profilesResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Профиль: ${row.name} (${row.club_name})`);
      console.log(`   ID: ${row.id}`);
      console.log(`   GPS System: ${row.gpsSystem}`);
      console.log(`   Column Mapping: ${JSON.stringify(row.columnMapping, null, 2)}`);
    });

    // ПРОВЕРКА СВЯЗИ СОБЫТИЙ С ОТЧЕТАМИ
    console.log('\n🔍 ПРОВЕРКА СВЯЗИ СОБЫТИЙ С GPS ОТЧЕТАМИ:');
    
    // Получаем матчи FDC Vista с GPS отчетами
    const fdcVistaMatchesQuery = `
      SELECT 
        m.id as match_id,
        m."date",
        m."opponentName",
        m."teamGoals",
        m."opponentGoals",
        gr.id as report_id,
        gr.name as report_name,
        gr."processedData",
        CASE 
          WHEN gr."processedData" IS NULL THEN 'NULL'
          WHEN jsonb_array_length(gr."processedData") = 0 THEN 'EMPTY'
          ELSE 'HAS_DATA'
        END as data_status,
        jsonb_array_length(gr."processedData") as data_length
      FROM "Match" m
      LEFT JOIN "GpsReport" gr ON gr."eventId" = m.id 
        AND gr."eventType" = 'MATCH' 
        AND gr."clubId" = m."clubId"
      JOIN "Club" c ON m."clubId" = c.id
      WHERE c.name = 'FDC Vista'
      ORDER BY m."date" DESC
      LIMIT 10;
    `;

    const fdcVistaMatchesResult = await pool.query(fdcVistaMatchesQuery);
    console.log(`\n📊 Матчи FDC Vista с GPS отчетами: ${fdcVistaMatchesResult.rows.length}`);
    
    fdcVistaMatchesResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Матч: ${new Date(row.date).toLocaleDateString()} vs ${row.opponentName} (${row.teamGoals}:${row.opponentGoals})`);
      console.log(`   Match ID: ${row.match_id}`);
      if (row.report_id) {
        console.log(`   Report ID: ${row.report_id}`);
        console.log(`   Report Name: ${row.report_name}`);
        console.log(`   Data Status: ${row.data_status}`);
        console.log(`   Data Length: ${row.data_length}`);
        
        if (row.processedData && row.processedData.length > 0) {
          console.log(`   First Record: ${JSON.stringify(row.processedData[0])}`);
        }
      } else {
        console.log(`   ❌ Нет GPS отчета`);
      }
    });

    // Получаем тренировки FDC Vista с GPS отчетами
    const fdcVistaTrainingsQuery = `
      SELECT 
        t.id as training_id,
        t."date",
        t.title as training_name,
        gr.id as report_id,
        gr.name as report_name,
        gr."processedData",
        CASE 
          WHEN gr."processedData" IS NULL THEN 'NULL'
          WHEN jsonb_array_length(gr."processedData") = 0 THEN 'EMPTY'
          ELSE 'HAS_DATA'
        END as data_status,
        jsonb_array_length(gr."processedData") as data_length
      FROM "Training" t
      LEFT JOIN "GpsReport" gr ON gr."eventId" = t.id 
        AND gr."eventType" = 'TRAINING' 
        AND gr."clubId" = t."clubId"
      JOIN "Club" c ON t."clubId" = c.id
      WHERE c.name = 'FDC Vista'
      ORDER BY t."date" DESC
      LIMIT 10;
    `;

    const fdcVistaTrainingsResult = await pool.query(fdcVistaTrainingsQuery);
    console.log(`\n📊 Тренировки FDC Vista с GPS отчетами: ${fdcVistaTrainingsResult.rows.length}`);
    
    fdcVistaTrainingsResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Тренировка: ${new Date(row.date).toLocaleDateString()} - ${row.training_name}`);
      console.log(`   Training ID: ${row.training_id}`);
      if (row.report_id) {
        console.log(`   Report ID: ${row.report_id}`);
        console.log(`   Report Name: ${row.report_name}`);
        console.log(`   Data Status: ${row.data_status}`);
        console.log(`   Data Length: ${row.data_length}`);
        
        if (row.processedData && row.processedData.length > 0) {
          console.log(`   First Record: ${JSON.stringify(row.processedData[0])}`);
        }
      } else {
        console.log(`   ❌ Нет GPS отчета`);
      }
    });

    // ПРОВЕРКА ТРИГГЕРОВ КАСКАДНОГО УДАЛЕНИЯ
    console.log('\n🔍 ПРОВЕРКА ТРИГГЕРОВ КАСКАДНОГО УДАЛЕНИЯ:');
    
    const triggersQuery = `
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%gps_reports%' 
        OR trigger_name LIKE '%delete_gps%'
      ORDER BY trigger_name;
    `;

    const triggersResult = await pool.query(triggersQuery);
    console.log(`\n📊 Найдено триггеров: ${triggersResult.rows.length}`);
    
    if (triggersResult.rows.length === 0) {
      console.log('❌ Триггеры каскадного удаления НЕ НАЙДЕНЫ!');
      console.log('💡 Нужно применить миграцию: drizzle/0016_add_cascade_delete_gps_reports.sql');
    } else {
      console.log('✅ Триггеры каскадного удаления найдены:');
      triggersResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.trigger_name}`);
        console.log(`   Таблица: ${row.event_object_table}`);
        console.log(`   Событие: ${row.event_manipulation}`);
        console.log(`   Время: ${row.action_timing}`);
        console.log(`   Действие: ${row.action_statement}`);
      });
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке данных:', error);
  } finally {
    await pool.end();
  }
}

checkGpsData(); 