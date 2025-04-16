const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  try {
    console.log('Добавление связей между пользователями и командами...');
    
    // Получаем всех пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    console.log(`Найдено ${users.length} пользователей`);
    
    // Получаем все команды
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`Найдено ${teams.length} команд`);
    
    // Добавляем каждого пользователя к каждой команде
    for (const user of users) {
      console.log(`Обрабатываем пользователя: ${user.name}`);
      
      // Получаем текущие команды пользователя
      const userWithTeams = await prisma.user.findUnique({
        where: { id: user.id },
        include: { teams: true }
      });
      
      const existingTeamIds = userWithTeams.teams.map(team => team.id);
      
      // Определяем команды, которые нужно добавить
      const teamsToAdd = teams.filter(team => !existingTeamIds.includes(team.id));
      
      if (teamsToAdd.length > 0) {
        console.log(`Добавление ${teamsToAdd.length} команд для пользователя ${user.name}`);
        
        // Обновляем пользователя, добавляя его во все недостающие команды
        await prisma.user.update({
          where: { id: user.id },
          data: {
            teams: {
              connect: teamsToAdd.map(team => ({ id: team.id }))
            }
          }
        });
        
        console.log(`Пользователь ${user.name} успешно добавлен в ${teamsToAdd.length} команд`);
      } else {
        console.log(`Пользователь ${user.name} уже состоит во всех командах`);
      }
    }
    
    console.log('Добавление связей завершено успешно!');
  } catch (error) {
    console.error('Ошибка при добавлении связей:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 