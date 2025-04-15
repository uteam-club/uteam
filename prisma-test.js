// Тестовый файл для проверки подключения Prisma к базе данных
const { PrismaClient } = require('@prisma/client');

// Создаем новый инстанс PrismaClient с расширенным логированием
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Автоматическая функция для тестирования подключения
async function testConnection() {
  try {
    console.log('Проверка подключения к базе данных...');
    
    // Пытаемся получить количество команд
    const teamsCount = await prisma.$queryRaw`SELECT COUNT(*) FROM "teams"`;
    console.log('Команд в базе данных:', teamsCount);
    
    // Пытаемся получить список всех таблиц в базе данных
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('Найденные таблицы:', tables);
    
  } catch (error) {
    console.error('Ошибка при подключении к базе данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем тест подключения
testConnection(); 