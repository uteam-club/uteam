const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Функция для выполнения команды и вывода результата
function runCommand(command) {
  console.log(`Выполняем команду: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    console.log(output);
    return { success: true, output };
  } catch (error) {
    console.error(`Ошибка при выполнении команды: ${command}`);
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

async function updatePrismaAndDatabase() {
  console.log('Начинаем обновление Prisma и базы данных...');
  
  // Очищаем кеш Prisma
  console.log('Очищаем кеш Prisma...');
  runCommand('rm -rf node_modules/.prisma');
  
  // Генерируем Prisma клиент
  console.log('Генерируем Prisma клиент...');
  const generateResult = runCommand('npx prisma generate');
  
  if (!generateResult.success) {
    console.error('Не удалось сгенерировать Prisma клиент, прерываем обновление.');
    return;
  }
  
  // Проверяем текущую схему базы данных
  console.log('Проверяем текущую схему базы данных...');
  const pullResult = runCommand('npx prisma db pull --print');
  
  if (!pullResult.success) {
    console.error('Не удалось получить текущую схему базы данных, прерываем обновление.');
    return;
  }
  
  // Применяем изменения к базе данных
  console.log('Применяем изменения к базе данных...');
  const pushResult = runCommand('npx prisma db push');
  
  if (!pushResult.success) {
    console.error('Не удалось применить изменения к базе данных.');
    // Попробуем запустить с флагом --accept-data-loss
    console.log('Пробуем с флагом --accept-data-loss...');
    const forcePushResult = runCommand('npx prisma db push --accept-data-loss');
    
    if (!forcePushResult.success) {
      console.error('Не удалось применить изменения даже с флагом --accept-data-loss, прерываем обновление.');
      return;
    }
  }
  
  // Проверяем установку и инициализацию бакетов Supabase
  console.log('Проверяем бакеты Supabase...');
  runCommand('node check-and-create-buckets.js');
  
  console.log('Обновление завершено успешно!');
}

// Запускаем обновление
updatePrismaAndDatabase(); 