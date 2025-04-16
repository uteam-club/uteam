// Скрипт для генерации PIN-кодов для игроков
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');

const prisma = new PrismaClient();

// Функция для выполнения SQL команды в командной строке
const execSQL = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Ошибка: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
};

// Функция для генерации случайного 6-значного PIN-кода
const generatePinCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Основная функция
const updatePlayersWithPinCodes = async () => {
  try {
    console.log('Обновление игроков с PIN-кодами...');
    
    // Сначала добавляем колонку через прямую SQL команду
    await execSQL(`echo "ALTER TABLE players ADD COLUMN IF NOT EXISTS \\"pinCode\\" CHAR(6);" | psql "$DATABASE_URL"`);
    
    // Получаем всех игроков
    const players = await prisma.player.findMany();
    console.log(`Найдено ${players.length} игроков.`);
    
    // Для каждого игрока генерируем PIN-код
    for (const player of players) {
      // Пропускаем игроков с существующими PIN-кодами
      if (player.pinCode) {
        console.log(`Игрок ${player.lastName} ${player.firstName} уже имеет PIN-код: ${player.pinCode}`);
        continue;
      }
      
      const pinCode = generatePinCode();
      
      // Обновляем PIN-код через SQL
      const updateCmd = `echo "UPDATE players SET \\"pinCode\\" = '${pinCode}' WHERE id = '${player.id}';" | psql "$DATABASE_URL"`;
      await execSQL(updateCmd);
      
      console.log(`Игрок ${player.lastName} ${player.firstName} получил PIN-код: ${pinCode}`);
    }
    
    console.log('Обновление PIN-кодов завершено.');
    
  } catch (error) {
    console.error('Произошла ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
};

// Запускаем скрипт
updatePlayersWithPinCodes(); 