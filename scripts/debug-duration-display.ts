#!/usr/bin/env tsx

/**
 * Скрипт для отладки отображения длительности в интерфейсе
 */

import { db } from '../src/lib/db';
import { rpeSurveyResponse, player, team } from '../src/db/schema';
import { eq, desc, gte, lte, and } from 'drizzle-orm';

async function debugDurationDisplay() {
  console.log('🔍 Отладка отображения длительности в интерфейсе...');
  
  try {
    // Получаем команды
    const teams = await db.select().from(team).limit(5);
    console.log(`📊 Найдено ${teams.length} команд`);

    for (const teamRecord of teams) {
      console.log(`\n🏆 Команда: ${teamRecord.name} (ID: ${teamRecord.id})`);
      
      // Проверяем данные за последние 7 дней
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      for (let i = 0; i < 3; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        console.log(`\n📅 Дата: ${dateStr}`);
        
        // Формируем диапазон на весь день (как в API)
        const startDate = new Date(dateStr);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateStr);
        endDate.setHours(23, 59, 59, 999);

        // Получаем ответы RPE за день (как в API)
        const responses = await db.select({
          id: rpeSurveyResponse.id,
          playerId: rpeSurveyResponse.playerId,
          durationMinutes: rpeSurveyResponse.durationMinutes,
          rpeScore: rpeSurveyResponse.rpeScore,
          createdAt: rpeSurveyResponse.createdAt,
        })
          .from(rpeSurveyResponse)
          .leftJoin(player, eq(rpeSurveyResponse.playerId, player.id))
          .where(
            and(
              eq(player.teamId, teamRecord.id),
              gte(rpeSurveyResponse.createdAt, startDate),
              lte(rpeSurveyResponse.createdAt, endDate)
            )
          );

        if (responses.length === 0) {
          console.log('   ❌ Нет данных');
          continue;
        }

        // Воспроизводим логику API
        const individualDurations: Record<string, number> = {};
        let globalDuration: number | null = null;

        const durations = responses
          .map(r => r.durationMinutes)
          .filter(d => d !== null && d !== undefined);

        console.log(`   📊 Найдено ${responses.length} ответов, ${durations.length} с длительностью`);
        
        if (durations.length > 0) {
          const uniqueDurations = [...new Set(durations)];
          console.log(`   📈 Уникальные длительности: ${uniqueDurations.join(', ')}`);
          
          if (uniqueDurations.length === 1) {
            globalDuration = uniqueDurations[0];
            console.log(`   ✅ Общая длительность: ${globalDuration} мин`);
          } else {
            responses.forEach(response => {
              if (response.durationMinutes) {
                individualDurations[response.playerId] = response.durationMinutes;
              }
            });
            console.log(`   📋 Индивидуальные длительности: ${Object.keys(individualDurations).length} игроков`);
            
            // Показываем несколько примеров
            Object.entries(individualDurations).slice(0, 3).forEach(([playerId, duration]) => {
              console.log(`     - Игрок ${playerId}: ${duration} мин`);
            });
          }
        } else {
          console.log('   ⚠️  Ни у одного ответа нет длительности');
        }

        // Симулируем вызов API
        const apiResult = {
          globalDuration,
          individualDurations
        };
        
        console.log(`   🔌 API вернет: globalDuration=${apiResult.globalDuration}, индивидуальных=${Object.keys(apiResult.individualDurations).length}`);
      }
    }

    // Дополнительная проверка: есть ли в базе что-то странное
    console.log('\n🔍 Дополнительная проверка базы данных:');
    
    const allDurations = await db
      .select({
        durationMinutes: rpeSurveyResponse.durationMinutes,
        count: rpeSurveyResponse.id
      })
      .from(rpeSurveyResponse)
      .where(gte(rpeSurveyResponse.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))); // последние 30 дней

    const durationStats = allDurations.reduce((acc, record) => {
      const duration = record.durationMinutes || 'null';
      acc[duration] = (acc[duration] || 0) + 1;
      return acc;
    }, {} as Record<string | number, number>);

    console.log('📊 Статистика длительностей за последние 30 дней:');
    Object.entries(durationStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([duration, count]) => {
        console.log(`   ${duration} мин: ${count} записей`);
      });

  } catch (error) {
    console.error('❌ Ошибка при отладке:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
debugDurationDisplay()
  .then(() => {
    console.log('\n🏁 Отладка завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
