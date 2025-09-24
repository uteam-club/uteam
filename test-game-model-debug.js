#!/usr/bin/env node

/**
 * Скрипт для отладки расчета игровых моделей
 */

import { execSync } from 'child_process';

console.log('🔍 Отладка расчета игровых моделей...\n');

// Проверяем наличие DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL не установлен!');
  process.exit(1);
}

try {
  const teamId = 'e8ed8e72-8c24-4f7c-961b-c6e3043a9b62';
  const clubId = 'c9ba11c6-eb0c-4fa8-9db1-ad18d8443e69';

  // 1. Проверяем игроков команды
  console.log('👥 Игроки команды:');
  const players = execSync(`psql $DATABASE_URL -c "SELECT id, \\"firstName\\", \\"lastName\\" FROM \\"Player\\" WHERE \\"teamId\\" = '${teamId}' LIMIT 5;"`, {
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log(players);

  // 2. Проверяем матчи команды
  console.log('🏆 Матчи команды:');
  const matches = execSync(`psql $DATABASE_URL -c "SELECT id, \\"teamId\\", date FROM \\"Match\\" WHERE \\"teamId\\" = '${teamId}' ORDER BY date DESC LIMIT 5;"`, {
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log(matches);

  // 3. Проверяем GPS отчеты для матчей
  console.log('📊 GPS отчеты для матчей:');
  const gpsReports = execSync(`psql $DATABASE_URL -c "SELECT gr.id, gr.\\"eventId\\", gr.\\"createdAt\\" FROM \\"GpsReport\\" gr JOIN \\"Match\\" m ON gr.\\"eventId\\" = m.id WHERE m.\\"teamId\\" = '${teamId}' AND gr.\\"eventType\\" = 'match' ORDER BY gr.\\"createdAt\\" DESC LIMIT 5;"`, {
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log(gpsReports);

  // 4. Проверяем данные игроков
  console.log('📈 Данные игроков (duration):');
  const playerData = execSync(`psql $DATABASE_URL -c "SELECT grd.\\"playerId\\", grd.\\"canonicalMetric\\", grd.\\"value\\" FROM \\"GpsReportData\\" grd JOIN \\"GpsReport\\" gr ON grd.\\"gpsReportId\\" = gr.id JOIN \\"Match\\" m ON gr.\\"eventId\\" = m.id WHERE m.\\"teamId\\" = '${teamId}' AND gr.\\"eventType\\" = 'match' AND grd.\\"canonicalMetric\\" = 'duration' ORDER BY gr.\\"createdAt\\" DESC LIMIT 10;"`, {
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log(playerData);

  // 5. Проверяем, есть ли матчи с 60+ минутами
  console.log('⏰ Матчи с 60+ минутами:');
  const validMatches = execSync(`psql $DATABASE_URL -c "SELECT grd.\\"playerId\\", grd.\\"value\\" as duration_seconds, (grd.\\"value\\"::float / 60) as duration_minutes FROM \\"GpsReportData\\" grd JOIN \\"GpsReport\\" gr ON grd.\\"gpsReportId\\" = gr.id JOIN \\"Match\\" m ON gr.\\"eventId\\" = m.id WHERE m.\\"teamId\\" = '${teamId}' AND gr.\\"eventType\\" = 'match' AND grd.\\"canonicalMetric\\" = 'duration' AND grd.\\"value\\"::float >= 3600 ORDER BY gr.\\"createdAt\\" DESC;"`, {
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log(validMatches);

  console.log('\n✅ Отладка завершена');

} catch (error) {
  console.error('❌ Ошибка при отладке:', error.message);
  process.exit(1);
}
