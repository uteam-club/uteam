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

async function reprocessGpsReport() {
  try {
    console.log('🔍 Перезагружаем проблемный GPS отчет FDC Vista...\n');

    // Находим проблемный отчет (первый отчет FDC Vista с именем "2")
    const problemReportQuery = `
      SELECT 
        gr.id,
        gr.name,
        gr."processedData",
        gr."rawData",
        gr."profileId",
        gr."teamId",
        gr."clubId"
      FROM "GpsReport" gr
      JOIN "Club" c ON gr."clubId" = c.id
      WHERE c.name = 'FDC Vista'
        AND gr.name = '2'
        AND gr."processedData" IS NOT NULL 
        AND jsonb_array_length(gr."processedData") > 0
      ORDER BY gr."createdAt" DESC
      LIMIT 1;
    `;

    const problemReportResult = await pool.query(problemReportQuery);
    
    if (problemReportResult.rows.length === 0) {
      console.log('❌ Проблемный отчет не найден');
      return;
    }

    const problemReport = problemReportResult.rows[0];
    console.log('📊 Найден проблемный отчет:');
    console.log(`   ID: ${problemReport.id}`);
    console.log(`   Name: ${problemReport.name}`);
    console.log(`   Team ID: ${problemReport.teamId}`);
    console.log(`   Profile ID: ${problemReport.profileId}`);
    console.log(`   Обработанных записей: ${problemReport.processedData.length}`);

    // Проверяем данные
    console.log('\n🔍 Данные отчета:');
    problemReport.processedData.forEach((record, index) => {
      console.log(`   ${index + 1}. ${JSON.stringify(record)}`);
    });

    // Проверяем сырые данные
    console.log('\n🔍 Сырые данные (первые 3 строки):');
    if (problemReport.rawData && Array.isArray(problemReport.rawData)) {
      problemReport.rawData.slice(0, 3).forEach((row, index) => {
        console.log(`   ${index + 1}. ${JSON.stringify(row)}`);
      });
    }

    // Проверяем профиль
    const profileQuery = `
      SELECT 
        gp.id,
        gp.name,
        gp."gpsSystem",
        gp."columnMapping"
      FROM "GpsProfile" gp
      WHERE gp.id = $1;
    `;

    const profileResult = await pool.query(profileQuery, [problemReport.profileId]);
    
    if (profileResult.rows.length > 0) {
      const profile = profileResult.rows[0];
      console.log('\n🔍 Профиль GPS:');
      console.log(`   ID: ${profile.id}`);
      console.log(`   Name: ${profile.name}`);
      console.log(`   GPS System: ${profile.gpsSystem}`);
      console.log(`   Column Mapping: ${JSON.stringify(profile.columnMapping, null, 2)}`);
    }

    // Удаляем проблемный отчет
    console.log('\n🗑️ Удаляем проблемный отчет...');
    const deleteQuery = `
      DELETE FROM "GpsReport"
      WHERE id = $1;
    `;

    await pool.query(deleteQuery, [problemReport.id]);
    console.log('✅ Проблемный отчет удален');

    console.log('\n📋 Рекомендации:');
    console.log('1. Загрузите отчет заново через интерфейс');
    console.log('2. Убедитесь, что файл содержит все необходимые колонки');
    console.log('3. Проверьте маппинг игроков перед загрузкой');

  } catch (error) {
    console.error('❌ Ошибка при перезагрузке отчета:', error);
  } finally {
    await pool.end();
  }
}

reprocessGpsReport(); 