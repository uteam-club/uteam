#!/usr/bin/env tsx

/**
 * Скрипт для проверки реальных данных длительности в RPE опросах
 */

import { db } from '../src/lib/db';
import { rpeSurveyResponse, player } from '../src/db/schema';
import { eq, desc, isNotNull } from 'drizzle-orm';

async function checkRPEDurations() {
  console.log('🔍 Проверяем реальные данные длительности в RPE опросах...');
  
  try {
    // Проверяем все записи с данными о длительности
    const allRecordsWithDuration = await db
      .select({
        id: rpeSurveyResponse.id,
        playerId: rpeSurveyResponse.playerId,
        durationMinutes: rpeSurveyResponse.durationMinutes,
        rpeScore: rpeSurveyResponse.rpeScore,
        createdAt: rpeSurveyResponse.createdAt,
        playerFirstName: player.firstName,
        playerLastName: player.lastName,
      })
      .from(rpeSurveyResponse)
      .leftJoin(player, eq(rpeSurveyResponse.playerId, player.id))
      .where(isNotNull(rpeSurveyResponse.durationMinutes))
      .orderBy(desc(rpeSurveyResponse.createdAt))
      .limit(50);

    console.log(`📊 Найдено ${allRecordsWithDuration.length} записей с указанной длительностью`);

    if (allRecordsWithDuration.length === 0) {
      console.log('❌ Записей с длительностью не найдено!');
      
      // Проверяем общее количество RPE записей
      const totalRecords = await db
        .select({ count: rpeSurveyResponse.id })
        .from(rpeSurveyResponse);
      
      console.log(`📈 Всего RPE записей в базе: ${totalRecords.length}`);
      return;
    }

    // Группируем по длительности
    const durationGroups = allRecordsWithDuration.reduce((acc, record) => {
      const duration = record.durationMinutes || 0;
      acc[duration] = (acc[duration] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    console.log('\n📋 Статистика по длительностям:');
    Object.entries(durationGroups)
      .sort(([, a], [, b]) => b - a)
      .forEach(([duration, count]) => {
        const percentage = ((count / allRecordsWithDuration.length) * 100).toFixed(1);
        console.log(`  ${duration} мин: ${count} записей (${percentage}%)`);
      });

    // Показываем последние записи с 70 минутами
    const records70 = allRecordsWithDuration.filter(r => r.durationMinutes === 70);
    if (records70.length > 0) {
      console.log(`\n🎯 Найдено ${records70.length} записей с длительностью 70 минут:`);
      records70.slice(0, 10).forEach(record => {
        const date = record.createdAt.toISOString().split('T')[0];
        const time = record.createdAt.toISOString().split('T')[1].substr(0, 5);
        console.log(`  ${date} ${time} - ${record.playerLastName} ${record.playerFirstName} (RPE: ${record.rpeScore})`);
      });
      
      if (records70.length > 10) {
        console.log(`  ... и еще ${records70.length - 10} записей`);
      }
    }

    // Проверяем записи за последнюю неделю
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentRecords = allRecordsWithDuration.filter(r => r.createdAt > weekAgo);
    console.log(`\n📅 За последнюю неделю: ${recentRecords.length} записей с длительностью`);
    
    const recent70 = recentRecords.filter(r => r.durationMinutes === 70);
    if (recent70.length > 0) {
      console.log(`   Из них с 70 минутами: ${recent70.length} записей`);
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке данных:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
checkRPEDurations()
  .then(() => {
    console.log('\n🏁 Проверка завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
