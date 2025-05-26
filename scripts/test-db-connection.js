// Скрипт для проверки соединения с базой данных
require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  console.log('Проверка соединения с базой данных...');
  const originalUrl = process.env.DATABASE_URL;
  console.log('Оригинальный URL:', originalUrl.replace(/\/\/(.+?):(.+?)@/, '//***:***@'));
  
  // Создаем URL подключения через IPv4
  const ipv4Url = 'postgresql://postgres:password@56.228.58.37:5432/postgres';
  console.log('IPv4 URL:', ipv4Url.replace(/\/\/(.+?):(.+?)@/, '//***:***@'));
  
  // Пробуем подключиться через IPv4
  const client = new Client({
    connectionString: ipv4Url,
  });

  try {
    console.log('Пытаемся подключиться через IPv4...');
    await client.connect();
    console.log('Подключение успешно установлено!');
    
    const res = await client.query('SELECT current_database() as db, current_user as user');
    console.log('Текущая база данных:', res.rows[0].db);
    console.log('Текущий пользователь:', res.rows[0].user);
    
    console.log('\nПроверка сетевых настроек:');
    const ipRes = await client.query('SELECT inet_server_addr() as server_ip, inet_client_addr() as client_ip');
    if (ipRes.rows[0].server_ip) {
      console.log('IP сервера:', ipRes.rows[0].server_ip);
    } else {
      console.log('Не удалось получить IP сервера');
    }
    
    if (ipRes.rows[0].client_ip) {
      console.log('IP клиента:', ipRes.rows[0].client_ip);
    } else {
      console.log('Не удалось получить IP клиента');
    }
    
    console.log('\nПроверка таблиц в базе данных:');
    const tablesRes = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
      LIMIT 10
    `);
    
    if (tablesRes.rows.length > 0) {
      console.log('Найдены таблицы:');
      tablesRes.rows.forEach(row => console.log('- ' + row.tablename));
    } else {
      console.log('Таблицы не найдены');
    }
  } catch (err) {
    console.error('Ошибка подключения через IPv4:', err.message);
    console.log('\nПробуем альтернативные варианты...');
    
    // Попробуем другие комбинации учетных данных
    const alternatives = [
      { user: 'postgres', password: process.env.POSTGRES_PASSWORD || 'postgres' },
      { user: 'supabase_admin', password: 'postgres' },
      { user: 'postgres', password: 'postgres' },
      { user: 'postgres', password: '' }
    ];
    
    for (const alt of alternatives) {
      try {
        console.log(`\nПробуем подключиться с пользователем ${alt.user}...`);
        const altClient = new Client({
          host: '56.228.58.37',
          port: 5432,
          database: 'postgres',
          user: alt.user,
          password: alt.password
        });
        
        await altClient.connect();
        console.log(`Подключение успешно с пользователем ${alt.user}!`);
        
        const dbInfo = await altClient.query('SELECT current_database() as db');
        console.log('Текущая база данных:', dbInfo.rows[0].db);
        
        await altClient.end();
        break;
      } catch (e) {
        console.error(`Ошибка с пользователем ${alt.user}:`, e.message);
      }
    }
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Игнорируем ошибку закрытия соединения
    }
    console.log('Тест подключения завершен');
  }
}

testConnection(); 