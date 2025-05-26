const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  try {
    const clubs = await prisma.club.findMany();
    
    console.log('Клубы и их логотипы:');
    clubs.forEach(club => {
      console.log(`Название: ${club.name}`);
      console.log(`Поддомен: ${club.subdomain}`);
      console.log(`Логотип URL: ${club.logoUrl || 'не установлен'}`);
      console.log('------------------------');
    });
  } catch (error) {
    console.error('Ошибка при получении данных клубов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 