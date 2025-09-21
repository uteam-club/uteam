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

async function checkOrphanedReports() {
  try {
    console.log('🔍 Проверяем базу данных на наличие сиротных GPS отчетов...\n');

    // 1. Проверяем GPS отчеты, ссылающиеся на несуществующие матчи
    console.log('📊 ПРОВЕРКА GPS ОТЧЕТОВ МАТЧЕЙ:');
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
    console.log(`\n📋 Найдено сиротных отчетов матчей: ${orphanedMatchReportsResult.rows.length}`);

    if (orphanedMatchReportsResult.rows.length > 0) {
      console.log('\n❌ СИРОТСКИЕ ОТЧЕТЫ МАТЧЕЙ:');
      orphanedMatchReportsResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.name}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Event ID: ${row.eventId}`);
        console.log(`   Club: ${row.club_name}`);
        console.log(`   Created: ${new Date(row.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('✅ Сиротных отчетов матчей не найдено');
    }

    // 2. Проверяем GPS отчеты, ссылающиеся на несуществующие тренировки
    console.log('\n📊 ПРОВЕРКА GPS ОТЧЕТОВ ТРЕНИРОВОК:');
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
    console.log(`\n📋 Найдено сиротных отчетов тренировок: ${orphanedTrainingReportsResult.rows.length}`);

    if (orphanedTrainingReportsResult.rows.length > 0) {
      console.log('\n❌ СИРОТСКИЕ ОТЧЕТЫ ТРЕНИРОВОК:');
      orphanedTrainingReportsResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.name}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Event ID: ${row.eventId}`);
        console.log(`   Club: ${row.club_name}`);
        console.log(`   Created: ${new Date(row.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('✅ Сиротных отчетов тренировок не найдено');
    }

    // 3. Общая статистика
    const totalOrphaned = orphanedMatchReportsResult.rows.length + orphanedTrainingReportsResult.rows.length;
    console.log(`\n📊 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`   Всего сиротных отчетов: ${totalOrphaned}`);
    console.log(`   Сиротных отчетов матчей: ${orphanedMatchReportsResult.rows.length}`);
    console.log(`   Сиротных отчетов тренировок: ${orphanedTrainingReportsResult.rows.length}`);

    // 4. Проверяем общее количество GPS отчетов
    const totalReportsQuery = 'SELECT COUNT(*) as count FROM "GpsReport"';
    const totalReportsResult = await pool.query(totalReportsQuery);
    const totalReports = parseInt(totalReportsResult.rows[0].count);
    
    console.log(`\n📈 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:`);
    console.log(`   Общее количество GPS отчетов: ${totalReports}`);
    console.log(`   Процент сиротных отчетов: ${totalOrphaned > 0 ? ((totalOrphaned / totalReports) * 100).toFixed(2) : 0}%`);

    // 5. Если найдены сиротные отчеты, предлагаем их удалить
    if (totalOrphaned > 0) {
      console.log(`\n⚠️  РЕКОМЕНДАЦИИ:`);
      console.log(`   Найдено ${totalOrphaned} сиротных отчетов, которые можно безопасно удалить.`);
      console.log(`   Для удаления используйте скрипт: node scripts/cleanup-orphaned-reports.cjs`);
    } else {
      console.log(`\n✅ РЕЗУЛЬТАТ:`);
      console.log(`   База данных чистая - сиротных отчетов не найдено!`);
      console.log(`   Каскадное удаление работает корректно.`);
    }

    // 6. Проверяем отчеты с некорректными eventType
    console.log('\n🔍 ПРОВЕРКА НЕКОРРЕКТНЫХ EVENT_TYPE:');
    const invalidEventTypeQuery = `
      SELECT 
        gr.id,
        gr.name,
        gr."eventId",
        gr."eventType",
        gr."clubId",
        gr."createdAt",
        c.name as club_name
      FROM "GpsReport" gr
      JOIN "Club" c ON gr."clubId" = c.id
      WHERE gr."eventType" NOT IN ('MATCH', 'TRAINING')
      ORDER BY gr."createdAt" DESC;
    `;

    const invalidEventTypeResult = await pool.query(invalidEventTypeQuery);
    console.log(`\n📋 Найдено отчетов с некорректными eventType: ${invalidEventTypeResult.rows.length}`);

    if (invalidEventTypeResult.rows.length > 0) {
      console.log('\n⚠️  ОТЧЕТЫ С НЕКОРРЕКТНЫМИ EVENT_TYPE:');
      invalidEventTypeResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.name}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Event ID: ${row.eventId}`);
        console.log(`   Event Type: ${row.eventType}`);
        console.log(`   Club: ${row.club_name}`);
        console.log(`   Created: ${new Date(row.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('✅ Все отчеты имеют корректные eventType');
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке сиротных отчетов:', error);
  } finally {
    await pool.end();
  }
}

checkOrphanedReports(); 