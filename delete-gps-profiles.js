const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq } = require('drizzle-orm');

// Импортируем схемы
const { gpsProfile, gpsColumnMapping, gpsReport, gpsPlayerMapping } = require('./src/db/schema/index.ts');

// Подключение к базе данных
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

async function deleteGpsProfiles() {
  try {
    console.log('🔍 Поиск GPS профилей...');
    
    // Найдем все GPS профили
    const profiles = await db.select().from(gpsProfile);
    console.log(`Найдено профилей: ${profiles.length}`);
    
    for (const profile of profiles) {
      console.log(`\n📋 Профиль: ${profile.name} (${profile.gpsSystem})`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Клуб: ${profile.clubId}`);
      console.log(`   Активен: ${profile.isActive}`);
      
      // Проверим, используется ли профиль в отчетах
      const reports = await db.select().from(gpsReport).where(eq(gpsReport.profileId, profile.id));
      console.log(`   Отчетов с этим профилем: ${reports.length}`);
      
      if (reports.length > 0) {
        console.log(`   ⚠️  Профиль используется в ${reports.length} отчетах. Сначала удалим отчеты...`);
        
        // Удалим маппинги игроков для этих отчетов
        for (const report of reports) {
          await db.delete(gpsPlayerMapping).where(eq(gpsPlayerMapping.gpsReportId, report.id));
          console.log(`   🗑️  Удалены маппинги игроков для отчета ${report.id}`);
        }
        
        // Удалим отчеты
        await db.delete(gpsReport).where(eq(gpsReport.profileId, profile.id));
        console.log(`   🗑️  Удалены ${reports.length} отчетов`);
      }
      
      // Удалим маппинги колонок
      const columnMappings = await db.select().from(gpsColumnMapping).where(eq(gpsColumnMapping.gpsProfileId, profile.id));
      if (columnMappings.length > 0) {
        await db.delete(gpsColumnMapping).where(eq(gpsColumnMapping.gpsProfileId, profile.id));
        console.log(`   🗑️  Удалены ${columnMappings.length} маппингов колонок`);
      }
      
      // Удалим сам профиль
      await db.delete(gpsProfile).where(eq(gpsProfile.id, profile.id));
      console.log(`   ✅ Профиль "${profile.name}" удален`);
    }
    
    console.log('\n🎉 Все GPS профили успешно удалены!');
    
  } catch (error) {
    console.error('❌ Ошибка при удалении профилей:', error);
  } finally {
    await sql.end();
  }
}

// Запускаем удаление
deleteGpsProfiles();
