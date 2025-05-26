const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backup() {
  console.log('Начинаю резервное копирование важных таблиц...');
  
  // Создаем директорию для бэкапов, если она не существует
  const backupDir = path.join(__dirname, '../backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  try {
    // Резервное копирование клубов
    const clubs = await prisma.club.findMany();
    fs.writeFileSync(
      path.join(backupDir, 'clubs.json'),
      JSON.stringify(clubs, null, 2)
    );
    console.log(`Сохранено ${clubs.length} клубов`);
    
    // Резервное копирование пользователей
    const users = await prisma.user.findMany();
    fs.writeFileSync(
      path.join(backupDir, 'users.json'),
      JSON.stringify(users, null, 2)
    );
    console.log(`Сохранено ${users.length} пользователей`);
    
    // Резервное копирование команд
    const teams = await prisma.team.findMany();
    fs.writeFileSync(
      path.join(backupDir, 'teams.json'),
      JSON.stringify(teams, null, 2)
    );
    console.log(`Сохранено ${teams.length} команд`);
    
    // Резервное копирование игроков
    const players = await prisma.player.findMany();
    fs.writeFileSync(
      path.join(backupDir, 'players.json'),
      JSON.stringify(players, null, 2)
    );
    console.log(`Сохранено ${players.length} игроков`);
    
    console.log('Резервное копирование успешно завершено!');
  } catch (error) {
    console.error('Ошибка при создании резервной копии:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backup(); 