const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restorePlayers() {
  console.log('Начинаю восстановление игроков...');
  
  const backupDir = path.join(__dirname, '../backup');
  
  if (!fs.existsSync(path.join(backupDir, 'players.json'))) {
    console.error('Файл с данными игроков не найден!');
    return;
  }
  
  const players = JSON.parse(fs.readFileSync(path.join(backupDir, 'players.json'), 'utf8'));
  
  console.log(`Найдено ${players.length} игроков для восстановления`);
  
  // Удаляем существующих игроков
  try {
    console.log('Удаляю существующие записи в таблице игроков...');
    await prisma.player.deleteMany({});
    console.log('Существующие игроки успешно удалены');
  } catch (error) {
    console.error('Ошибка при очистке таблицы игроков:', error.message);
    console.log('Продолжаем восстановление без очистки...');
  }
  
  let restored = 0;
  
  for (const player of players) {
    try {
      // Проверяем наличие обязательных полей
      if (!player.firstName || !player.lastName || !player.teamId) {
        console.error(`Пропускаю игрока ${player.id}: отсутствуют обязательные поля`);
        continue;
      }
      
      console.log(`Восстанавливаю игрока: ${player.firstName} ${player.lastName} (${player.id})`);
      
      // Создаем игрока с минимальным набором обязательных полей
      const playerData = {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        teamId: player.teamId,
        pinCode: player.pinCode || '000000', // Устанавливаем дефолтный пин-код если отсутствует
        middleName: player.middleName || null,
        number: player.number || null,
        position: player.position || null,
        strongFoot: player.strongFoot || null,
        dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth) : null,
        academyJoinDate: player.academyJoinDate ? new Date(player.academyJoinDate) : null,
        nationality: player.nationality || null,
        imageUrl: player.imageUrl || null,
        status: player.status || null,
        birthCertificateNumber: player.birthCertificateNumber || null,
        createdAt: player.createdAt ? new Date(player.createdAt) : new Date(),
        updatedAt: player.updatedAt ? new Date(player.updatedAt) : new Date()
      };
      
      await prisma.player.create({
        data: playerData
      });
      
      restored++;
      console.log(`Успешно восстановлен игрок: ${player.firstName} ${player.lastName} (${player.id})`);
    } catch (error) {
      console.error(`Ошибка при восстановлении игрока ${player.id}:`, error.message);
    }
  }
  
  console.log(`Восстановлено ${restored} из ${players.length} игроков`);
}

async function restore() {
  try {
    await restorePlayers();
    console.log('Восстановление игроков успешно завершено!');
  } catch (error) {
    console.error('Ошибка при восстановлении игроков:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restore(); 