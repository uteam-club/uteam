const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const teamsCount = await prisma.team.count();
    const playersCount = await prisma.player.count();
    const trainingsCount = await prisma.training.count();
    const exercisesCount = await prisma.exercise.count();
    
    console.log('Teams count:', teamsCount);
    console.log('Players count:', playersCount);
    console.log('Trainings count:', trainingsCount);
    console.log('Exercises count:', exercisesCount);

    // Выведем список последних команд
    if (teamsCount > 0) {
      const teams = await prisma.team.findMany({
        take: 5,
        orderBy: { name: 'asc' }
      });
      console.log('\nTeams:', teams.map(t => t.name));
    }

    // Выведем список последних тренировок
    if (trainingsCount > 0) {
      const trainings = await prisma.training.findMany({
        take: 5,
        orderBy: { startTime: 'desc' }
      });
      console.log('\nTrainings:', trainings.map(t => t.title));
    }
  } catch (error) {
    console.error('Error checking data:', error);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 