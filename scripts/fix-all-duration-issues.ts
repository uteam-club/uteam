#!/usr/bin/env tsx

/**
 * Комплексное исправление всех проблем с длительностью тренировок
 */

import { db } from '../src/lib/db';
import { rpeSurveyResponse } from '../src/db/schema';
import { eq, or, and, gte } from 'drizzle-orm';

async function fixAllDurationIssues() {
  console.log('🛠️  Комплексное исправление проблем с длительностью тренировок...');
  
  try {
    // Находим все записи с подозрительными значениями длительности
    const suspiciousRecords = await db
      .select({
        id: rpeSurveyResponse.id,
        playerId: rpeSurveyResponse.playerId,
        durationMinutes: rpeSurveyResponse.durationMinutes,
        rpeScore: rpeSurveyResponse.rpeScore,
        createdAt: rpeSurveyResponse.createdAt
      })
      .from(rpeSurveyResponse)
      .where(
        or(
          eq(rpeSurveyResponse.durationMinutes, 70),  // 70 минут (из скриншота)
          eq(rpeSurveyResponse.durationMinutes, 0),   // 0 минут (неправильно)
          and(
            gte(rpeSurveyResponse.durationMinutes, 60), // от 60 до 90 - подозрительный диапазон
            eq(rpeSurveyResponse.durationMinutes, 80)   // 80 минут тоже может быть дефолтом
          )
        )
      );

    console.log(`📊 Найдено ${suspiciousRecords.length} записей с подозрительными длительностями`);

    if (suspiciousRecords.length === 0) {
      console.log('✅ Подозрительных записей не найдено');
      return;
    }

    // Группируем по длительности
    const durationGroups = suspiciousRecords.reduce((acc, record) => {
      const duration = record.durationMinutes || 0;
      acc[duration] = (acc[duration] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    console.log('\n📋 Найденные подозрительные длительности:');
    Object.entries(durationGroups).forEach(([duration, count]) => {
      console.log(`  ${duration} мин: ${count} записей`);
    });

    // Проверяем записи за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSuspicious = suspiciousRecords.filter(r => r.createdAt > thirtyDaysAgo);
    console.log(`\n📅 За последние 30 дней: ${recentSuspicious.length} подозрительных записей`);

    // Показываем примеры
    console.log('\n🔍 Примеры подозрительных записей:');
    suspiciousRecords.slice(0, 10).forEach((record, index) => {
      const date = record.createdAt.toISOString().split('T')[0];
      const time = record.createdAt.toISOString().split('T')[1].substr(0, 5);
      console.log(`  ${index + 1}. ${date} ${time} - RPE: ${record.rpeScore}, Длительность: ${record.durationMinutes} мин`);
    });

    console.log('\n⚠️  ВНИМАНИЕ: Обнаружены записи с потенциально неправильными длительностями!');
    console.log('   Это могут быть:');
    console.log('   - 70 мин: дефолтное значение из интерфейса');
    console.log('   - 80 мин: другое дефолтное значение');
    console.log('   - 0 мин: ошибка сохранения');

    const autoConfirm = process.env.AUTO_CONFIRM === 'true';
    
    if (!autoConfirm) {
      console.log('\n💡 Для исправления запустите с AUTO_CONFIRM=true');
      console.log('   Пример: AUTO_CONFIRM=true npm run fix-all-durations');
      console.log('\n🔧 Что будет сделано:');
      console.log('   - Все записи с длительностью 70, 80, 0 минут будут очищены (установлены в null)');
      console.log('   - Тренерам нужно будет заново указать корректную длительность');
      return;
    }

    console.log('\n🔧 Исправляем все подозрительные длительности...');

    // Обновляем записи порциями
    const suspiciousValues = [70, 80, 0];
    let totalFixed = 0;

    for (const suspiciousValue of suspiciousValues) {
      const recordsToFix = suspiciousRecords.filter(r => r.durationMinutes === suspiciousValue);
      
      if (recordsToFix.length === 0) continue;

      console.log(`   🔄 Исправляем ${recordsToFix.length} записей с длительностью ${suspiciousValue} мин...`);

      // Обновляем записи с этим значением
      const result = await db
        .update(rpeSurveyResponse)
        .set({ durationMinutes: null })
        .where(eq(rpeSurveyResponse.durationMinutes, suspiciousValue));

      totalFixed += recordsToFix.length;
      console.log(`   ✅ Исправлено ${recordsToFix.length} записей с ${suspiciousValue} мин`);
    }

    console.log(`\n🎉 Всего исправлено: ${totalFixed} записей`);

    // Финальная проверка
    const remainingSuspicious = await db
      .select({ count: rpeSurveyResponse.id })
      .from(rpeSurveyResponse)
      .where(
        or(
          eq(rpeSurveyResponse.durationMinutes, 70),
          eq(rpeSurveyResponse.durationMinutes, 80),
          eq(rpeSurveyResponse.durationMinutes, 0)
        )
      );

    if (remainingSuspicious.length === 0) {
      console.log('✅ Проверка: подозрительных записей больше нет');
    } else {
      console.log(`⚠️  Внимание: все еще осталось ${remainingSuspicious.length} подозрительных записей`);
    }

    console.log('\n📋 Результат:');
    console.log('   ✅ Все неправильные длительности очищены');
    console.log('   ✅ В интерфейсе будет отображаться "Не задано"');
    console.log('   📝 Тренерам нужно заново указать корректное время для каждой тренировки');

  } catch (error) {
    console.error('❌ Ошибка при исправлении:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
fixAllDurationIssues()
  .then(() => {
    console.log('\n🏁 Комплексное исправление завершено');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
