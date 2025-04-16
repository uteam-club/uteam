// Прямое обновление PIN-кодов игроков через node-postgres
require('dotenv').config();
const { Pool } = require('pg');

// Создаем пул подключений с использованием переменной окружения
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Функция для генерации случайного 6-значного PIN-кода
const generatePinCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const updatePlayersWithPinCodes = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Начинаем обновление PIN-кодов для игроков...');
    
    // Добавляем колонку pinCode, если её нет
    await client.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS "pinCode" CHAR(6);`);
    console.log('Колонка pinCode успешно добавлена (или уже существует)');
    
    // Получаем всех игроков
    const { rows: players } = await client.query('SELECT id, "firstName", "lastName", "pinCode" FROM players');
    console.log(`Найдено ${players.length} игроков.`);
    
    // Начинаем транзакцию
    await client.query('BEGIN');
    
    // Для каждого игрока генерируем PIN-код, если он отсутствует
    let updatedCount = 0;
    
    for (const player of players) {
      if (player.pinCode) {
        console.log(`Игрок ${player.lastName} ${player.firstName} уже имеет PIN-код: ${player.pinCode}`);
        continue;
      }
      
      const pinCode = generatePinCode();
      
      // Обновляем PIN-код игрока
      await client.query(
        `UPDATE players SET "pinCode" = $1 WHERE id = $2`, 
        [pinCode, player.id]
      );
      
      console.log(`Игрок ${player.lastName} ${player.firstName} получил PIN-код: ${pinCode}`);
      updatedCount++;
    }
    
    // Завершаем транзакцию
    await client.query('COMMIT');
    
    console.log(`Обновление PIN-кодов завершено. Обновлено ${updatedCount} игроков.`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Произошла ошибка:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

// Запускаем скрипт
updatePlayersWithPinCodes(); 