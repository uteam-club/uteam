// Скрипт для проверки соединения с базой данных через доменное имя
require('dotenv').config();
const { Client } = require('pg');

async function testDomainConnection() {
  console.log('Проверка соединения с базой данных через доменное имя...');
  console.log('URL:', process.env.DATABASE_URL.replace(/\/\/(.+?):(.+?)@/, '//***:***@'));
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Пытаемся подключиться...');
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
    
    console.log('\nПодключение к базе данных работает корректно!');
    console.log('Можно перезапустить сервер разработки:');
    console.log('rm -rf .next && npm run dev');
    
  } catch (err) {
    console.error('Ошибка подключения:', err.message);
    console.log('\nВозможные причины:');
    console.log('1. Неправильный пароль');
    console.log('2. Ваш IP-адрес не добавлен в список разрешенных в Supabase');
    console.log('3. Проблемы с сетевым подключением');
    
    console.log('\nРешения:');
    console.log('1. Проверьте пароль в панели управления Supabase');
    console.log('2. Добавьте ваш IP-адрес в список разрешенных в Project Settings -> Database -> Network Restrictions');
    console.log('3. Убедитесь, что брандмауэр не блокирует соединение');
  } finally {
    await client.end();
    console.log('\nТест подключения завершен');
  }
}

testDomainConnection(); 