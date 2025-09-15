import 'dotenv/config';
import { db } from '../src/lib/db';
import { training } from '../src/db/schema/training';
import { sql } from 'drizzle-orm';

async function checkTrainingTypes() {
  try {
    console.log('🔍 Проверяем типы тренировок в базе данных...');
    
    // Получаем все тренировки с их типами
    const trainings = await db
      .select({
        id: training.id,
        title: training.title,
        type: training.type,
        createdAt: training.createdAt
      })
      .from(training)
      .orderBy(training.createdAt);
    
    console.log(`📊 Всего тренировок: ${trainings.length}`);
    
    // Группируем по типам
    const typeGroups = trainings.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📈 Распределение по типам:');
    Object.entries(typeGroups).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} тренировок`);
    });
    
    // Показываем примеры тренировок с разными типами
    console.log('\n📋 Примеры тренировок:');
    const uniqueTypes = [...new Set(trainings.map(t => t.type))];
    uniqueTypes.forEach(type => {
      const example = trainings.find(t => t.type === type);
      if (example) {
        console.log(`  ${type}: "${example.title}" (${example.createdAt})`);
      }
    });
    
    // Ищем тренировки, которые могут быть GYM по названию
    const possibleGymTrainings = trainings.filter(t => 
      t.title.toLowerCase().includes('gym') || 
      t.title.toLowerCase().includes('тренажер') ||
      t.title.toLowerCase().includes('зал')
    );
    
    if (possibleGymTrainings.length > 0) {
      console.log('\n🏋️ Тренировки, которые могут быть GYM по названию:');
      possibleGymTrainings.forEach(t => {
        console.log(`  "${t.title}" - тип: ${t.type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке типов тренировок:', error);
  } finally {
    process.exit(0);
  }
}

checkTrainingTypes();
