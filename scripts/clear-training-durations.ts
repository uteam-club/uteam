#!/usr/bin/env tsx

/**
 * Скрипт для очистки неправильно установленных длительностей тренировок (70 минут)
 * во всех командах и клубах
 */

import { db } from '../src/lib/db';
import { rpeSurveyResponse } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function clearTrainingDurations() {
  console.log('🚀 Начинаем очистку неправильных длительностей тренировок...');
  
  try {
    // Находим все записи с длительностью 70 минут
    const recordsWithDefault70 = await db
      .select({
        id: rpeSurveyResponse.id,
        playerId: rpeSurveyResponse.playerId,
        durationMinutes: rpeSurveyResponse.durationMinutes,
        createdAt: rpeSurveyResponse.createdAt
      })
      .from(rpeSurveyResponse)
      .where(eq(rpeSurveyResponse.durationMinutes, 70));

    console.log(`📊 Найдено ${recordsWithDefault70.length} записей с длительностью 70 минут`);

    if (recordsWithDefault70.length === 0) {
      console.log('✅ Записей с длительностью 70 минут не найдено. Очистка не требуется.');
      return;
    }

    // Показываем статистику
    console.log('\n📈 Статистика найденных записей:');
    const groupedByDate = recordsWithDefault70.reduce((acc, record) => {
      const date = record.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(groupedByDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10) // Показываем последние 10 дат
      .forEach(([date, count]) => {
        console.log(`  ${date}: ${count} записей`);
      });

    if (Object.keys(groupedByDate).length > 10) {
      console.log(`  ... и еще ${Object.keys(groupedByDate).length - 10} дат`);
    }

    // Запрашиваем подтверждение
    console.log('\n⚠️  ВНИМАНИЕ: Это действие обнулит поле durationMinutes для всех найденных записей!');
    console.log('   Это означает, что длительность тренировок станет неопределенной (null).');
    
    // В production среде лучше добавить интерактивное подтверждение
    // Для автоматического выполнения используем переменную окружения
    const autoConfirm = process.env.AUTO_CONFIRM === 'true';
    
    if (!autoConfirm) {
      console.log('\n💡 Для выполнения скрипта запустите его с переменной AUTO_CONFIRM=true');
      console.log('   Пример: AUTO_CONFIRM=true npm run clear-durations');
      return;
    }

    console.log('\n🔄 Начинаем очистку...');

    // Обновляем записи, устанавливая durationMinutes в null
    const result = await db
      .update(rpeSurveyResponse)
      .set({ durationMinutes: null })
      .where(eq(rpeSurveyResponse.durationMinutes, 70));

    console.log(`✅ Успешно очищено ${recordsWithDefault70.length} записей`);
    console.log('📝 Теперь тренерам нужно будет заново указать длительность для своих тренировок');
    
    // Дополнительная проверка
    const remainingRecords = await db
      .select({ count: rpeSurveyResponse.id })
      .from(rpeSurveyResponse)
      .where(eq(rpeSurveyResponse.durationMinutes, 70));

    if (remainingRecords.length === 0) {
      console.log('🎉 Проверка: записей с длительностью 70 минут больше не найдено');
    } else {
      console.log(`⚠️  Внимание: все еще осталось ${remainingRecords.length} записей с длительностью 70 минут`);
    }

  } catch (error) {
    console.error('❌ Ошибка при очистке длительностей:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
clearTrainingDurations()
  .then(() => {
    console.log('\n🏁 Скрипт завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
