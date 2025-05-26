const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreTeams() {
  console.log('Начинаю восстановление команд...');
  
  const backupDir = path.join(__dirname, '../backup');
  
  try {
    // Проверяем существование директории с бэкапами
    if (!fs.existsSync(backupDir)) {
      console.error('Директория с резервными копиями не найдена!');
      return;
    }
    
    // Восстановление команд
    if (fs.existsSync(path.join(backupDir, 'teams.json'))) {
      const teams = JSON.parse(fs.readFileSync(path.join(backupDir, 'teams.json'), 'utf8'));
      
      console.log(`Восстанавливаю ${teams.length} команд...`);
      
      // Очищаем текущую таблицу перед импортом
      try {
        console.log('Удаляю существующие записи в таблице команд...');
        await prisma.team.deleteMany({});
        console.log('Существующие команды успешно удалены');
      } catch (error) {
        console.error('Ошибка при очистке таблицы команд:', error.message);
        console.log('Продолжаем восстановление без очистки...');
      }
      
      // Восстанавливаем данные
      let restored = 0;
      for (const team of teams) {
        try {
          console.log(`Восстанавливаю команду: ${team.name} (${team.id})`);
          
          // Приводим даты к правильному формату
          const teamData = {
            id: team.id,
            name: team.name,
            description: team.description || null,
            order: team.order || 999,
            clubId: team.clubId,
            createdAt: new Date(team.createdAt || new Date()),
            updatedAt: new Date(team.updatedAt || new Date())
          };
          
          await prisma.team.create({
            data: teamData
          });
          
          restored++;
          console.log(`Успешно восстановлена команда: ${team.name} (${team.id})`);
        } catch (error) {
          console.error(`Ошибка при восстановлении команды ${team.id}:`, error.message);
        }
      }
      
      console.log(`Команды восстановлены успешно! (${restored}/${teams.length})`);
    } else {
      console.error('Файл с резервной копией команд не найден!');
    }
    
    console.log('Восстановление команд завершено!');
  } catch (error) {
    console.error('Ошибка при восстановлении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем восстановление команд
restoreTeams(); 