const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function main() {
  console.log('Создание тестового пользователя...');
  
  const prisma = new PrismaClient();
  
  try {
    // Хешируем пароль
    const saltRounds = 10;
    const password = process.env.TEST_USER_PASSWORD || 'password123';
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email: process.env.TEST_USER_EMAIL || 'admin@example.com' }
    });
    
    if (existingUser) {
      console.log('Пользователь уже существует. Обновляем пароль...');
      
      await prisma.user.update({
        where: { email: process.env.TEST_USER_EMAIL || 'admin@example.com' },
        data: { password: hashedPassword }
      });
      
      console.log('Пароль пользователя обновлен успешно.');
    } else {
      console.log('Создаем нового пользователя...');
      
      // Создаем нового пользователя
      await prisma.user.create({
        data: {
          email: process.env.TEST_USER_EMAIL || 'admin@example.com',
          name: 'Admin User',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      
      console.log('Пользователь создан успешно.');
    }
    
    console.log('Данные для входа:');
    console.log(`Email: ${process.env.TEST_USER_EMAIL || 'admin@example.com'}`);
    console.log(`Пароль: ${process.env.TEST_USER_PASSWORD || 'password123'}`);
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 