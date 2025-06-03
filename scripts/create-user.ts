import { db } from '../src/lib/db';
import { user, club } from '../src/db/schema';
import { eq, asc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log('Начинаем создание пользователя напрямую через Drizzle ORM...');
  
  // Получаем ID первого клуба
  const [firstClub] = await db.select().from(club).orderBy(asc(club.name)).limit(1);
  
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
    const [existingUser] = await db.select().from(user).where(eq(user.email, email));
    
    if (existingUser) {
      console.log(`Пользователь с email ${email} уже существует!`);
      process.exit(0);
    }
    
    // Создаем пользователя напрямую через Drizzle
    const [createdUser] = await db.insert(user).values({
      email,
      name,
      password: hashedPassword,
      role,
      clubId,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    console.log('Пользователь успешно создан:');
    console.log(`- ID: ${createdUser.id}`);
    console.log(`- Email: ${createdUser.email}`);
    console.log(`- Имя: ${createdUser.name}`);
    console.log(`- Роль: ${createdUser.role}`);
    console.log(`- Пароль (незашифрованный): ${password}`);
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    process.exit(1);
  }
}

main();