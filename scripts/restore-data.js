const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Получаем текущие модели из Prisma
async function getModelSchema(model) {
  // Это упрощенная версия, в реальности нужно было бы извлечь схему из Prisma
  const result = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = ${model.toLowerCase()}
  `;
  return result.map(r => r.column_name);
}

// Фильтруем объект, оставляя только поля, присутствующие в схеме
function filterObjectBySchema(obj, schema) {
  const result = {};
  for (const key in obj) {
    if (schema.includes(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Отладочная функция
function logObject(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

// Функция для восстановления игроков
async function restorePlayers() {
  console.log('Восстанавливаем игроков...');
  
  const backupDir = path.join(__dirname, '../backup');
  
  if (!fs.existsSync(path.join(backupDir, 'players.json'))) {
    console.error('Файл с данными игроков не найден!');
    return;
  }
  
  const players = JSON.parse(fs.readFileSync(path.join(backupDir, 'players.json'), 'utf8'));
  
  console.log(`Найдено ${players.length} игроков для восстановления`);
  
  // Удаляем существующих игроков
  await prisma.player.deleteMany({});
  
  let restored = 0;
  
  for (const player of players) {
    try {
      // Проверяем наличие обязательных полей
      if (!player.firstName || !player.lastName || !player.teamId || !player.pinCode) {
        console.error(`Пропускаем игрока ${player.id}: отсутствуют обязательные поля`);
        continue;
      }
      
      // Создаем игрока с минимальным набором обязательных полей
      const result = await prisma.player.create({
        data: {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          teamId: player.teamId,
          pinCode: player.pinCode,
          middleName: player.middleName,
          number: player.number,
          position: player.position,
          strongFoot: player.strongFoot,
          dateOfBirth: player.dateOfBirth,
          academyJoinDate: player.academyJoinDate,
          nationality: player.nationality,
          imageUrl: player.imageUrl,
          status: player.status,
          birthCertificateNumber: player.birthCertificateNumber,
          createdAt: player.createdAt ? new Date(player.createdAt) : new Date(),
          updatedAt: player.updatedAt ? new Date(player.updatedAt) : new Date()
        }
      });
      
      restored++;
    } catch (error) {
      console.error(`Ошибка при восстановлении игрока ${player.id}:`, error.message);
    }
  }
  
  console.log(`Восстановлено ${restored} из ${players.length} игроков`);
}

async function restore() {
  console.log('Начинаю восстановление данных из резервных копий...');
  
  const backupDir = path.join(__dirname, '../backup');
  
  try {
    // Проверяем существование директории с бэкапами
    if (!fs.existsSync(backupDir)) {
      console.error('Директория с резервными копиями не найдена!');
      return;
    }
    
    // Восстановление клубов
    if (fs.existsSync(path.join(backupDir, 'clubs.json'))) {
      const clubs = JSON.parse(fs.readFileSync(path.join(backupDir, 'clubs.json'), 'utf8'));
      
      console.log(`Восстанавливаю ${clubs.length} клубов...`);
      
      // Получаем схему таблицы
      const clubSchema = await getModelSchema('club');
      console.log('Схема таблицы клубов:', clubSchema);
      
      // Очищаем текущую таблицу перед импортом
      await prisma.club.deleteMany({});
      
      // Восстанавливаем данные
      let restored = 0;
      for (const club of clubs) {
        try {
          // Фильтруем объект по текущей схеме
          const filteredClub = filterObjectBySchema(club, clubSchema);
          await prisma.club.create({
            data: filteredClub
          });
          restored++;
        } catch (error) {
          console.error(`Ошибка при восстановлении клуба ${club.id}:`, error.message);
        }
      }
      
      console.log(`Клубы восстановлены успешно! (${restored}/${clubs.length})`);
    }
    
    // Восстановление пользователей
    if (fs.existsSync(path.join(backupDir, 'users.json'))) {
      const users = JSON.parse(fs.readFileSync(path.join(backupDir, 'users.json'), 'utf8'));
      
      console.log(`Восстанавливаю ${users.length} пользователей...`);
      
      // Получаем схему таблицы
      const userSchema = await getModelSchema('user');
      console.log('Схема таблицы пользователей:', userSchema);
      
      // Очищаем текущую таблицу перед импортом
      await prisma.user.deleteMany({});
      
      // Восстанавливаем данные
      let restored = 0;
      for (const user of users) {
        try {
          // Фильтруем объект по текущей схеме
          const filteredUser = filterObjectBySchema(user, userSchema);
          await prisma.user.create({
            data: filteredUser
          });
          restored++;
        } catch (error) {
          console.error(`Ошибка при восстановлении пользователя ${user.id}:`, error.message);
        }
      }
      
      console.log(`Пользователи восстановлены успешно! (${restored}/${users.length})`);
    }
    
    // Восстановление команд
    if (fs.existsSync(path.join(backupDir, 'teams.json'))) {
      const teams = JSON.parse(fs.readFileSync(path.join(backupDir, 'teams.json'), 'utf8'));
      
      console.log(`Восстанавливаю ${teams.length} команд...`);
      
      // Получаем схему таблицы
      const teamSchema = await getModelSchema('team');
      console.log('Схема таблицы команд:', teamSchema);
      
      // Очищаем текущую таблицу перед импортом
      await prisma.team.deleteMany({});
      
      // Восстанавливаем данные
      let restored = 0;
      for (const team of teams) {
        try {
          // Фильтруем объект по текущей схеме
          const filteredTeam = filterObjectBySchema(team, teamSchema);
          await prisma.team.create({
            data: filteredTeam
          });
          restored++;
        } catch (error) {
          console.error(`Ошибка при восстановлении команды ${team.id}:`, error.message);
        }
      }
      
      console.log(`Команды восстановлены успешно! (${restored}/${teams.length})`);
    }
    
    // Восстановление игроков
    await restorePlayers();
    
    console.log('Восстановление данных успешно завершено!');
  } catch (error) {
    console.error('Ошибка при восстановлении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restore(); 