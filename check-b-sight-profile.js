const { db } = require('./src/lib/db');
const { gpsProfile, gpsReport } = require('./src/db/schema');
const { eq, and, sql } = require('drizzle-orm');

async function checkB_SightProfile() {
  try {
    console.log('=== ПРОВЕРКА ПРОФИЛЯ B-SIGHT ===');
    
    // Ищем профиль B-SIGHT
    const profiles = await db
      .select()
      .from(gpsProfile)
      .where(sql`LOWER(${gpsProfile.name}) LIKE '%b-sight%' OR LOWER(${gpsProfile.name}) LIKE '%bsight%'`);
    
    console.log('Найдено профилей B-SIGHT:', profiles.length);
    
    if (profiles.length === 0) {
      console.log('❌ Профиль B-SIGHT не найден');
      return;
    }
    
    for (const profile of profiles) {
      console.log('\n📋 Профиль:', profile.name);
      console.log('   ID:', profile.id);
      console.log('   Клуб:', profile.clubId);
      console.log('   Активен:', profile.isActive);
      
      // Ищем отчеты для этого профиля
      const reports = await db
        .select({
          id: gpsReport.id,
          name: gpsReport.name,
          eventType: gpsReport.eventType,
          eventId: gpsReport.eventId,
          profileId: gpsReport.profileId,
          gpsProfileId: gpsReport.gpsProfileId,
          createdAt: gpsReport.createdAt
        })
        .from(gpsReport)
        .where(
          and(
            eq(gpsReport.clubId, profile.clubId),
            sql`(${gpsReport.profileId} = ${profile.id} OR ${gpsReport.gpsProfileId} = ${profile.id})`
          )
        );
      
      console.log('   Отчетов:', reports.length);
      
      if (reports.length > 0) {
        console.log('   📊 Детали отчетов:');
        reports.forEach((report, index) => {
          console.log(`     ${index + 1}. ${report.name}`);
          console.log(`        ID: ${report.id}`);
          console.log(`        Тип: ${report.eventType}`);
          console.log(`        Event ID: ${report.eventId}`);
          console.log(`        Profile ID: ${report.profileId}`);
          console.log(`        GPS Profile ID: ${report.gpsProfileId}`);
          console.log(`        Создан: ${report.createdAt}`);
        });
      } else {
        console.log('   ✅ Отчетов не найдено - профиль можно удалить');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    process.exit(0);
  }
}

checkB_SightProfile();
