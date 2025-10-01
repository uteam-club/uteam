const { db } = require('./src/lib/db');
const { rpeSurveyResponse, player, team } = require('./src/db/schema');
const { eq, and } = require('drizzle-orm');

async function clearRpeResponsesForAlashkert() {
  try {
    console.log('🔍 Поиск команды FC Alashkert...');
    
    // Находим команду FC Alashkert
    const alashkertTeam = await db
      .select()
      .from(team)
      .where(eq(team.name, 'FC Alashkert'))
      .limit(1);

    if (alashkertTeam.length === 0) {
      console.log('❌ Команда FC Alashkert не найдена');
      return;
    }

    const teamId = alashkertTeam[0].id;
    console.log(`✅ Найдена команда FC Alashkert с ID: ${teamId}`);

    // Находим всех игроков команды
    const players = await db
      .select({ id: player.id, firstName: player.firstName, lastName: player.lastName })
      .from(player)
      .where(eq(player.teamId, teamId));

    console.log(`👥 Найдено игроков в команде: ${players.length}`);
    
    if (players.length === 0) {
      console.log('❌ В команде нет игроков');
      return;
    }

    const playerIds = players.map(p => p.id);
    console.log('Игроки:', players.map(p => `${p.firstName} ${p.lastName}`).join(', '));

    // Находим все RPE ответы игроков команды
    const existingResponses = await db
      .select()
      .from(rpeSurveyResponse)
      .where(and(
        // Используем inArray для поиска по массиву playerId
        require('drizzle-orm').inArray(rpeSurveyResponse.playerId, playerIds)
      ));

    console.log(`📊 Найдено RPE ответов: ${existingResponses.length}`);

    if (existingResponses.length === 0) {
      console.log('✅ RPE ответов для удаления не найдено');
      return;
    }

    // Показываем детали ответов
    console.log('\n📋 Детали найденных ответов:');
    existingResponses.forEach((response, index) => {
      const player = players.find(p => p.id === response.playerId);
      console.log(`${index + 1}. ${player?.firstName} ${player?.lastName} - RPE: ${response.rpeScore}, Дата: ${response.createdAt}`);
    });

    // Удаляем все RPE ответы игроков команды
    console.log('\n🗑️ Удаление RPE ответов...');
    
    const deleteResult = await db
      .delete(rpeSurveyResponse)
      .where(and(
        require('drizzle-orm').inArray(rpeSurveyResponse.playerId, playerIds)
      ));

    console.log(`✅ Успешно удалено RPE ответов: ${existingResponses.length}`);

    // Проверяем, что ответы действительно удалены
    const remainingResponses = await db
      .select()
      .from(rpeSurveyResponse)
      .where(and(
        require('drizzle-orm').inArray(rpeSurveyResponse.playerId, playerIds)
      ));

    if (remainingResponses.length === 0) {
      console.log('✅ Подтверждено: все RPE ответы команды FC Alashkert удалены');
    } else {
      console.log(`⚠️ Внимание: осталось ${remainingResponses.length} ответов`);
    }

  } catch (error) {
    console.error('❌ Ошибка при очистке RPE ответов:', error);
  } finally {
    process.exit(0);
  }
}

clearRpeResponsesForAlashkert();
