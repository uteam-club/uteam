const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixIncorrectModels() {
  try {
    console.log('🔧 Исправляем неправильные игровые модели...\n');
    
    // Удаляем модели с неправильными данными (время > 200 минут)
    const deleteResult = await pool.query(`
      DELETE FROM "PlayerGameModel" 
      WHERE "totalMinutes" > 200
    `);
    
    console.log(`🗑️  Удалено неправильных моделей: ${deleteResult.rowCount}`);
    
    // Пересчитываем модели для клуба Alashkert с правильной логикой
    const alashkertClubId = 'c9ba11c6-eb0c-4fa8-9db1-ad18d8443e69';
    
    // Получаем все отчеты клуба
    const reportsResult = await pool.query(`
      SELECT id, name, "eventType", "teamId", "clubId", "createdAt"
      FROM "GpsReport" 
      WHERE "clubId" = $1 AND "eventType" = 'match'
      ORDER BY "createdAt" DESC
    `, [alashkertClubId]);
    
    console.log(`📊 Найдено отчетов: ${reportsResult.rows.length}`);
    
    // Получаем все данные отчетов
    const reportIds = reportsResult.rows.map(r => r.id);
    const dataResult = await pool.query(`
      SELECT "gpsReportId", "playerId", "canonicalMetric", value, "createdAt"
      FROM "GpsReportData" 
      WHERE "gpsReportId" = ANY($1)
      ORDER BY "gpsReportId", "playerId", "canonicalMetric"
    `, [reportIds]);
    
    console.log(`📈 Записей данных: ${dataResult.rows.length}`);
    
    // Группируем данные по игрокам и отчетам
    const playerReportData = {};
    dataResult.rows.forEach(row => {
      if (!playerReportData[row.playerId]) {
        playerReportData[row.playerId] = {};
      }
      if (!playerReportData[row.playerId][row.gpsReportId]) {
        playerReportData[row.playerId][row.gpsReportId] = {};
      }
      playerReportData[row.playerId][row.gpsReportId][row.canonicalMetric] = parseFloat(row.value) || 0;
    });
    
    console.log(`👥 Игроков: ${Object.keys(playerReportData).length}`);
    
    let fixedCount = 0;
    
    // Обрабатываем каждого игрока
    for (const [playerId, playerReports] of Object.entries(playerReportData)) {
      console.log(`\n👤 Игрок ${playerId}:`);
      
      // Собираем данные по матчам с правильным расчетом времени
      const matchData = [];
      
      for (const [reportId, metrics] of Object.entries(playerReports)) {
        // Получаем время игры игрока
        const duration = metrics.duration || metrics.time_on_field || 0;
        let actualDuration = 90; // По умолчанию 90 минут
        
        if (typeof duration === 'number') {
          // Если число больше 100, скорее всего это секунды, переводим в минуты
          if (duration > 100) {
            actualDuration = duration / 60;
          } else {
            actualDuration = duration;
          }
        }
        
        // Фильтруем матчи где игрок играл 60+ минут
        if (actualDuration >= 60) {
          const perMinuteMetrics = {};
          Object.entries(metrics).forEach(([metric, value]) => {
            if (metric !== 'duration' && metric !== 'time_on_field' && value > 0) {
              perMinuteMetrics[metric] = value / actualDuration;
            }
          });
          
          matchData.push({
            reportId,
            duration: actualDuration,
            perMinuteMetrics
          });
          
          console.log(`  📊 Отчет ${reportId}: ${actualDuration.toFixed(1)} мин`);
        } else {
          console.log(`  ⏭️  Отчет ${reportId}: ${actualDuration.toFixed(1)} мин (пропущен, < 60 мин)`);
        }
      }
      
      if (matchData.length === 0) {
        console.log(`  ❌ Нет матчей с 60+ минутами`);
        continue;
      }
      
      // Рассчитываем средние значения за 1 минуту
      const averagePerMinuteMetrics = {};
      const metricKeys = Object.keys(matchData[0].perMinuteMetrics);
      
      metricKeys.forEach(metric => {
        let totalPerMinute = 0;
        let validCount = 0;
        
        matchData.forEach(match => {
          if (match.perMinuteMetrics[metric] !== undefined) {
            totalPerMinute += match.perMinuteMetrics[metric];
            validCount++;
          }
        });
        
        if (validCount > 0) {
          averagePerMinuteMetrics[metric] = totalPerMinute / validCount;
        }
      });
      
      console.log(`  ✅ Матчей в модели: ${matchData.length}`);
      console.log(`  📈 Метрик: ${Object.keys(averagePerMinuteMetrics).length}`);
      
      // Обновляем или создаем игровую модель
      await pool.query(`
        INSERT INTO "PlayerGameModel" ("playerId", "clubId", "teamId", metrics, "matchesCount", "totalMinutes", "calculatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT ("playerId", "clubId") 
        DO UPDATE SET 
          metrics = EXCLUDED.metrics,
          "matchesCount" = EXCLUDED."matchesCount",
          "totalMinutes" = EXCLUDED."totalMinutes",
          "calculatedAt" = EXCLUDED."calculatedAt"
      `, [
        playerId,
        alashkertClubId,
        reportsResult.rows[0].teamId, // Используем teamId из первого отчета
        JSON.stringify(averagePerMinuteMetrics),
        matchData.length,
        Math.round(matchData.reduce((sum, m) => sum + m.duration, 0))
      ]);
      
      fixedCount++;
      console.log(`  ✅ Модель исправлена`);
    }
    
    await pool.end();
    console.log(`\n✅ Исправление завершено. Обработано моделей: ${fixedCount}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

fixIncorrectModels();
