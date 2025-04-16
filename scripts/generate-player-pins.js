// Скрипт для генерации PIN-кодов для существующих игроков
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const path = require('path');

const prisma = new PrismaClient();

// Функция для выполнения SQL скрипта
const executeSQL = (sqlFilePath) => {
  return new Promise((resolve, reject) => {
    console.log(`Выполняем SQL скрипт: ${sqlFilePath}`);
    
    // Получаем абсолютный путь к файлу
    const absolutePath = path.resolve(sqlFilePath);
    
    // Выполняем SQL с помощью Prisma $executeRaw
    const sql = require('fs').readFileSync(absolutePath, 'utf8');
    
    prisma.$executeRawUnsafe(sql)
      .then(() => {
        console.log('SQL скрипт успешно выполнен');
        resolve();
      })
      .catch((error) => {
        console.error('Ошибка выполнения SQL скрипта:', error);
        reject(error);
      });
  });
};

const generatePinCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generatePlayerPins = async () => {
  try {
    console.log('Начинаем обновление PIN-кодов для игроков...');
    
    // Сначала выполняем SQL скрипт для добавления колонки
    await executeSQL('./scripts/add-player-pin-code.sql');
    
    // Получаем всех игроков
    const players = await prisma.player.findMany();
    
    console.log(`Найдено ${players.length} игроков.`);
    
    if (players.length === 0) {
      console.log('Игроки не найдены в базе данных.');
      return;
    }
    
    // Обновляем PIN-коды только для тех игроков, у которых их еще нет
    const updates = [];
    
    for (const player of players) {
      // Пропускаем игроков, у которых уже есть PIN-код
      if (player.pinCode) {
        console.log(`Игрок ${player.lastName} ${player.firstName} уже имеет PIN-код: ${player.pinCode}`);
        continue;
      }
      
      const pinCode = generatePinCode();
      updates.push(
        prisma.player.update({
          where: { id: player.id },
          data: { pinCode },
        }).then(updatedPlayer => {
          console.log(`Обновлен PIN-код для ${updatedPlayer.lastName} ${updatedPlayer.firstName}: ${updatedPlayer.pinCode}`);
          return updatedPlayer;
        }).catch(error => {
          console.error(`Ошибка обновления PIN-кода для игрока ${player.lastName} ${player.firstName}:`, error.message);
          return null;
        })
      );
    }
    
    if (updates.length === 0) {
      console.log('Все игроки уже имеют PIN-коды. Ничего не требуется обновлять.');
      return;
    }
    
    // Выполняем все обновления параллельно
    const results = await Promise.all(updates);
    
    // Фильтруем успешные обновления
    const successfulUpdates = results.filter(result => result !== null);
    
    console.log(`Успешно обновлено ${successfulUpdates.length} из ${updates.length} игроков.`);
    
  } catch (error) {
    console.error('Ошибка при обновлении PIN-кодов:', error);
  } finally {
    await prisma.$disconnect();
  }
};

// Запускаем скрипт
generatePlayerPins(); 