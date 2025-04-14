const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Проверяем всех пользователей
    const users = await prisma.user.findMany();
    console.log('Всего пользователей:', users.length);
    console.log('Пользователи:', JSON.stringify(users, null, 2));
    
    // Проверяем суперадминов
    const admins = await prisma.user.findMany({
      where: {
        role: 'SUPERADMIN'
      }
    });
    console.log('Суперадминов:', admins.length);
    
  } catch (error) {
    console.error('Ошибка при проверке пользователей:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 