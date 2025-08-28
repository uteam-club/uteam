#!/usr/bin/env tsx

/**
 * Безопасный скрипт для очистки неправильно установленных длительностей тренировок (70 минут)
 * с созданием бэкапа перед изменениями
 */

import { db } from '../src/lib/db';
import { rpeSurveyResponse } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

async function createBackup(records: any[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `rpe-durations-backup-${timestamp}.json`);
  
  try {
    // Создаем директорию для бэкапов если её нет
    await fs.mkdir(backupDir, { recursive: true });
    
    // Сохраняем данные в файл
    await fs.writeFile(backupFile, JSON.stringify(records, null, 2));
    
    console.log(`💾 Бэкап создан: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('❌ Ошибка создания бэкапа:', error);
    throw error;
  }
}

async function clearTrainingDurationsSafe() {
  console.log('🛡️  Запуск безопасной очистки длительностей тренировок...');
  
  try {
    // Находим все записи с длительностью 70 минут
    const recordsWithDefault70 = await db
      .select()
      .from(rpeSurveyResponse)
      .where(eq(rpeSurveyResponse.durationMinutes, 70));

    console.log(`📊 Найдено ${recordsWithDefault70.length} записей с длительностью 70 минут`);

    if (recordsWithDefault70.length === 0) {
      console.log('✅ Записей с длительностью 70 минут не найдено. Очистка не требуется.');
      return;
    }

    // Создаем бэкап
    console.log('\n💾 Создаем бэкап данных...');
    const backupFile = await createBackup(recordsWithDefault70);

    // Показываем статистику
    console.log('\n📈 Статистика найденных записей:');
    const groupedByDate = recordsWithDefault70.reduce((acc, record) => {
      const date = record.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(groupedByDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10)
      .forEach(([date, count]) => {
        console.log(`  ${date}: ${count} записей`);
      });

    // Показываем уникальные ID игроков
    const uniquePlayers = new Set(recordsWithDefault70.map(r => r.playerId));
    console.log(`👥 Затронуто игроков: ${uniquePlayers.size}`);

    // Запрашиваем подтверждение
    console.log('\n⚠️  ВНИМАНИЕ: Это действие изменит данные в базе!');
    console.log(`   📁 Бэкап сохранен в: ${backupFile}`);
    console.log('   🔄 Будет очищено поле durationMinutes для найденных записей');
    
    const autoConfirm = process.env.AUTO_CONFIRM === 'true';
    
    if (!autoConfirm) {
      console.log('\n💡 Для выполнения скрипта запустите его с переменной AUTO_CONFIRM=true');
      console.log('   Пример: AUTO_CONFIRM=true npm run clear-durations-safe');
      return;
    }

    console.log('\n🔄 Начинаем безопасную очистку...');

    // Выполняем очистку порциями для надежности
    const batchSize = 100;
    let processedCount = 0;

    for (let i = 0; i < recordsWithDefault70.length; i += batchSize) {
      const batch = recordsWithDefault70.slice(i, i + batchSize);
      const batchIds = batch.map(r => r.id);

      // Обновляем записи в текущей порции
      for (const id of batchIds) {
        await db
          .update(rpeSurveyResponse)
          .set({ durationMinutes: null })
          .where(eq(rpeSurveyResponse.id, id));
      }

      processedCount += batch.length;
      console.log(`   ✓ Обработано ${processedCount}/${recordsWithDefault70.length} записей`);
    }

    console.log(`✅ Успешно очищено ${processedCount} записей`);
    
    // Финальная проверка
    const remainingRecords = await db
      .select({ id: rpeSurveyResponse.id })
      .from(rpeSurveyResponse)
      .where(eq(rpeSurveyResponse.durationMinutes, 70));

    if (remainingRecords.length === 0) {
      console.log('🎉 Проверка: записей с длительностью 70 минут больше не найдено');
    } else {
      console.log(`⚠️  Внимание: все еще осталось ${remainingRecords.length} записей с длительностью 70 минут`);
    }

    console.log('\n📋 Что дальше:');
    console.log('   1. Тренерам нужно заново указать корректную длительность для своих тренировок');
    console.log('   2. Бэкап данных сохранен и может быть использован для восстановления при необходимости');
    console.log(`   3. Файл бэкапа: ${backupFile}`);

  } catch (error) {
    console.error('❌ Ошибка при очистке длительностей:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
clearTrainingDurationsSafe()
  .then(() => {
    console.log('\n🏁 Безопасная очистка завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
