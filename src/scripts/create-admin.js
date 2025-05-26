// Скрипт для создания суперадмина
const { PrismaClient } = require('../../src/generated/prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Создаем клуб FDC Vista
    const club = await prisma.club.create({
      data: {
        name: 'FDC Vista',
        subdomain: 'fdcvista',
      }
    });

    console.log('Клуб успешно создан:', club);

    // Создаем суперадмина
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Администратор',
        email: 'admin@fdcvista.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        clubId: club.id,
      }
    });

    console.log('Суперадмин успешно создан:', {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    });

    console.log('\nДанные для входа:');
    console.log('Email: admin@fdcvista.com');
    console.log('Пароль: admin123');

  } catch (error) {
    console.error('Ошибка при создании суперадмина:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 