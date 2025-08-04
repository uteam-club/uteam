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

async function testCascadeDelete() {
  try {
    console.log('🧪 Тестируем каскадное удаление GPS отчетов...\n');

    // 1. Проверяем текущее количество GPS отчетов
    const initialCountQuery = 'SELECT COUNT(*) as count FROM "GpsReport"';
    const initialCountResult = await pool.query(initialCountQuery);
    const initialCount = parseInt(initialCountResult.rows[0].count);
    console.log(`📊 Начальное количество GPS отчетов: ${initialCount}`);

    // 2. Находим матч с GPS отчетом для тестирования
    const matchWithReportQuery = `
      SELECT 
        m.id as match_id,
        m."opponentName",
        gr.id as report_id,
        gr.name as report_name
      FROM "Match" m
      JOIN "GpsReport" gr ON gr."eventId" = m.id AND gr."eventType" = 'MATCH'
      LIMIT 1;
    `;
    
    const matchWithReportResult = await pool.query(matchWithReportQuery);
    
    if (matchWithReportResult.rows.length === 0) {
      console.log('❌ Не найдено матчей с GPS отчетами для тестирования');
      return;
    }

    const testMatch = matchWithReportResult.rows[0];
    console.log(`\n🎯 Тестируем удаление матча: ${testMatch.opponentName}`);
    console.log(`   Match ID: ${testMatch.match_id}`);
    console.log(`   Report ID: ${testMatch.report_id}`);
    console.log(`   Report Name: ${testMatch.report_name}`);

    // 3. Проверяем, что отчет существует перед удалением
    const reportExistsQuery = 'SELECT COUNT(*) as count FROM "GpsReport" WHERE id = $1';
    const reportExistsResult = await pool.query(reportExistsQuery, [testMatch.report_id]);
    const reportExists = parseInt(reportExistsResult.rows[0].count) > 0;
    console.log(`\n✅ Отчет существует перед удалением: ${reportExists}`);

    if (!reportExists) {
      console.log('❌ Отчет не найден, пропускаем тест');
      return;
    }

    // 4. Удаляем матч (должен сработать триггер)
    console.log('\n🗑️ Удаляем матч...');
    const deleteMatchQuery = 'DELETE FROM "Match" WHERE id = $1';
    await pool.query(deleteMatchQuery, [testMatch.match_id]);
    console.log('✅ Матч удален');

    // 5. Проверяем, что GPS отчет тоже удален
    const reportAfterDeleteResult = await pool.query(reportExistsQuery, [testMatch.report_id]);
    const reportAfterDelete = parseInt(reportAfterDeleteResult.rows[0].count) > 0;
    console.log(`\n🔍 Отчет существует после удаления матча: ${reportAfterDelete}`);

    if (reportAfterDelete) {
      console.log('❌ ОШИБКА: GPS отчет не был удален автоматически!');
    } else {
      console.log('✅ УСПЕХ: GPS отчет был автоматически удален!');
    }

    // 6. Проверяем общее количество отчетов
    const finalCountResult = await pool.query(initialCountQuery);
    const finalCount = parseInt(finalCountResult.rows[0].count);
    console.log(`\n📊 Финальное количество GPS отчетов: ${finalCount}`);
    console.log(`📉 Удалено отчетов: ${initialCount - finalCount}`);

    // 7. Тестируем удаление тренировки
    console.log('\n🧪 Тестируем удаление тренировки...');
    
    const trainingWithReportQuery = `
      SELECT 
        t.id as training_id,
        t.title as training_title,
        gr.id as report_id,
        gr.name as report_name
      FROM "Training" t
      JOIN "GpsReport" gr ON gr."eventId" = t.id AND gr."eventType" = 'TRAINING'
      LIMIT 1;
    `;
    
    const trainingWithReportResult = await pool.query(trainingWithReportQuery);
    
    if (trainingWithReportResult.rows.length === 0) {
      console.log('❌ Не найдено тренировок с GPS отчетами для тестирования');
    } else {
      const testTraining = trainingWithReportResult.rows[0];
      console.log(`\n🎯 Тестируем удаление тренировки: ${testTraining.training_title}`);
      console.log(`   Training ID: ${testTraining.training_id}`);
      console.log(`   Report ID: ${testTraining.report_id}`);
      console.log(`   Report Name: ${testTraining.report_name}`);

      // Проверяем, что отчет существует
      const trainingReportExistsResult = await pool.query(reportExistsQuery, [testTraining.report_id]);
      const trainingReportExists = parseInt(trainingReportExistsResult.rows[0].count) > 0;
      console.log(`\n✅ Отчет тренировки существует перед удалением: ${trainingReportExists}`);

      if (trainingReportExists) {
        // Удаляем тренировку
        console.log('\n🗑️ Удаляем тренировку...');
        const deleteTrainingQuery = 'DELETE FROM "Training" WHERE id = $1';
        await pool.query(deleteTrainingQuery, [testTraining.training_id]);
        console.log('✅ Тренировка удалена');

        // Проверяем, что GPS отчет тоже удален
        const trainingReportAfterDeleteResult = await pool.query(reportExistsQuery, [testTraining.report_id]);
        const trainingReportAfterDelete = parseInt(trainingReportAfterDeleteResult.rows[0].count) > 0;
        console.log(`\n🔍 Отчет тренировки существует после удаления: ${trainingReportAfterDelete}`);

        if (trainingReportAfterDelete) {
          console.log('❌ ОШИБКА: GPS отчет тренировки не был удален автоматически!');
        } else {
          console.log('✅ УСПЕХ: GPS отчет тренировки был автоматически удален!');
        }
      }
    }

    console.log('\n🎉 Тестирование завершено!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await pool.end();
  }
}

testCascadeDelete(); 