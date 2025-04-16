/**
 * Скрипт для деплоя в продакшен
 * Выполняет необходимые действия для обеспечения корректной работы приложения:
 * 1. Создает связи между пользователями и командами
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  try {
    console.log('🚀 Запуск процесса подготовки продакшен окружения...');
    
    // Получаем всех пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    console.log(`👥 Найдено ${users.length} пользователей`);
    
    if (users.length === 0) {
      console.log('⚠️ Пользователи не найдены, нужно выполнить инициализацию');
      
      // Создаем суперадмина, если нет пользователей
      const bcrypt = require('bcrypt');
      const password = 'Admin123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      console.log('👨‍💼 Создаем суперадмина...');
      
      const admin = await prisma.user.create({
        data: {
          email: 'admin@vista.club',
          name: 'Администратор',
          password: hashedPassword,
          role: 'SUPERADMIN',
        }
      });
      
      console.log(`✅ Суперадмин создан с id: ${admin.id}`);
      
      users.push(admin);
    }
    
    // Получаем все команды
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`🏆 Найдено ${teams.length} команд`);
    
    if (teams.length === 0) {
      console.log('⚠️ Команды не найдены, создаем дефолтную команду');
      
      const defaultTeam = await prisma.team.create({
        data: {
          id: 'default-team-id',
          name: 'Vista Team',
          description: 'Основная команда клуба Vista',
        }
      });
      
      console.log(`✅ Дефолтная команда создана с id: ${defaultTeam.id}`);
      
      teams.push(defaultTeam);
    }
    
    // Добавляем каждого пользователя к каждой команде
    console.log('🔄 Добавление связей между пользователями и командами...');
    
    for (const user of users) {
      console.log(`👤 Обрабатываем пользователя: ${user.name || user.email}`);
      
      // Получаем текущие команды пользователя
      const userWithTeams = await prisma.user.findUnique({
        where: { id: user.id },
        include: { teams: true }
      });
      
      if (!userWithTeams) {
        console.log(`⚠️ Пользователь с id ${user.id} не найден, пропускаем`);
        continue;
      }
      
      const existingTeamIds = userWithTeams.teams.map(team => team.id);
      
      // Определяем команды, которые нужно добавить
      const teamsToAdd = teams.filter(team => !existingTeamIds.includes(team.id));
      
      if (teamsToAdd.length > 0) {
        console.log(`➕ Добавление ${teamsToAdd.length} команд для пользователя ${user.name || user.email}`);
        
        // Обновляем пользователя, добавляя его во все недостающие команды
        await prisma.user.update({
          where: { id: user.id },
          data: {
            teams: {
              connect: teamsToAdd.map(team => ({ id: team.id }))
            }
          }
        });
        
        console.log(`✅ Пользователь ${user.name || user.email} успешно добавлен в ${teamsToAdd.length} команд`);
      } else {
        console.log(`ℹ️ Пользователь ${user.name || user.email} уже состоит во всех командах`);
      }
    }
    
    console.log('🎉 Подготовка продакшен окружения успешно завершена!');
  } catch (error) {
    console.error('❌ Ошибка при подготовке продакшен окружения:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 