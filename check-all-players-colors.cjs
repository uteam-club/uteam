const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkAllPlayersColors() {
  try {
    console.log('🎨 Проверяем цвета плиток для всех игроков...\n');
    
    const reportId = '019f40bf-400f-4bcd-b599-c18071f7f276';
    
    // Получаем всех игроков с их данными
    const playersResult = await pool.query(`
      SELECT DISTINCT "playerId"
      FROM "GpsReportData" 
      WHERE "gpsReportId" = $1
      AND "canonicalMetric" = 'duration'
      AND CAST(value AS INTEGER) >= 3600
      ORDER BY "playerId"
    `, [reportId]);
    
    console.log(`👥 Найдено игроков с >= 60 мин: ${playersResult.rows.length}`);
    
    for (const playerRow of playersResult.rows) {
      const playerId = playerRow.playerId;
      console.log(`\n👤 Игрок ${playerId}:`);
      
      // Получаем данные игрока
      const playerDataResult = await pool.query(`
        SELECT "canonicalMetric", value
        FROM "GpsReportData" 
        WHERE "gpsReportId" = $1 AND "playerId" = $2
        AND "canonicalMetric" IN ('duration', 'total_distance', 'hsr_distance', 'max_speed', 'distance_zone3', 'distance_zone4', 'distance_zone5', 'acc_zone4_count', 'dec_zone4_count')
        ORDER BY "canonicalMetric"
      `, [reportId, playerId]);
      
      const currentMetrics = {};
      let actualDuration = 90;
      
      playerDataResult.rows.forEach(row => {
        if (row.canonicalMetric === 'duration') {
          actualDuration = parseFloat(row.value) / 60;
        } else {
          currentMetrics[row.canonicalMetric] = parseFloat(row.value);
        }
      });
      
      // Получаем игровую модель
      const modelResult = await pool.query(`
        SELECT metrics
        FROM "PlayerGameModel" 
        WHERE "playerId" = $1 AND "clubId" = 'c9ba11c6-eb0c-4fa8-9db1-ad18d8443e69'
      `, [playerId]);
      
      if (modelResult.rows.length === 0) {
        console.log(`   ❌ Игровая модель не найдена`);
        continue;
      }
      
      const modelMetrics = typeof modelResult.rows[0].metrics === 'string' 
        ? JSON.parse(modelResult.rows[0].metrics) 
        : modelResult.rows[0].metrics;
      
      console.log(`   Время: ${actualDuration.toFixed(1)} мин`);
      
      // Проверяем несколько ключевых метрик
      const keyMetrics = ['total_distance', 'hsr_distance', 'max_speed', 'distance_zone3', 'distance_zone4', 'distance_zone5', 'acc_zone4_count', 'dec_zone4_count'];
      
      let hasNonZeroDiff = false;
      
      keyMetrics.forEach(metric => {
        const currentValue = currentMetrics[metric] || 0;
        const modelPerMinute = modelMetrics[metric] || 0;
        const modelValue = modelPerMinute * actualDuration;
        const percentageDiff = modelValue > 0 ? ((currentValue - modelValue) / modelValue) * 100 : 0;
        
        const isPositive = percentageDiff > 0.1;
        const isNegative = percentageDiff < -0.1;
        const isNeutral = Math.abs(percentageDiff) <= 0.1;
        
        if (!isNeutral) {
          hasNonZeroDiff = true;
          console.log(`   ⚠️  ${metric}: ${percentageDiff.toFixed(3)}% (${isPositive ? 'зеленый' : 'красный'})`);
        }
      });
      
      if (!hasNonZeroDiff) {
        console.log(`   ✅ Все метрики нейтральные (0% разницы)`);
      }
    }
    
    await pool.end();
    console.log('\n✅ Проверка цветов завершена');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

checkAllPlayersColors();
