#!/usr/bin/env tsx

/**
 * Тестируем точно ту дату и команду, что показана на скриншоте
 */

import { db } from '../src/lib/db';
import { rpeSurveyResponse, player, team } from '../src/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

async function testExactDate() {
  console.log('🔍 Тестируем точную дату и команду со скриншота...');
  
  try {
    // Ищем команду FDC Vista
    const fdcVista = await db.select().from(team).where(eq(team.name, 'FDC Vista')).limit(1);
    
    if (fdcVista.length === 0) {
      console.log('❌ Команда FDC Vista не найдена');
      return;
    }

    const teamId = fdcVista[0].id;
    console.log(`🏆 Команда FDC Vista найдена: ${teamId}`);

    // Дата со скриншота: 22.08.2025
    const dateStr = '2025-08-22';
    console.log(`📅 Проверяем дату: ${dateStr}`);

    // Формируем диапазон на весь день (как в API)
    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateStr);
    endDate.setHours(23, 59, 59, 999);

    console.log(`🕐 Диапазон: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    // Получаем всех игроков команды
    const teamPlayers = await db
      .select({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
      })
      .from(player)
      .where(eq(player.teamId, teamId));

    console.log(`👥 Игроков в команде: ${teamPlayers.length}`);

    // Получаем ответы RPE за эту дату
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
          eq(player.teamId, teamId),
          gte(rpeSurveyResponse.createdAt, startDate),
          lte(rpeSurveyResponse.createdAt, endDate)
        )
      );

    console.log(`📊 Ответов RPE за ${dateStr}: ${responses.length}`);

    if (responses.length === 0) {
      console.log('❌ Нет ответов RPE за эту дату');
      return;
    }

    // Анализируем ответы
    console.log('\n📋 Детали ответов:');
    responses.forEach((resp, index) => {
      const playerInfo = teamPlayers.find(p => p.id === resp.playerId);
      const playerName = playerInfo ? `${playerInfo.lastName} ${playerInfo.firstName}` : resp.playerId;
      console.log(`  ${index + 1}. ${playerName}: RPE=${resp.rpeScore}, Длительность=${resp.durationMinutes || 'null'} мин`);
    });

    // Воспроизводим логику API
    const individualDurations: Record<string, number> = {};
    let globalDuration: number | null = null;

    const durations = responses
      .map(r => r.durationMinutes)
      .filter(d => d !== null && d !== undefined);

    console.log(`\n🔢 Длительности: [${durations.join(', ')}]`);

    if (durations.length > 0) {
      const uniqueDurations = [...new Set(durations)];
      console.log(`📈 Уникальные длительности: [${uniqueDurations.join(', ')}]`);
      
      if (uniqueDurations.length === 1) {
        globalDuration = uniqueDurations[0];
        console.log(`✅ Общая длительность будет: ${globalDuration} мин`);
      } else {
        responses.forEach(response => {
          if (response.durationMinutes) {
            individualDurations[response.playerId] = response.durationMinutes;
          }
        });
        console.log(`📋 Индивидуальные длительности для ${Object.keys(individualDurations).length} игроков`);
      }
    } else {
      console.log('⚠️  Ни у одного ответа нет длительности');
    }

    // Итоговый результат API
    const apiResult = {
      globalDuration,
      individualDurations
    };

    console.log('\n🔌 API /api/surveys/rpe/duration вернет:');
    console.log(`   globalDuration: ${apiResult.globalDuration}`);
    console.log(`   individualDurations: ${JSON.stringify(apiResult.individualDurations, null, 2)}`);

    // Симулируем логику интерфейса
    console.log('\n🖥️  В интерфейсе будет отображаться:');
    teamPlayers.forEach(player => {
      const resp = responses.find(r => r.playerId === player.id);
      if (resp) {
        const playerDuration = apiResult.individualDurations[player.id] || apiResult.globalDuration;
        console.log(`   ${player.lastName} ${player.firstName}: ${playerDuration || 'Не задано'} мин`);
      } else {
        console.log(`   ${player.lastName} ${player.firstName}: Не прошел опрос`);
      }
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
testExactDate()
  .then(() => {
    console.log('\n🏁 Тест завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
