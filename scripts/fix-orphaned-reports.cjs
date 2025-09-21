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

async function fixOrphanedReports() {
  try {
    console.log('🔧 Исправляем сиротские GPS отчеты...\n');

    // Получаем все GPS отчеты FDC Vista
    const orphanedReportsQuery = `
      SELECT 
        gr.id,
        gr.name,
        gr."eventId",
        gr."eventType",
        gr."teamId",
        gr."clubId",
        gr."processedData",
        gr."createdAt"
      FROM "GpsReport" gr
      JOIN "Club" c ON gr."clubId" = c.id
      WHERE c.name = 'FDC Vista'
      ORDER BY gr."createdAt" DESC;
    `;

    const orphanedReportsResult = await pool.query(orphanedReportsQuery);
    console.log(`📊 Найдено GPS отчетов FDC Vista: ${orphanedReportsResult.rows.length}`);

    // Получаем существующий матч FDC Vista
    const existingMatchQuery = `
      SELECT 
        m.id,
        m."date",
        m."opponentName",
        m."teamGoals",
        m."opponentGoals"
      FROM "Match" m
      JOIN "Club" c ON m."clubId" = c.id
      WHERE c.name = 'FDC Vista'
      ORDER BY m."date" DESC
      LIMIT 1;
    `;

    const existingMatchResult = await pool.query(existingMatchQuery);
    
    if (existingMatchResult.rows.length === 0) {
      console.log('❌ Нет существующих матчей FDC Vista');
      return;
    }

    const existingMatch = existingMatchResult.rows[0];
    console.log(`📊 Существующий матч: ${new Date(existingMatch.date).toLocaleDateString()} vs ${existingMatch.opponentName} (${existingMatch.teamGoals}:${existingMatch.opponentGoals})`);
    console.log(`   Match ID: ${existingMatch.id}`);

    // Проверяем каждый отчет
    for (const report of orphanedReportsResult.rows) {
      console.log(`\n🔍 Проверяем отчет: ${report.name}`);
      console.log(`   Report ID: ${report.id}`);
      console.log(`   Event ID: ${report.eventId}`);
      console.log(`   Event Type: ${report.eventType}`);
      console.log(`   Data Length: ${report.processedData ? report.processedData.length : 0}`);

      // Проверяем, существует ли событие
      if (report.eventType === 'MATCH') {
        const matchExistsQuery = `
          SELECT id, "date", "opponentName"
          FROM "Match"
          WHERE id = $1
        `;
        
        const matchExistsResult = await pool.query(matchExistsQuery, [report.eventId]);
        
        if (matchExistsResult.rows.length === 0) {
          console.log(`   ❌ Связанный матч НЕ НАЙДЕН - это сиротский отчет`);
          
          // Предлагаем варианты исправления
          console.log(`   🔧 Варианты исправления:`);
          console.log(`      1. Удалить отчет (потеряем данные)`);
          console.log(`      2. Связать с существующим матчем ${existingMatch.id}`);
          
          // Для демонстрации свяжем с существующим матчем
          const updateQuery = `
            UPDATE "GpsReport"
            SET "eventId" = $1
            WHERE id = $2
          `;
          
          await pool.query(updateQuery, [existingMatch.id, report.id]);
          console.log(`   ✅ Отчет связан с существующим матчем`);
          
        } else {
          const match = matchExistsResult.rows[0];
          console.log(`   ✅ Связанный матч найден: ${new Date(match.date).toLocaleDateString()} vs ${match.opponentName}`);
        }
      } else if (report.eventType === 'TRAINING') {
        const trainingExistsQuery = `
          SELECT id, "date", name
          FROM "Training"
          WHERE id = $1
        `;
        
        const trainingExistsResult = await pool.query(trainingExistsQuery, [report.eventId]);
        
        if (trainingExistsResult.rows.length === 0) {
          console.log(`   ❌ Связанная тренировка НЕ НАЙДЕНА - это сиротский отчет`);
          console.log(`   🔧 Тренировки не исправляем автоматически`);
        } else {
          const training = trainingExistsResult.rows[0];
          console.log(`   ✅ Связанная тренировка найдена: ${new Date(training.date).toLocaleDateString()} - ${training.name}`);
        }
      }
    }

    // Проверяем результат
    console.log('\n🔍 Проверяем результат после исправления:');
    const finalCheckQuery = `
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

    const finalCheckResult = await pool.query(finalCheckQuery);
    console.log(`📊 Результат после исправления: ${finalCheckResult.rows.length} матчей`);
    
    finalCheckResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Матч: ${new Date(row.date).toLocaleDateString()} vs ${row.opponentName}`);
      console.log(`   Match ID: ${row.match_id}`);
      if (row.report_id) {
        console.log(`   ✅ Has GPS Report: ${row.report_name} (ID: ${row.report_id})`);
      } else {
        console.log(`   ❌ No GPS Report`);
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при исправлении:', error);
  } finally {
    await pool.end();
  }
}

fixOrphanedReports(); 