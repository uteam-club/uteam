const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Настройки для нового суперадмина
const VAN_CLUB_ID = '24e0bd68-d7d8-4fc1-a16e-a97ea25231b1';
const ADMIN_EMAIL = 'admin@van.uteam.club';
const ADMIN_PASSWORD = 'VanAdmin2024!';
const ADMIN_NAME = 'Администратор FC VAN';

async function main() {
  try {
    console.log('Создание нового суперадмина для клуба FC VAN...');
    
    // Проверим, существует ли клуб
    const club = await prisma.club.findUnique({
      where: { id: VAN_CLUB_ID }
    });
    
    if (!club) {
      console.error(`Клуб с ID ${VAN_CLUB_ID} не найден!`);
      return;
    }
    
    console.log(`Найден клуб: ${club.name} (${club.subdomain})`);
    
    // Проверим, нет ли уже пользователя с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });
    
    if (existingUser) {
      console.log(`Пользователь с email ${ADMIN_EMAIL} уже существует.`);
      return;
    }
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    // Создаем суперадмина
    const newAdmin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        clubId: VAN_CLUB_ID
      }
    });
    
    console.log('\nСуперадмин для FC VAN успешно создан:');
    console.log(`ID: ${newAdmin.id}`);
    console.log(`Email: ${newAdmin.email}`);
    console.log(`Имя: ${newAdmin.name}`);
    console.log(`Роль: ${newAdmin.role}`);
    console.log(`Клуб ID: ${newAdmin.clubId}`);
    
    console.log('\nДанные для входа:');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Пароль: ${ADMIN_PASSWORD}`);
    
  } catch (error) {
    console.error('Ошибка при создании суперадмина:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 