// Скрипт для исправления подключения к PostgreSQL
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Функция для создания резервной копии .env файла
function backupEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const backupPath = path.join(process.cwd(), '.env.backup-fix-' + Date.now());
  
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, backupPath);
    console.log(`Создана резервная копия .env → ${backupPath}`);
    return true;
  } else {
    console.error('Файл .env не найден!');
    return false;
  }
}

// Функция для обновления .env файла с новой строкой подключения
function updateEnvFile(newConnectionString) {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('Файл .env не найден!');
    return false;
  }
  
  // Читаем содержимое .env файла
  let envContent = fs.readFileSync(envPath, 'utf-8');
  
  // Заменяем строку подключения
  const currentConnectionStringRegex = /DATABASE_URL="postgresql:\/\/postgres:(.+?)@(.+?)(:5432)?\/postgres"/;
  envContent = envContent.replace(currentConnectionStringRegex, `DATABASE_URL="${newConnectionString}"`);
  
  // Записываем обновленное содержимое обратно в .env файл
  fs.writeFileSync(envPath, envContent, 'utf-8');
  
  console.log('Файл .env обновлен с новой строкой подключения');
  console.log('Новая строка подключения:', newConnectionString.replace(/\/\/(.+?):(.+?)@/, '//***:***@'));
  return true;
}

// Функция для тестирования подключения к базе данных
async function testConnection(connectionString, label) {
  console.log(`\nТестирование ${label}...`);
  console.log('URL:', connectionString.replace(/\/\/(.+?):(.+?)@/, '//***:***@'));
  
  const client = new Client({
    connectionString: connectionString,
  });
  
  try {
    await client.connect();
    console.log(`✅ ${label}: Подключение успешно установлено!`);
    
    const res = await client.query('SELECT current_database() as db, current_user as user');
    console.log('Текущая база данных:', res.rows[0].db);
    console.log('Текущий пользователь:', res.rows[0].user);
    
    await client.end();
    return true;
  } catch (err) {
    console.error(`❌ ${label}: Ошибка подключения:`, err.message);
    try {
      await client.end();
    } catch (e) {
      // Игнорируем ошибку закрытия соединения
    }
    return false;
  }
}

// Основная функция для тестирования различных вариантов подключения
async function testVariants() {
  console.log('Тестирование вариантов подключения к PostgreSQL...');
  
  // Получаем текущую строку подключения
  const currentConnectionString = process.env.DATABASE_URL;
  console.log('Текущая строка подключения:', currentConnectionString.replace(/\/\/(.+?):(.+?)@/, '//***:***@'));
  
  // Создаем резервную копию .env файла перед изменениями
  backupEnvFile();
  
  // Варианты строк подключения для тестирования
  const variants = [
    // Оригинальный вариант с доменным именем
    {
      label: 'Доменное имя (оригинал)',
      url: 'postgresql://postgres:Mell567234!@db.eprnjqohtlxxqufvofbr.supabase.co:5432/postgres'
    },
    // IPv4 вариант с прямым IP-адресом
    {
      label: 'Прямой IPv4',
      url: 'postgresql://postgres:Mell567234!@56.228.58.37:5432/postgres'
    },
    // Вариант без указания порта
    {
      label: 'Доменное имя без порта',
      url: 'postgresql://postgres:Mell567234!@db.eprnjqohtlxxqufvofbr.supabase.co/postgres'
    },
    // Вариант с SSL
    {
      label: 'Доменное имя с SSL параметром',
      url: 'postgresql://postgres:Mell567234!@db.eprnjqohtlxxqufvofbr.supabase.co:5432/postgres?sslmode=require'
    }
  ];
  
  let successfulVariant = null;
  
  // Тестируем все варианты
  for (const variant of variants) {
    const success = await testConnection(variant.url, variant.label);
    if (success) {
      successfulVariant = variant;
      break;
    }
  }
  
  // Если нашли работающий вариант, обновляем .env файл
  if (successfulVariant) {
    console.log(`\n✅ Найден работающий вариант: ${successfulVariant.label}`);
    updateEnvFile(successfulVariant.url);
    console.log('\nРекомендации:');
    console.log('1. Перезапустите сервер разработки: rm -rf .next && npm run dev');
    console.log('2. Проверьте работу приложения через веб-браузер');
  } else {
    console.log('\n❌ Не удалось найти работающий вариант подключения');
    console.log('\nРекомендации:');
    console.log('1. Проверьте настройки брандмауэра');
    console.log('2. Проверьте, что ваш IP добавлен в список разрешенных в Supabase');
    console.log('3. Проверьте правильность пароля в панели управления Supabase');
    console.log('4. Возможно, вам нужно использовать VPN или другое сетевое соединение');
  }
}

// Запускаем тестирование
testVariants().catch(err => {
  console.error('Ошибка выполнения скрипта:', err);
}); 