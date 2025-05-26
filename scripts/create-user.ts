import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Начинаем создание пользователя напрямую через Prisma...');
  
  // Получаем ID первого клуба
  const firstClub = await prisma.club.findFirst();
  
  if (!firstClub) {
    console.error('Клуб не найден в базе данных!');
    process.exit(1);
  }
  
  const clubId = firstClub.id;
  console.log(`Используем клуб: ${firstClub.name} (ID: ${clubId})`);
  
  // Данные нового пользователя
  const email = 'test_user@example.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);
  const role = 'MEMBER'; // или другая роль: ADMIN, COACH, и т.д.
  const name = 'Тестовый Пользователь';
  
  try {
    // Проверяем, существует ли уже пользователь с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log(`Пользователь с email ${email} уже существует!`);
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
    
    console.log('Пользователь успешно создан:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Имя: ${user.name}`);
    console.log(`- Роль: ${user.role}`);
    console.log(`- Пароль (незашифрованный): ${password}`);
    
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('Необработанная ошибка:', error);
  process.exit(1);
}); 