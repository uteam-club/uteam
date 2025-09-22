// Проверка игровых моделей в базе данных

const { db } = require('./src/lib/db');
const { playerGameModel, player } = require('./src/db/schema');

async function checkGameModels() {
  console.log('🔍 Проверка игровых моделей в базе данных...\n');

  try {
    // Получаем все игровые модели
    const gameModels = await db.select().from(playerGameModel);
    console.log(`📊 Найдено игровых моделей: ${gameModels.length}`);

    if (gameModels.length > 0) {
      console.log('\n📋 Детали игровых моделей:');
      for (const model of gameModels) {
        console.log(`  - Игрок: ${model.playerId}`);
        console.log(`    Клуб: ${model.clubId}`);
        console.log(`    Матчей: ${model.matchesCount}`);
        console.log(`    Минут: ${model.totalMinutes}`);
        console.log(`    Рассчитано: ${model.calculatedAt}`);
        console.log(`    Версия: ${model.version}`);
        console.log(`    Метрики: ${Object.keys(model.metrics || {}).length} шт.`);
        console.log('    ---');
      }
    }

    // Получаем всех игроков
    const players = await db.select().from(player);
    console.log(`\n👥 Всего игроков в системе: ${players.length}`);

    // Проверяем, у каких игроков есть игровые модели
    const playersWithModels = new Set(gameModels.map(m => m.playerId));
    const playersWithoutModels = players.filter(p => !playersWithModels.has(p.id));
    
    console.log(`\n✅ Игроков с моделями: ${playersWithModels.size}`);
    console.log(`❌ Игроков без моделей: ${playersWithoutModels.length}`);

    if (playersWithoutModels.length > 0) {
      console.log('\n👥 Игроки без игровых моделей:');
      for (const player of playersWithoutModels) {
        console.log(`  - ${player.firstName} ${player.lastName} (${player.id})`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    process.exit(0);
  }
}

checkGameModels();
