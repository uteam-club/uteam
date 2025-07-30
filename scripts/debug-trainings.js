// Скопируйте и вставьте этот код в консоль браузера (F12 → Console)

async function debugTrainings() {
  try {
    console.log('🔍 Проверяем тренировки...');
    
    // Получаем все команды
    const teamsResponse = await fetch('/api/teams');
    const teams = await teamsResponse.json();
    console.log('📊 Команды:', teams);
    
    // Находим FDC Vista
    const fdcVista = teams.find(team => team.name === 'FDC Vista');
    if (!fdcVista) {
      console.log('❌ Команда FDC Vista не найдена');
      return;
    }
    
    console.log('🎯 Найдена команда FDC Vista:', fdcVista);
    
    // Проверяем тренировки через диагностический API
    const debugResponse = await fetch(`/api/debug-trainings?teamId=${fdcVista.id}`);
    const debugData = await debugResponse.json();
    console.log('🔍 Диагностика тренировок:', debugData);
    
    // Проверяем обычный API тренировок
    const trainingsResponse = await fetch(`/api/trainings?teamId=${fdcVista.id}`);
    const trainings = await trainingsResponse.json();
    console.log('📊 Тренировки из основного API:', trainings);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Запускаем диагностику
debugTrainings(); 