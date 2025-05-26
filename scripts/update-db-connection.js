// Скрипт для обновления строки подключения к базе данных
const fs = require('fs');
const path = require('path');

// Путь к .env файлу
const envPath = path.join(process.cwd(), '.env');

// Создаем резервную копию .env файла
const backupPath = path.join(process.cwd(), '.env.backup-' + Date.now());
fs.copyFileSync(envPath, backupPath);
console.log(`Создана резервная копия .env файла: ${backupPath}`);

// Читаем содержимое .env файла
let envContent = fs.readFileSync(envPath, 'utf-8');

// Заменяем строку подключения на правильную с прямым IPv4-подключением
const currentConnectionStringRegex = /DATABASE_URL="postgresql:\/\/postgres:(.+?)@(.+?):5432\/postgres"/;
const newConnectionString = 'DATABASE_URL="postgresql://postgres:Mell567234!@56.228.58.37:5432/postgres"';

envContent = envContent.replace(currentConnectionStringRegex, newConnectionString);

// Записываем обновленное содержимое обратно в .env файл
fs.writeFileSync(envPath, envContent, 'utf-8');

console.log('Файл .env успешно обновлен с правильными учетными данными для прямого IPv4-подключения');
console.log('Новая строка подключения: postgresql://postgres:***@56.228.58.37:5432/postgres');
console.log('\nПерезапустите сервер разработки командой:');
console.log('rm -rf .next && npm run dev'); 