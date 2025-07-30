const { Pool } = require('pg');

// Конфигурация базы данных (замените на ваши данные)
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'uteam',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
});

async function checkGpsReports() {
  try {
    console.log('🔍 Проверяем GPS отчеты в базе данных...\n');

    // Общая статистика
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN "eventType" = 'TRAINING' THEN 1 END) as training_reports,
        COUNT(CASE WHEN "eventType" = 'MATCH' THEN 1 END) as match_reports,
        COUNT(CASE WHEN "isProcessed" = true THEN 1 END) as processed_reports,
        COUNT(CASE WHEN "isProcessed" = false THEN 1 END) as unprocessed_reports
      FROM "GpsReport"
    `);

    const stats = statsResult.rows[0];
    console.log('📊 Общая статистика:');
    console.log(`   Всего отчетов: ${stats.total_reports}`);
    console.log(`   Тренировок: ${stats.training_reports}`);
    console.log(`   Матчей: ${stats.match_reports}`);
    console.log(`   Обработано: ${stats.processed_reports}`);
    console.log(`   Не обработано: ${stats.unprocessed_reports}\n`);

    if (stats.total_reports === 0) {
      console.log('❌ GPS отчеты не найдены в базе данных');
      return;
    }

    // Детальная информация о всех отчетах
    const reportsResult = await pool.query(`
      SELECT 
        gr."id",
        gr."name",
        gr."fileName",
        gr."eventType",
        gr."createdAt",
        gr."updatedAt",
        gr."isProcessed",
        tm."name" as team_name,
        CASE 
          WHEN gr."eventType" = 'TRAINING' THEN t."title"
          WHEN gr."eventType" = 'MATCH' THEN CONCAT(m."opponentName", ' (', m."teamGoals", ':', m."opponentGoals", ')')
          ELSE 'Unknown'
        END as event_info,
        CASE 
          WHEN gr."eventType" = 'TRAINING' THEN t."date"
          WHEN gr."eventType" = 'MATCH' THEN m."date"
          ELSE NULL
        END as event_date
      FROM "GpsReport" gr
      LEFT JOIN "Team" tm ON gr."teamId" = tm."id"
      LEFT JOIN "Training" t ON gr."eventId" = t."id" AND gr."eventType" = 'TRAINING'
      LEFT JOIN "Match" m ON gr."eventId" = m."id" AND gr."eventType" = 'MATCH'
      ORDER BY gr."createdAt" DESC
    `);

    console.log('📋 Детальная информация о GPS отчетах:');
    console.log('─'.repeat(120));
    
    reportsResult.rows.forEach((row, index) => {
      const date = new Date(row.createdAt).toLocaleDateString('ru-RU');
      const eventDate = row.event_date ? new Date(row.event_date).toLocaleDateString('ru-RU') : 'N/A';
      const status = row.isProcessed ? '✅' : '⏳';
      
      console.log(`${index + 1}. ${status} ${row.name}`);
      console.log(`   Файл: ${row.fileName}`);
      console.log(`   Тип: ${row.eventType === 'TRAINING' ? 'Тренировка' : 'Матч'}`);
      console.log(`   Команда: ${row.team_name || 'N/A'}`);
      console.log(`   Событие: ${row.event_info || 'N/A'}`);
      console.log(`   Дата события: ${eventDate}`);
      console.log(`   Загружен: ${date}`);
      console.log('');
    });

    // Отчеты по месяцам
    const monthlyResult = await pool.query(`
      SELECT 
        DATE_TRUNC('month', gr."createdAt") as month,
        COUNT(*) as reports_count,
        COUNT(CASE WHEN "eventType" = 'TRAINING' THEN 1 END) as training_count,
        COUNT(CASE WHEN "eventType" = 'MATCH' THEN 1 END) as match_count
      FROM "GpsReport" gr
      GROUP BY DATE_TRUNC('month', gr."createdAt")
      ORDER BY month DESC
    `);

    console.log('📅 Отчеты по месяцам:');
    console.log('─'.repeat(50));
    
    monthlyResult.rows.forEach(row => {
      const month = new Date(row.month).toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: 'long' 
      });
      console.log(`${month}: ${row.reports_count} отчетов (${row.training_count} тренировок, ${row.match_count} матчей)`);
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке GPS отчетов:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkGpsReports(); 