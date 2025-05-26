// Скрипт для обновления строки подключения к базе данных (используя доменное имя)
const fs = require('fs');
const path = require('path');

// Путь к .env файлу
const envPath = path.join(process.cwd(), '.env');

// Создаем резервную копию .env файла
const backupPath = path.join(process.cwd(), '.env.backup-domain-' + Date.now());
fs.copyFileSync(envPath, backupPath);
console.log(`Создана резервная копия .env файла: ${backupPath}`);

// Читаем содержимое .env файла
let envContent = fs.readFileSync(envPath, 'utf-8');

// Заменяем строку подключения на правильную с доменным именем
const newConnectionString = 'DATABASE_URL="postgresql://postgres:Mell567234!@db.eprnjqohtlxxqufvofbr.supabase.co:5432/postgres"';

const currentConnectionStringRegex = /DATABASE_URL="postgresql:\/\/postgres:(.+?)@(.+?):5432\/postgres"/;
envContent = envContent.replace(currentConnectionStringRegex, newConnectionString);

// Записываем обновленное содержимое обратно в .env файл
fs.writeFileSync(envPath, envContent, 'utf-8');

console.log('Файл .env успешно обновлен с использованием доменного имени вместо IP-адреса');
console.log('Новая строка подключения: postgresql://postgres:***@db.eprnjqohtlxxqufvofbr.supabase.co:5432/postgres');
console.log('\nПерезапустите сервер разработки командой:');
console.log('rm -rf .next && npm run dev'); 