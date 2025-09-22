const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

async function testConnection() {
  try {
    console.log('🔌 Тестируем подключение к БД...');
    const client = await pool.connect();
    
    // Проверяем таблицы GPS разрешений
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'Gps%Permission%'
      ORDER BY table_name;
    `);
    
    console.log('📋 Найденные таблицы GPS разрешений:');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    
    // Проверяем количество записей
    const countResult = await client.query('SELECT COUNT(*) FROM "GpsPermission"');
    console.log(`\n📊 Количество GPS разрешений: ${countResult.rows[0].count}`);
    
    client.release();
    await pool.end();
    
    console.log('✅ Подключение работает корректно');
    
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    process.exit(1);
  }
}

testConnection();
