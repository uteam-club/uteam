import 'dotenv/config';
import { db } from '../src/lib/db';
import { training } from '../src/db/schema/training';
import { eq, like } from 'drizzle-orm';

async function main() {
  console.log('🔍 Ищем тренировки с названием "Gym"...');
  
  // Найдем все тренировки с названием "Gym" (регистронезависимо)
  const gymTrainings = await db
    .select()
    .from(training)
    .where(like(training.title, '%Gym%'));
  
  console.log(`📊 Найдено ${gymTrainings.length} тренировок с "Gym" в названии`);
  
  if (gymTrainings.length === 0) {
    console.log('❌ Тренировки с "Gym" не найдены');
    return;
  }
  
  // Покажем примеры
  console.log('📋 Примеры найденных тренировок:');
  gymTrainings.slice(0, 5).forEach((t, i) => {
    console.log(`  ${i + 1}. "${t.title}" - тип: ${t.type}, дата: ${t.date}`);
  });
  
  // Обновим тип на GYM для всех найденных тренировок
  console.log('\n🔄 Обновляем тип тренировок на GYM...');
  
  const updated = await db
    .update(training)
    .set({ type: 'GYM' })
    .where(like(training.title, '%Gym%'))
    .returning();
  
  console.log(`✅ Обновлено ${updated.length} тренировок`);
  
  // Проверим результат
  console.log('\n🔍 Проверяем результат...');
  const updatedGymTrainings = await db
    .select()
    .from(training)
    .where(like(training.title, '%Gym%'));
  
  const gymCount = updatedGymTrainings.filter(t => t.type === 'GYM').length;
  const trainingCount = updatedGymTrainings.filter(t => t.type === 'TRAINING').length;
  
  console.log(`📊 После обновления:`);
  console.log(`  - GYM: ${gymCount} тренировок`);
  console.log(`  - TRAINING: ${trainingCount} тренировок`);
}

main().catch((e) => {
  console.error('❌ Ошибка:', e);
  process.exit(1);
});
