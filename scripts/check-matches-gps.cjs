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

async function checkMatchesGps() {
  try {
    console.log('🔍 Проверяем связь матчей и GPS отчетов...\n');

    // Получаем все матчи FDC Vista
    const fdcVistaMatchesQuery = `
      SELECT 
        m.id,
        m."date",
        m."opponentName",
        m."teamGoals",
        m."opponentGoals",
        m."teamId",
        m."clubId",
        t.name as team_name,
        c.name as club_name
      FROM "Match" m
      JOIN "Team" t ON m."teamId" = t.id
      JOIN "Club" c ON m."clubId" = c.id
      WHERE c.name = 'FDC Vista'
      ORDER BY m."date" DESC;
    `;

    const fdcVistaMatchesResult = await pool.query(fdcVistaMatchesQuery);
    console.log(`📊 Найдено матчей FDC Vista: ${fdcVistaMatchesResult.rows.length}`);
    
    fdcVistaMatchesResult.rows.forEach((match, index) => {
      console.log(`\n${index + 1}. Матч: ${new Date(match.date).toLocaleDateString()} vs ${match.opponentName} (${match.teamGoals}:${match.opponentGoals})`);
      console.log(`   Match ID: ${match.id}`);
      console.log(`   Team ID: ${match.teamId}`);
      console.log(`   Club ID: ${match.clubId}`);
    });

    // Проверяем GPS отчеты для каждого матча
    console.log('\n🔍 Проверяем GPS отчеты для каждого матча:');
    
    for (const match of fdcVistaMatchesResult.rows) {
      const gpsReportsQuery = `
        SELECT 
          gr.id,
          gr.name,
          gr."eventId",
          gr."eventType",
          gr."teamId",
          gr."clubId",
          gr."processedData"
        FROM "GpsReport" gr
        WHERE gr."eventId" = $1 
          AND gr."eventType" = 'MATCH'
          AND gr."clubId" = $2
      `;

      const gpsReportsResult = await pool.query(gpsReportsQuery, [match.id, match.clubId]);
      
      console.log(`\n📊 Матч ${new Date(match.date).toLocaleDateString()} vs ${match.opponentName}:`);
      console.log(`   Match ID: ${match.id}`);
      
      if (gpsReportsResult.rows.length > 0) {
        console.log(`   ✅ Найдено GPS отчетов: ${gpsReportsResult.rows.length}`);
        gpsReportsResult.rows.forEach((report, reportIndex) => {
          console.log(`     ${reportIndex + 1}. Report ID: ${report.id}`);
          console.log(`        Name: ${report.name}`);
          console.log(`        Data Length: ${report.processedData ? report.processedData.length : 0}`);
        });
      } else {
        console.log(`   ❌ Нет GPS отчетов`);
      }
    }

    // Проверяем все GPS отчеты FDC Vista
    console.log('\n🔍 Все GPS отчеты FDC Vista:');
    const allGpsReportsQuery = `
      SELECT 
        gr.id,
        gr.name,
        gr."eventId",
        gr."eventType",
        gr."teamId",
        gr."clubId",
        gr."processedData",
        c.name as club_name
      FROM "GpsReport" gr
      JOIN "Club" c ON gr."clubId" = c.id
      WHERE c.name = 'FDC Vista'
      ORDER BY gr."createdAt" DESC;
    `;

    const allGpsReportsResult = await pool.query(allGpsReportsQuery);
    console.log(`📊 Всего GPS отчетов FDC Vista: ${allGpsReportsResult.rows.length}`);
    
    allGpsReportsResult.rows.forEach((report, index) => {
      console.log(`\n${index + 1}. GPS Report: ${report.name}`);
      console.log(`   Report ID: ${report.id}`);
      console.log(`   Event ID: ${report.eventId}`);
      console.log(`   Event Type: ${report.eventType}`);
      console.log(`   Team ID: ${report.teamId}`);
      console.log(`   Data Length: ${report.processedData ? report.processedData.length : 0}`);
      
      // Проверяем, существует ли событие для этого отчета
      if (report.eventType === 'MATCH') {
        const matchExistsQuery = `
          SELECT id, "date", "opponentName"
          FROM "Match"
          WHERE id = $1
        `;
        
        pool.query(matchExistsQuery, [report.eventId]).then(matchResult => {
          if (matchResult.rows.length > 0) {
            const match = matchResult.rows[0];
            console.log(`   ✅ Связанный матч: ${new Date(match.date).toLocaleDateString()} vs ${match.opponentName}`);
          } else {
            console.log(`   ❌ Связанный матч НЕ НАЙДЕН!`);
          }
        });
      }
    });

    // Проверяем логику API matches
    console.log('\n🔍 Проверяем логику API matches:');
    const apiLogicQuery = `
      SELECT 
        m.id as match_id,
        m."date",
        m."opponentName",
        gr.id as report_id,
        gr.name as report_name
      FROM "Match" m
      LEFT JOIN "GpsReport" gr ON gr."eventId" = m.id 
        AND gr."eventType" = 'MATCH' 
        AND gr."clubId" = m."clubId"
      JOIN "Club" c ON m."clubId" = c.id
      WHERE c.name = 'FDC Vista'
      ORDER BY m."date" DESC;
    `;

    const apiLogicResult = await pool.query(apiLogicQuery);
    console.log(`📊 Результат логики API: ${apiLogicResult.rows.length} матчей`);
    
    apiLogicResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Матч: ${new Date(row.date).toLocaleDateString()} vs ${row.opponentName}`);
      console.log(`   Match ID: ${row.match_id}`);
      if (row.report_id) {
        console.log(`   ✅ Has GPS Report: ${row.report_name} (ID: ${row.report_id})`);
      } else {
        console.log(`   ❌ No GPS Report`);
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await pool.end();
  }
}

checkMatchesGps(); 