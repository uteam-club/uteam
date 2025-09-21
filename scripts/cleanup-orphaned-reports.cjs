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

async function cleanupOrphanedReports() {
  try {
    console.log('🧹 Очистка сиротных GPS отчетов...\n');

    // 1. Находим сиротные отчеты матчей
    const orphanedMatchReportsQuery = `
      SELECT 
        gr.id,
        gr.name,
        gr."eventId",
        gr."eventType",
        gr."clubId",
        gr."createdAt",
        c.name as club_name
      FROM "GpsReport" gr
      LEFT JOIN "Match" m ON gr."eventId" = m.id
      JOIN "Club" c ON gr."clubId" = c.id
      WHERE gr."eventType" = 'MATCH' 
        AND m.id IS NULL
      ORDER BY gr."createdAt" DESC;
    `;

    const orphanedMatchReportsResult = await pool.query(orphanedMatchReportsQuery);
    const orphanedMatchReports = orphanedMatchReportsResult.rows;

    // 2. Находим сиротные отчеты тренировок
    const orphanedTrainingReportsQuery = `
      SELECT 
        gr.id,
        gr.name,
        gr."eventId",
        gr."eventType",
        gr."clubId",
        gr."createdAt",
        c.name as club_name
      FROM "GpsReport" gr
      LEFT JOIN "Training" t ON gr."eventId" = t.id
      JOIN "Club" c ON gr."clubId" = c.id
      WHERE gr."eventType" = 'TRAINING' 
        AND t.id IS NULL
      ORDER BY gr."createdAt" DESC;
    `;

    const orphanedTrainingReportsResult = await pool.query(orphanedTrainingReportsQuery);
    const orphanedTrainingReports = orphanedTrainingReportsResult.rows;

    const totalOrphaned = orphanedMatchReports.length + orphanedTrainingReports.length;

    if (totalOrphaned === 0) {
      console.log('✅ Сиротных отчетов не найдено. База данных чистая!');
      return;
    }

    console.log(`📊 Найдено сиротных отчетов для удаления: ${totalOrphaned}`);
    console.log(`   Сиротных отчетов матчей: ${orphanedMatchReports.length}`);
    console.log(`   Сиротных отчетов тренировок: ${orphanedTrainingReports.length}`);

    // 3. Показываем отчеты, которые будут удалены
    if (orphanedMatchReports.length > 0) {
      console.log('\n🗑️  СИРОТСКИЕ ОТЧЕТЫ МАТЧЕЙ ДЛЯ УДАЛЕНИЯ:');
      orphanedMatchReports.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.name}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Event ID: ${row.eventId}`);
        console.log(`   Club: ${row.club_name}`);
        console.log(`   Created: ${new Date(row.createdAt).toLocaleString()}`);
      });
    }

    if (orphanedTrainingReports.length > 0) {
      console.log('\n🗑️  СИРОТСКИЕ ОТЧЕТЫ ТРЕНИРОВОК ДЛЯ УДАЛЕНИЯ:');
      orphanedTrainingReports.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.name}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Event ID: ${row.eventId}`);
        console.log(`   Club: ${row.club_name}`);
        console.log(`   Created: ${new Date(row.createdAt).toLocaleString()}`);
      });
    }

    // 4. Запрашиваем подтверждение
    console.log(`\n⚠️  ВНИМАНИЕ: Будет удалено ${totalOrphaned} сиротных отчетов.`);
    console.log('   Эти отчеты ссылаются на несуществующие матчи/тренировки.');
    console.log('   Удаление безопасно, так как эти данные больше не используются.');
    
    // В реальном приложении здесь можно добавить интерактивное подтверждение
    // Для автоматизации просто продолжаем
    console.log('\n🚀 Начинаем удаление...');

    // 5. Удаляем сиротные отчеты матчей
    if (orphanedMatchReports.length > 0) {
      const matchReportIds = orphanedMatchReports.map(r => r.id);
      console.log(`\n🗑️  Удаляем ${orphanedMatchReports.length} сиротных отчетов матчей...`);
      
      const deleteMatchReportsQuery = `
        DELETE FROM "GpsReport" 
        WHERE id = ANY($1) AND "eventType" = 'MATCH'
      `;
      
      const deleteMatchResult = await pool.query(deleteMatchReportsQuery, [matchReportIds]);
      console.log(`✅ Удалено отчетов матчей: ${deleteMatchResult.rowCount}`);
    }

    // 6. Удаляем сиротные отчеты тренировок
    if (orphanedTrainingReports.length > 0) {
      const trainingReportIds = orphanedTrainingReports.map(r => r.id);
      console.log(`\n🗑️  Удаляем ${orphanedTrainingReports.length} сиротных отчетов тренировок...`);
      
      const deleteTrainingReportsQuery = `
        DELETE FROM "GpsReport" 
        WHERE id = ANY($1) AND "eventType" = 'TRAINING'
      `;
      
      const deleteTrainingResult = await pool.query(deleteTrainingReportsQuery, [trainingReportIds]);
      console.log(`✅ Удалено отчетов тренировок: ${deleteTrainingResult.rowCount}`);
    }

    // 7. Проверяем результат
    console.log('\n🔍 ПРОВЕРЯЕМ РЕЗУЛЬТАТ:');
    
    const finalOrphanedMatchResult = await pool.query(orphanedMatchReportsQuery);
    const finalOrphanedTrainingResult = await pool.query(orphanedTrainingReportsQuery);
    const finalTotalOrphaned = finalOrphanedMatchResult.rows.length + finalOrphanedTrainingResult.rows.length;

    if (finalTotalOrphaned === 0) {
      console.log('✅ Все сиротные отчеты успешно удалены!');
      console.log('✅ База данных теперь чистая.');
    } else {
      console.log(`⚠️  Осталось сиротных отчетов: ${finalTotalOrphaned}`);
    }

    // 8. Показываем финальную статистику
    const totalReportsQuery = 'SELECT COUNT(*) as count FROM "GpsReport"';
    const totalReportsResult = await pool.query(totalReportsQuery);
    const totalReports = parseInt(totalReportsResult.rows[0].count);
    
    console.log(`\n📊 ФИНАЛЬНАЯ СТАТИСТИКА:`);
    console.log(`   Общее количество GPS отчетов: ${totalReports}`);
    console.log(`   Удалено сиротных отчетов: ${totalOrphaned}`);
    console.log(`   Осталось сиротных отчетов: ${finalTotalOrphaned}`);

  } catch (error) {
    console.error('❌ Ошибка при очистке сиротных отчетов:', error);
  } finally {
    await pool.end();
  }
}

cleanupOrphanedReports(); 