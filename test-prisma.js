const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function main() {
  try {
    console.log('Проверка подключения к базе данных...');
    
    // Проверка команд
    const teams = await prisma.team.findMany();
    console.log(`Найдено ${teams.length} команд:`);
    console.log(JSON.stringify(teams, null, 2));
    
    if (teams.length > 0) {
      const teamId = teams[0].id;
      
      // Проверка игроков в первой команде
      const players = await prisma.player.findMany({
        where: { teamId: teamId }
      });
      
      console.log(`\nНайдено ${players.length} игроков в команде ${teams[0].name}:`);
      console.log(JSON.stringify(players, null, 2));
      
      // Проверка пользователей в первой команде
      const members = await prisma.user.findMany({
        where: {
          teams: {
            some: {
              id: teamId
            }
          }
        }
      });
      
      console.log(`\nНайдено ${members.length} пользователей в команде ${teams[0].name}:`);
      console.log(JSON.stringify(members, null, 2));
    }
  } catch (error) {
    console.error('Ошибка при проверке базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 