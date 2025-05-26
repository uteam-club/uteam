import { prisma } from '../src/lib/prisma';
import { createSuperAdmin } from '../src/services/user.service';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Проверка базы данных...');
  
  // Проверка клубов
  const clubsCount = await prisma.club.count();
  console.log(`Найдено ${clubsCount} клубов`);
  
  let mainClubId: string | null = null;
  
  // Если нет клубов, создаем основной клуб
  if (clubsCount === 0) {
    console.log('Создание основного клуба...');
    try {
      const mainClub = await prisma.club.create({
        data: {
          name: 'Основной клуб',
          subdomain: 'main'
        }
      });
      mainClubId = mainClub.id;
      console.log(`Создан основной клуб с ID: ${mainClub.id}`);
    } catch (error) {
      console.error('Ошибка при создании клуба:', error);
      process.exit(1);
    }
  } else {
    // Получаем ID первого клуба
    const firstClub = await prisma.club.findFirst();
    mainClubId = firstClub?.id || null;
    console.log(`Используем существующий клуб с ID: ${mainClubId}`);
  }
  
  if (!mainClubId) {
    console.error('Не удалось получить ID клуба');
    process.exit(1);
  }
  
  // Проверка пользователей
  const usersCount = await prisma.user.count();
  console.log(`Найдено ${usersCount} пользователей`);
  
  // Если нет пользователей, создаем админа
  if (usersCount === 0) {
    console.log('Создание супер-администратора...');
    try {
      const adminUser = await createSuperAdmin({
        email: 'admin@example.com',
        name: 'Администратор',
        password: 'admin123',
        clubId: mainClubId
      });
      
      if (adminUser) {
        console.log(`Создан супер-администратор с ID: ${adminUser.id}`);
        console.log('Учетные данные: admin@example.com / admin123');
      } else {
        console.error('Не удалось создать супер-администратора');
      }
    } catch (error) {
      console.error('Ошибка при создании супер-администратора:', error);
      process.exit(1);
    }
  }
  
  console.log('Проверка базы данных завершена');
  process.exit(0);
}

main().catch(error => {
  console.error('Необработанная ошибка:', error);
  process.exit(1);
}); 