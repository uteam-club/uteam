const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Начинаю обновление статусов в базе данных...');
    
    // Получаем текущие значения статусов
    const statuses = await prisma.$queryRaw`
      SELECT "attendanceStatus", COUNT(*) 
      FROM "training_participants" 
      GROUP BY "attendanceStatus"
    `;
    
    console.log('Текущее распределение статусов:');
    console.log(statuses);
    
    // Обновляем статус READY на TRAINED
    const readyResult = await prisma.$executeRaw`
      UPDATE "training_participants"
      SET "attendanceStatus" = 'TRAINED'
      WHERE "attendanceStatus" = 'READY'
    `;
    console.log(`Обновлено записей READY на TRAINED: ${readyResult}`);
    
    // Обновляем статус PRESENT на TRAINED
    const presentResult = await prisma.$executeRaw`
      UPDATE "training_participants"
      SET "attendanceStatus" = 'TRAINED'
      WHERE "attendanceStatus" = 'PRESENT'
    `;
    console.log(`Обновлено записей PRESENT на TRAINED: ${presentResult}`);
    
    // Проверяем финальное распределение
    const finalStatuses = await prisma.$queryRaw`
      SELECT "attendanceStatus", COUNT(*) 
      FROM "training_participants" 
      GROUP BY "attendanceStatus"
    `;
    
    console.log('Итоговое распределение статусов:');
    console.log(finalStatuses);
    
    console.log('Обновление завершено');
  } catch (error) {
    console.error('Ошибка при обновлении статусов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 