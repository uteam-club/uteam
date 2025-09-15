const { Client } = require('pg');
require('dotenv').config();

async function cleanupGpsData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Проверяем текущее состояние
    console.log('\n=== Текущее состояние GPS таблиц ===');
    const tables = ['GpsProfile', 'GpsReport', 'GpsColumnMapping', 'GpsPlayerMapping', 'GpsReportData'];
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`${table}: ${result.rows[0].count} записей`);
    }

    // Удаляем данные в правильном порядке
    console.log('\n=== Удаление GPS данных ===');
    
    console.log('Удаляем GpsReportData...');
    await client.query('DELETE FROM "GpsReportData" WHERE "gpsReportId" IN (SELECT id FROM "GpsReport")');
    
    console.log('Удаляем GpsPlayerMapping...');
    await client.query('DELETE FROM "GpsPlayerMapping" WHERE "gpsReportId" IN (SELECT id FROM "GpsReport")');
    
    console.log('Удаляем GpsColumnMapping...');
    await client.query('DELETE FROM "GpsColumnMapping" WHERE "gpsProfileId" IN (SELECT id FROM "GpsProfile")');
    
    console.log('Удаляем GpsReport...');
    await client.query('DELETE FROM "GpsReport"');
    
    console.log('Удаляем GpsProfile...');
    await client.query('DELETE FROM "GpsProfile"');

    // Проверяем результат
    console.log('\n=== Результат очистки ===');
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`${table}: ${result.rows[0].count} записей`);
    }

    console.log('\n✅ Очистка GPS данных завершена успешно!');

  } catch (error) {
    console.error('❌ Ошибка при очистке GPS данных:', error);
  } finally {
    await client.end();
  }
}

cleanupGpsData();
