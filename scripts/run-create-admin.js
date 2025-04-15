const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@vista.club';
  const password = 'Admin123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    const admin = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Администратор',
        password: hashedPassword,
        role: 'SUPERADMIN',
      },
    });
    
    console.log(`Суперадмин создан: ${admin.email}`);
    console.log(`Пароль: ${password}`);
  } catch (error) {
    console.error('Ошибка при создании суперадмина:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 