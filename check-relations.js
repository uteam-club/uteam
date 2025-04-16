const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({ log: ['query', 'error'] });

async function main() {
  try {
    console.log('Проверка связей между командами и пользователями...');
    
    // Получаем все связи из таблицы _TeamMembers
    const teamMembersRelations = await prisma.$queryRaw`
      SELECT * FROM "_TeamMembers" LIMIT 10
    `;
    
    console.log('Связи команда-пользователь:', JSON.stringify(teamMembersRelations, null, 2));
    
    // Проверим пользователей
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    console.log('\nПользователи в системе:', JSON.stringify(users, null, 2));
    
    // Проверим команды
    const teams = await prisma.team.findMany({
      take: 5,
      select: {
        id: true,
        name: true
      }
    });
    
    console.log('\nКоманды в системе:', JSON.stringify(teams, null, 2));
    
    // Попробуем создать связь между пользователем и командой
    if (users.length > 0 && teams.length > 0) {
      console.log('\nПытаемся создать связь между пользователем и командой...');
      
      // Проверяем существующие связи для первого пользователя
      const userTeams = await prisma.user.findUnique({
        where: { id: users[0].id },
        select: {
          teams: true
        }
      });
      
      console.log('\nТекущие команды пользователя:', JSON.stringify(userTeams, null, 2));
      
      // Если пользователь не связан с первой командой, создаем связь
      const isAlreadyConnected = userTeams?.teams?.some(team => team.id === teams[0].id);
      
      if (!isAlreadyConnected) {
        const updatedUser = await prisma.user.update({
          where: { id: users[0].id },
          data: {
            teams: {
              connect: { id: teams[0].id }
            }
          },
          include: {
            teams: true
          }
        });
        
        console.log('\nСоздана новая связь между пользователем и командой:', JSON.stringify(updatedUser, null, 2));
      } else {
        console.log('\nПользователь уже связан с этой командой');
      }
    }
  } catch (error) {
    console.error('Ошибка при проверке связей:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 