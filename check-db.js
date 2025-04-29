const { PrismaClient } = require('@prisma/client');

async function main() {
  try {
    console.log('Инициализация подключения к базе данных...');
    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    
    console.log('Проверка подключения...');
    // Простой запрос для проверки подключения
    const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
    
    console.log('Результат проверки подключения:', result);
    console.log('Подключение к базе данных успешно установлено!');
    
    // Получение информации о базе данных
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user, inet_server_addr(), version()`;
    console.log('Информация о базе данных:', dbInfo);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Ошибка при подключении к базе данных:', error);
    process.exit(1);
  }
}

main().catch(console.error); 