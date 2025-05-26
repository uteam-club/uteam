const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Получение списка клубов...');
    const clubs = await prisma.club.findMany();
    
    console.log('\nКлубы в системе:');
    clubs.forEach(club => {
      console.log(`ID: ${club.id}`);
      console.log(`Название: ${club.name}`);
      console.log(`Поддомен: ${club.subdomain}`);
      console.log('------------------------');
    });

    // Вывести информацию о пользователе admin@fdcvista.uteam.club
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@fdcvista.uteam.club' }
    });

    if (adminUser) {
      console.log('\nИнформация о пользователе:');
      console.log(`ID: ${adminUser.id}`);
      console.log(`Email: ${adminUser.email}`);
      console.log(`Имя: ${adminUser.name}`);
      console.log(`Роль: ${adminUser.role}`);
      console.log(`Клуб ID: ${adminUser.clubId}`);
    } else {
      console.log('\nПользователь admin@fdcvista.uteam.club не найден');
    }

  } catch (error) {
    console.error('Ошибка при получении списка клубов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 