// Скрипт для генерации PIN-кодов для существующих игроков напрямую через SQL
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Функция для генерации случайного 6-значного PIN-кода
const generatePinCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Функция для выполнения SQL запроса
const executeSQL = async (sql, params = []) => {
  try {
    return await prisma.$executeRawUnsafe(sql, ...params);
  } catch (error) {
    console.error('Ошибка выполнения SQL запроса:', error);
    throw error;
  }
};

const generatePinCodesForPlayers = async () => {
  try {
    console.log('Начинаем обновление PIN-кодов для игроков...');
    
    // Сначала выполняем SQL скрипт для добавления колонки
    const addColumnSQL = fs.readFileSync(
      path.resolve('./scripts/add-player-pin-code.sql'), 
      'utf8'
    );
    
    await executeSQL(addColumnSQL);
    console.log('SQL скрипт для добавления колонки успешно выполнен');
    
    // Получаем всех игроков
    const players = await prisma.player.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });
    
    console.log(`Найдено ${players.length} игроков.`);
    
    if (players.length === 0) {
      console.log('Игроки не найдены в базе данных.');
      return;
    }
    
    // Обновляем PIN-коды для каждого игрока напрямую через SQL
    let successCount = 0;
    
    for (const player of players) {
      try {
        const pinCode = generatePinCode();
        
        // Напрямую обновляем PIN-код в базе данных
        await executeSQL(
          `UPDATE players SET "pinCode" = $1 WHERE id = $2`, 
          [pinCode, player.id]
        );
        
        console.log(`Обновлен PIN-код для ${player.lastName} ${player.firstName}: ${pinCode}`);
        successCount++;
      } catch (error) {
        console.error(`Ошибка обновления PIN-кода для игрока ${player.lastName} ${player.firstName}:`, error.message);
      }
    }
    
    console.log(`Успешно обновлено ${successCount} из ${players.length} игроков.`);
    
  } catch (error) {
    console.error('Ошибка при обновлении PIN-кодов:', error);
  } finally {
    await prisma.$disconnect();
  }
};

// Запускаем скрипт
generatePinCodesForPlayers(); 