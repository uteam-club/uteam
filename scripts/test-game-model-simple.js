// Простой тест API игровых моделей
const fetch = require('node-fetch');

const BASE_URL = 'http://fdcvista.localhost:3000';
const PLAYER_ID = '979f330a-1605-4fc0-bdab-9f6538d18621';

async function testGameModelAPI() {
  console.log('🧪 Тестирование API игровых моделей...\n');

  try {
    // Тест 1: Получение игровой модели (должен вернуть 401 без авторизации)
    console.log('1️⃣ Тест получения игровой модели...');
    const gameModelResponse = await fetch(`${BASE_URL}/api/players/${PLAYER_ID}/game-model`);
    
    console.log(`Статус: ${gameModelResponse.status}`);
    
    if (gameModelResponse.status === 401) {
      console.log('✅ Ожидаемая ошибка авторизации - API работает корректно');
    } else if (gameModelResponse.status === 500) {
      console.log('❌ Ошибка сервера - нужно исправить');
      const errorText = await gameModelResponse.text();
      console.log('Детали ошибки:', errorText);
    } else {
      console.log('⚠️ Неожиданный статус:', gameModelResponse.status);
    }

    // Тест 2: Получение настроек
    console.log('\n2️⃣ Тест получения настроек...');
    const settingsResponse = await fetch(`${BASE_URL}/api/players/${PLAYER_ID}/game-model/settings`);
    
    console.log(`Статус: ${settingsResponse.status}`);
    
    if (settingsResponse.status === 401) {
      console.log('✅ Ожидаемая ошибка авторизации - API работает корректно');
    } else if (settingsResponse.status === 500) {
      console.log('❌ Ошибка сервера - нужно исправить');
      const errorText = await settingsResponse.text();
      console.log('Детали ошибки:', errorText);
    } else {
      console.log('⚠️ Неожиданный статус:', settingsResponse.status);
    }

    console.log('\n🎉 Тесты завершены!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

// Запускаем тесты
testGameModelAPI();

