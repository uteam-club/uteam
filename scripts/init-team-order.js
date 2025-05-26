const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Инициализация порядка команд...');
    
    // Получаем все команды
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' }, // Начальная сортировка по имени
    });
    
    console.log(`Найдено ${teams.length} команд`);
    
    // Обновляем порядок каждой команды
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      console.log(`Обновление команды: ${team.name}, установка порядка: ${i + 1}`);
      
      await prisma.team.update({
        where: { id: team.id },
        data: { order: i + 1 },
      });
    }
    
    console.log('Порядок команд успешно инициализирован!');
    
    // Проверяем результат
    const updatedTeams = await prisma.team.findMany({
      orderBy: { order: 'asc' },
    });
    
    console.log('Обновленный порядок команд:');
    updatedTeams.forEach(team => {
      console.log(`${team.order}. ${team.name}`);
    });
    
  } catch (error) {
    console.error('Ошибка при инициализации порядка команд:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 