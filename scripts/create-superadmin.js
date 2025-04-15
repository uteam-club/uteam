const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    // Создаем хеш пароля
    const password = 'Admin123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создаем суперадмина
    const admin = await prisma.user.create({
      data: {
        email: 'admin@vista.club',
        name: 'Администратор',
        password: hashedPassword,
        role: 'SUPERADMIN',
      }
    });
    
    console.log('Суперадмин успешно создан:');
    console.log('ID:', admin.id);
    console.log('Email:', admin.email);
    console.log('Имя:', admin.name);
    console.log('Роль:', admin.role);
    console.log('Пароль (не хешированный):', password);
    
  } catch (error) {
    console.error('Ошибка при создании суперадмина:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 