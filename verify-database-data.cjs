const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyDatabaseData() {
  try {
    console.log('🔍 Проверяем корректность данных в базе...\n');
    
    // 1. Проверяем игровые модели клуба Alashkert
    const alashkertClubId = 'c9ba11c6-eb0c-4fa8-9db1-ad18d8443e69';
    
    const modelsResult = await pool.query(`
      SELECT "playerId", "matchesCount", "totalMinutes", metrics
      FROM "PlayerGameModel" 
      WHERE "clubId" = $1
      ORDER BY "matchesCount" DESC, "calculatedAt" DESC
    `, [alashkertClubId]);
    
    console.log('🎯 Игровые модели клуба Alashkert:');
    modelsResult.rows.forEach((model, index) => {
      console.log(`\n   ${index + 1}. Игрок: ${model.playerId}`);
      console.log(`      Матчей: ${model.matchesCount}, Минут: ${model.totalMinutes}`);
      
      if (model.metrics) {
        const metrics = typeof model.metrics === 'string' ? JSON.parse(model.metrics) : model.metrics;
        console.log(`      Метрики (за 1 минуту):`);
        Object.entries(metrics).forEach(([metric, value]) => {
          console.log(`        ${metric}: ${value.toFixed(2)}`);
        });
      }
    });
    
    // 2. Проверяем GPS данные отчета
    const reportId = '019f40bf-400f-4bcd-b599-c18071f7f276';
    
    const reportDataResult = await pool.query(`
      SELECT "playerId", "canonicalMetric", value
      FROM "GpsReportData" 
      WHERE "gpsReportId" = $1
      AND "canonicalMetric" = 'total_distance'
      ORDER BY "playerId"
    `, [reportId]);
    
    console.log('\n📊 GPS данные отчета (total_distance):');
    reportDataResult.rows.forEach(row => {
      console.log(`   Игрок ${row.playerId}: ${row.value} м`);
    });
    
    // 3. Проверяем время игры
    const durationResult = await pool.query(`
      SELECT "playerId", value
      FROM "GpsReportData" 
      WHERE "gpsReportId" = $1
      AND "canonicalMetric" = 'duration'
      ORDER BY "playerId"
    `, [reportId]);
    
    console.log('\n⏰ Время игры (в секундах):');
    durationResult.rows.forEach(row => {
      const minutes = parseFloat(row.value) / 60;
      console.log(`   Игрок ${row.playerId}: ${row.value} сек (${minutes.toFixed(1)} мин)`);
    });
    
    // 4. Проверяем расчеты для конкретного игрока
    const testPlayerId = '30ae6e0a-aee2-4bd5-a440-b5d51cc5a667';
    
    const playerModel = modelsResult.rows.find(m => m.playerId === testPlayerId);
    const playerDuration = durationResult.rows.find(d => d.playerId === testPlayerId);
    const playerDistance = reportDataResult.rows.find(d => d.playerId === testPlayerId);
    
    if (playerModel && playerDuration && playerDistance) {
      console.log(`\n🧮 Тестовый расчет для игрока ${testPlayerId}:`);
      
      const actualDuration = parseFloat(playerDuration.value) / 60;
      const currentDistance = parseFloat(playerDistance.value);
      
      console.log(`   Время игры: ${actualDuration.toFixed(1)} минут`);
      console.log(`   Текущая дистанция: ${currentDistance} м`);
      
      if (playerModel.metrics) {
        const metrics = typeof playerModel.metrics === 'string' ? JSON.parse(playerModel.metrics) : playerModel.metrics;
        const modelDistancePerMinute = metrics.total_distance || 0;
        const modelDistance = modelDistancePerMinute * actualDuration;
        
        console.log(`   Модельная дистанция за 1 мин: ${modelDistancePerMinute.toFixed(2)} м/мин`);
        console.log(`   Модельная дистанция за ${actualDuration.toFixed(1)} мин: ${modelDistance.toFixed(0)} м`);
        
        const percentageDiff = modelDistance > 0 ? ((currentDistance - modelDistance) / modelDistance) * 100 : 0;
        console.log(`   Процентная разница: ${percentageDiff.toFixed(1)}%`);
      }
    }
    
    await pool.end();
    console.log('\n✅ Проверка данных завершена');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

verifyDatabaseData();
