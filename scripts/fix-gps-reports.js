import { db } from '../src/lib/db.ts';
import { gpsReport } from '../src/db/schema/index.ts';
import { eq } from 'drizzle-orm';

async function fixGpsReports() {
  console.log('🔧 Начинаем исправление GPS отчетов...');

  try {
    // Получаем все отчеты
    const reports = await db
      .select()
      .from(gpsReport);

    console.log(`📊 Найдено отчетов: ${reports.length}`);

    for (const report of reports) {
      console.log(`\n🔍 Обрабатываем отчет: ${report.name} (${report.id})`);
      
      // Проверяем, есть ли rawData
      if (!report.rawData || !Array.isArray(report.rawData) || report.rawData.length < 2) {
        console.log('⚠️ Нет rawData, пропускаем');
        continue;
      }

      // Проверяем, нужно ли исправлять данные
      const currentProcessedData = report.processedData;
      if (Array.isArray(currentProcessedData) && currentProcessedData.length > 0) {
        const firstRecord = currentProcessedData[0];
        const hasAllFields = firstRecord.name && firstRecord.Time && firstRecord.TD && 
                           firstRecord['Zone 3'] && firstRecord['Zone 4'] && firstRecord['Zone 5'] &&
                           firstRecord.Acc && firstRecord.Dec && firstRecord['Max Speed'] &&
                           firstRecord.HSR && firstRecord['HSR%'];
        
        if (hasAllFields) {
          console.log('✅ Данные уже правильные, пропускаем');
          continue;
        }
      }

      console.log('🔧 Исправляем данные...');

      // Исправляем данные на основе rawData
      const fixedProcessedData = report.rawData.slice(1).map((row, index) => {
        // Пропускаем строки "Среднее" и "Сумма"
        if (row[0] === 'Среднее' || row[0] === 'Сумма') {
          return null;
        }

        return {
          name: row[0], // Игрок
          Time: row[1], // Время
          TD: row[2], // Общая дистанция
          'Zone 3': row[3], // Зона 3
          'Zone 4': row[4], // Зона 4
          'Zone 5': row[5], // Зона 5
          Acc: row[6], // Ускорения
          Dec: row[7], // Торможения
          'Max Speed': row[8], // Максимальная скорость
          HSR: row[9], // HSR
          'HSR%': row[10] // HSR %
        };
      }).filter(row => row !== null);

      console.log(`✅ Исправлено записей: ${fixedProcessedData.length}`);

      // Обновляем отчет в базе данных
      await db
        .update(gpsReport)
        .set({
          processedData: fixedProcessedData,
          updatedAt: new Date()
        })
        .where(eq(gpsReport.id, report.id));

      console.log('✅ Отчет обновлен в базе данных');
    }

    console.log('\n🎉 Исправление завершено!');

  } catch (error) {
    console.error('❌ Ошибка при исправлении отчетов:', error);
  } finally {
    process.exit(0);
  }
}

fixGpsReports(); 