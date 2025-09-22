// Тест API для игровых моделей игроков

const API_BASE = 'http://localhost:3000';

async function testPlayerModels() {
  console.log('🧪 Тестирование API игровых моделей игроков...\n');

  try {
    // Тест с реальным reportId (нужно будет заменить на актуальный)
    const testReportId = 'test-report-id';
    const testProfileId = 'test-profile-id';
    
    console.log(`1️⃣ Тест API /api/gps/reports/${testReportId}/player-models...`);
    const response = await fetch(`${API_BASE}/api/gps/reports/${testReportId}/player-models?profileId=${testProfileId}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API работает');
      console.log(`📊 Количество игроков: ${data.players?.length || 0}`);
      
      if (data.players && data.players.length > 0) {
        console.log('\n📋 Детали игроков:');
        data.players.forEach((player, index) => {
          console.log(`${index + 1}. ${player.firstName} ${player.lastName}`);
          console.log(`   - Позиция: ${player.position} #${player.jerseyNumber}`);
          console.log(`   - Время игры: ${player.actualDuration} мин`);
          console.log(`   - Есть игровая модель: ${player.hasGameModel ? 'Да' : 'Нет'}`);
          if (player.hasGameModel && player.gameModelInfo) {
            console.log(`   - Модель: ${player.gameModelInfo.matchesCount} матчей, ${player.gameModelInfo.totalMinutes} мин`);
          }
          console.log(`   - Метрики: ${player.metrics?.length || 0} шт.`);
          console.log('   ---');
        });
      } else {
        console.log('❌ Нет данных об игроках');
      }
    } else {
      const error = await response.text();
      console.log('❌ Ошибка API:', response.status, error);
    }

  } catch (error) {
    console.error('❌ Ошибка выполнения тестов:', error.message);
  }
}

// Запускаем тесты
testPlayerModels();
