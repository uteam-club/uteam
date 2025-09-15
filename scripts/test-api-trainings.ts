import 'dotenv/config';

async function testApiTrainings() {
  try {
    console.log('🔍 Тестируем API /api/trainings...');
    
    const response = await fetch('http://localhost:3000/api/trainings', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Ошибка API:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log(`📊 Получено тренировок: ${data.length}`);
    
    // Группируем по типам
    const typeGroups = data.reduce((acc: Record<string, number>, t: any) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📈 Распределение по типам из API:');
    Object.entries(typeGroups).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} тренировок`);
    });
    
    // Показываем примеры
    console.log('\n📋 Примеры тренировок из API:');
    const uniqueTypes = [...new Set(data.map((t: any) => t.type))];
    uniqueTypes.forEach(type => {
      const example = data.find((t: any) => t.type === type);
      if (example) {
        console.log(`  ${type}: "${example.title}" (${example.id})`);
      }
    });
    
    // Ищем тренировки с названием "Gym"
    const gymTrainings = data.filter((t: any) => 
      t.title.toLowerCase().includes('gym')
    );
    
    console.log('\n🏋️ Тренировки с "Gym" в названии:');
    gymTrainings.forEach((t: any) => {
      console.log(`  "${t.title}" - тип: ${t.type}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error);
  } finally {
    process.exit(0);
  }
}

testApiTrainings();
