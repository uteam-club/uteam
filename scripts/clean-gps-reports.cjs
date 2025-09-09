const { db } = require('../src/lib/db');
const { gpsReport } = require('../src/db/schema');
const { eq } = require('drizzle-orm');

async function cleanGpsReports() {
  try {
    console.log('🔍 Проверяем GPS-отчёты в базе данных...');
    
    // Получаем все отчёты
    const reports = await db.select().from(gpsReport);
    console.log(`📊 Найдено отчётов: ${reports.length}`);
    
    if (reports.length === 0) {
      console.log('✅ База данных уже пуста - нет GPS-отчётов для удаления');
      return;
    }
    
    // Показываем информацию о найденных отчётах
    console.log('\n📋 Список найденных отчётов:');
    reports.forEach((report, index) => {
      console.log(`${index + 1}. ID: ${report.id}`);
      console.log(`   Название: ${report.name}`);
      console.log(`   Файл: ${report.fileName}`);
      console.log(`   GPS система: ${report.gpsSystem}`);
      console.log(`   Команда: ${report.teamId}`);
      console.log(`   Событие: ${report.eventType} (${report.eventId})`);
      console.log(`   Создан: ${new Date(report.createdAt).toLocaleString()}`);
      console.log(`   Обработан: ${report.isProcessed ? 'Да' : 'Нет'}`);
      console.log(`   Есть canonical: ${report.processedData?.canonical ? 'Да' : 'Нет'}`);
      console.log('---');
    });
    
    // Удаляем все отчёты
    console.log('\n🗑️  Удаляем все GPS-отчёты...');
    const deleteResult = await db.delete(gpsReport);
    console.log('✅ Все GPS-отчёты успешно удалены');
    
    // Проверяем, что база действительно пуста
    const remainingReports = await db.select().from(gpsReport);
    console.log(`\n🔍 Проверка: осталось отчётов: ${remainingReports.length}`);
    
    if (remainingReports.length === 0) {
      console.log('✅ База данных полностью очищена от GPS-отчётов');
    } else {
      console.log('❌ Ошибка: не все отчёты были удалены');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при очистке базы данных:', error);
  } finally {
    process.exit(0);
  }
}

cleanGpsReports();
