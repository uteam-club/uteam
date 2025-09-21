import { seedGpsCanonicalMetrics } from './seed-gps-canonical-metrics';
import { seedGpsPermissions } from './seed-gps-permissions';

async function seedAllGpsData() {
  console.log('🌱 Начало заполнения всех GPS данных...');

  try {
    // Заполняем канонические метрики и единицы измерения
    await seedGpsCanonicalMetrics();
    
    // Заполняем GPS разрешения
    await seedGpsPermissions();
    
    console.log('🎉 Заполнение всех GPS данных завершено!');
  } catch (error) {
    console.error('❌ Ошибка при заполнении GPS данных:', error);
    throw error;
  }
}

// Запускаем скрипт
if (require.main === module) {
  seedAllGpsData()
    .then(() => {
      console.log('✅ Скрипт выполнен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}

export { seedAllGpsData };
