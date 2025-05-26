import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Создание администратора...');
  
  // Получаем ID первого клуба
  const firstClub = await prisma.club.findFirst();
  
  if (!firstClub) {
    console.error('Клуб не найден в базе данных!');
    process.exit(1);
  }
  
  const clubId = firstClub.id;
  console.log(`Используем клуб: ${firstClub.name} (ID: ${clubId})`);
  
  // Данные администратора
  const email = 'admin@example.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  const role = 'SUPER_ADMIN';
  const name = 'Администратор';
  
  try {
    // Проверяем, существует ли уже пользователь с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log(`Администратор с email ${email} уже существует!`);
      
      // Обновляем пароль существующего пользователя, чтобы тестовый скрипт работал
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          role: role as any
        }
      });
      
      console.log('Пароль администратора обновлен!');
      console.log('Email: admin@example.com');
      console.log('Пароль: admin123');
      
      process.exit(0);
    }
    
    // Создаем пользователя напрямую через Prisma
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role as any,
        clubId
      }
    });
    
    console.log('Администратор успешно создан:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Имя: ${user.name}`);
    console.log(`- Роль: ${user.role}`);
    console.log(`- Пароль (незашифрованный): ${password}`);
    
  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('Необработанная ошибка:', error);
  process.exit(1);
}); 