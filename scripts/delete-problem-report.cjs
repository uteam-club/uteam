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

async function deleteProblemReport() {
  try {
    console.log('🗑️ Удаляем проблемный GPS отчет FDC Vista...\n');

    // ID проблемного отчета
    const problemReportId = '9ebffb42-7775-431d-828a-1bfa0f3d5b18';

    // Проверяем отчет перед удалением
    const checkQuery = `
      SELECT 
        gr.id,
        gr.name,
        gr."eventId",
        gr."eventType",
        gr."processedData",
        c.name as club_name
      FROM "GpsReport" gr
      JOIN "Club" c ON gr."clubId" = c.id
      WHERE gr.id = $1;
    `;

    const checkResult = await pool.query(checkQuery, [problemReportId]);
    
    if (checkResult.rows.length === 0) {
      console.log('❌ Отчет не найден');
      return;
    }

    const report = checkResult.rows[0];
    console.log('📊 Найден отчет для удаления:');
    console.log(`   ID: ${report.id}`);
    console.log(`   Name: ${report.name}`);
    console.log(`   Club: ${report.club_name}`);
    console.log(`   Event ID: ${report.eventId}`);
    console.log(`   Event Type: ${report.eventType}`);
    console.log(`   Data Length: ${report.processedData ? report.processedData.length : 0}`);

    if (report.processedData && report.processedData.length > 0) {
      console.log('🔍 Первая запись данных:');
      console.log(`   ${JSON.stringify(report.processedData[0])}`);
    }

    // Подтверждение удаления
    console.log('\n⚠️ ВНИМАНИЕ: Этот отчет содержит только имена игроков без метрик!');
    console.log('✅ Удаление безопасно - данные неполные');

    // Удаляем отчет
    const deleteQuery = `
      DELETE FROM "GpsReport"
      WHERE id = $1;
    `;

    await pool.query(deleteQuery, [problemReportId]);
    console.log('✅ Проблемный отчет успешно удален');

    // Проверяем, что отчет удален
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM "GpsReport"
      WHERE id = $1;
    `;

    const verifyResult = await pool.query(verifyQuery, [problemReportId]);
    const remainingCount = verifyResult.rows[0].count;

    if (remainingCount === '0') {
      console.log('✅ Подтверждение: отчет полностью удален из базы данных');
    } else {
      console.log('❌ ОШИБКА: отчет не был удален');
    }

    console.log('\n📋 Рекомендации:');
    console.log('1. Загрузите правильный GPS отчет для матча 04.08.2025 vs Вф');
    console.log('2. Убедитесь, что файл содержит все необходимые метрики');
    console.log('3. Проверьте маппинг игроков перед загрузкой');

  } catch (error) {
    console.error('❌ Ошибка при удалении отчета:', error);
  } finally {
    await pool.end();
  }
}

deleteProblemReport(); 