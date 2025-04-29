const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Проверяю структуру таблицы training_participants...');
    
    // Запрос для получения информации о колонках таблицы
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'training_participants'
    `;
    
    console.log('Колонки таблицы training_participants:');
    console.log(columns);
    
    // Проверим первую запись, чтобы увидеть её содержимое
    const firstRecord = await prisma.$queryRaw`
      SELECT * FROM training_participants LIMIT 1
    `;
    
    if (firstRecord && firstRecord.length > 0) {
      console.log('Пример записи:');
      console.log(firstRecord[0]);
    } else {
      console.log('Записей не найдено');
    }
    
  } catch (error) {
    console.error('Ошибка при проверке структуры таблицы:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 