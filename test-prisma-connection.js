// Тестовый файл для проверки прямого подключения к базе данных
const { PrismaClient } = require('@prisma/client');

// Создаем клиент с расширенным логированием
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Тестирование подключения к базе данных...');
    
    // Проверяем количество команд
    const teamsCount = await prisma.team.count();
    console.log(`Найдено команд: ${teamsCount}`);
    
    if (teamsCount > 0) {
      // Получаем первые 5 команд
      const teams = await prisma.team.findMany({
        take: 5,
        orderBy: { name: 'asc' }
      });
      
      console.log('Список команд:');
      teams.forEach((team, index) => {
        console.log(`${index + 1}. ${team.name}`);
      });
      
      // Проверяем связанные таблицы
      if (teams.length > 0) {
        const firstTeamId = teams[0].id;
        const players = await prisma.player.findMany({
          where: { teamId: firstTeamId },
          take: 5
        });
        
        console.log(`\nИгроки в команде "${teams[0].name}" (${players.length}):`);
        players.forEach((player, index) => {
          console.log(`${index + 1}. ${player.firstName} ${player.lastName}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Ошибка при подключении:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 