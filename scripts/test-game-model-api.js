// Тестовый скрипт для проверки API игровых моделей
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testGameModelAPI() {
  console.log('🧪 Тестирование API игровых моделей...\n');

  try {
    // Тест 1: Получение списка игроков
    console.log('1️⃣ Получение списка игроков...');
    const playersResponse = await fetch(`${BASE_URL}/api/players`);
    
    if (!playersResponse.ok) {
      console.log('❌ Не удалось получить список игроков');
      return;
    }
    
    const players = await playersResponse.json();
    console.log(`✅ Найдено игроков: ${players.length}`);
    
    if (players.length === 0) {
      console.log('⚠️ Нет игроков для тестирования');
      return;
    }

    // Берем первого игрока для тестирования
    const testPlayer = players[0];
    console.log(`🎯 Тестируем с игроком: ${testPlayer.firstName} ${testPlayer.lastName} (ID: ${testPlayer.id})\n`);

    // Тест 2: Получение игровой модели
    console.log('2️⃣ Получение игровой модели...');
    const gameModelResponse = await fetch(`${BASE_URL}/api/players/${testPlayer.id}/game-model`);
    
    if (!gameModelResponse.ok) {
      console.log('❌ Ошибка при получении игровой модели:', gameModelResponse.status);
      const errorText = await gameModelResponse.text();
      console.log('Детали ошибки:', errorText);
      return;
    }
    
    const gameModelData = await gameModelResponse.json();
    console.log('✅ Игровая модель получена успешно!');
    console.log('📊 Данные модели:', {
      success: gameModelData.success,
      hasModel: !!gameModelData.model,
      hasSettings: !!gameModelData.settings,
      matchesCount: gameModelData.model?.matchesCount || 0
    });

    // Тест 3: Получение настроек
    console.log('\n3️⃣ Получение настроек игровой модели...');
    const settingsResponse = await fetch(`${BASE_URL}/api/players/${testPlayer.id}/game-model/settings`);
    
    if (!settingsResponse.ok) {
      console.log('❌ Ошибка при получении настроек:', settingsResponse.status);
      return;
    }
    
    const settingsData = await settingsResponse.json();
    console.log('✅ Настройки получены успешно!');
    console.log('⚙️ Настройки:', {
      success: settingsData.success,
      selectedMetrics: settingsData.settings?.selectedMetrics?.length || 0,
      metricUnits: Object.keys(settingsData.settings?.metricUnits || {}).length
    });

    console.log('\n🎉 Все тесты прошли успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

// Запускаем тесты
testGameModelAPI();

