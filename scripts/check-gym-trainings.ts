import 'dotenv/config';
import { db } from '../src/lib/db';
import { training } from '../src/db/schema/training';
import { eq, and } from 'drizzle-orm';

async function checkGymTrainings() {
  try {
    console.log('🔍 Проверяем тренировки GYM в базе данных...');
    
    // Получаем все тренировки с типом GYM
    const gymTrainings = await db
      .select({
        id: training.id,
        title: training.title,
        type: training.type,
        clubId: training.clubId,
        createdAt: training.createdAt
      })
      .from(training)
      .where(eq(training.type, 'GYM'));
    
    console.log(`📊 Найдено тренировок GYM: ${gymTrainings.length}`);
    
    if (gymTrainings.length > 0) {
      console.log('📋 Примеры тренировок GYM:');
      gymTrainings.slice(0, 5).forEach(t => {
        console.log(`  "${t.title}" - clubId: ${t.clubId} - ${t.createdAt}`);
      });
      
      // Группируем по clubId
      const clubGroups = gymTrainings.reduce((acc, t) => {
        acc[t.clubId] = (acc[t.clubId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n📈 Распределение GYM тренировок по клубам:');
      Object.entries(clubGroups).forEach(([clubId, count]) => {
        console.log(`  ${clubId}: ${count} тренировок`);
      });
    }
    
    // Проверим конкретный клуб из логов
    const targetClubId = '0af208e0-aed2-4374-bb67-c38443a46b8a';
    console.log(`\n🔍 Проверяем тренировки для клуба ${targetClubId}:`);
    
    const clubTrainings = await db
      .select({
        id: training.id,
        title: training.title,
        type: training.type,
        clubId: training.clubId
      })
      .from(training)
      .where(eq(training.clubId, targetClubId));
    
    console.log(`📊 Всего тренировок в клубе: ${clubTrainings.length}`);
    
    const clubTypeGroups = clubTrainings.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📈 Распределение по типам в клубе:');
    Object.entries(clubTypeGroups).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} тренировок`);
    });
    
    const gymInClub = clubTrainings.filter(t => t.type === 'GYM');
    console.log(`🏋️ GYM тренировок в клубе: ${gymInClub.length}`);
    
    if (gymInClub.length > 0) {
      console.log('📋 Примеры GYM тренировок в клубе:');
      gymInClub.slice(0, 3).forEach(t => {
        console.log(`  "${t.title}" - ${t.type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке GYM тренировок:', error);
  } finally {
    process.exit(0);
  }
}

checkGymTrainings();
