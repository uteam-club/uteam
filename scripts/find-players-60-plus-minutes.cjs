const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
  port: 6432,
  database: 'uteam',
  user: 'uteam-admin',
  password: 'Mell567234!',
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync('./yandex_root.crt').toString()
  }
});

async function findPlayers60PlusMinutes() {
  try {
    console.log('🔍 Поиск игроков FC Alashkert с 60+ минутами игры...\n');

    // Получаем все GPS отчеты FC Alashkert
    const alashkertReportsQuery = `
      SELECT 
        gr.id,
        gr.name,
        gr."eventId",
        gr."eventType",
        gr."processedData"
      FROM "GpsReport" gr
      JOIN "Club" c ON gr."clubId" = c.id
      WHERE c.name = 'FC Alashkert' AND gr."eventType" = 'MATCH'
      ORDER BY gr."createdAt" DESC;
    `;

    const alashkertReportsResult = await pool.query(alashkertReportsQuery);
    console.log(`📊 Найдено отчетов FC Alashkert: ${alashkertReportsResult.rows.length}`);

    // Анализируем каждого игрока
    const playerStats = {};

    alashkertReportsResult.rows.forEach((report, reportIndex) => {
      console.log(`\n📊 ОТЧЕТ ${reportIndex + 1}: ${report.name}`);
      
      if (report.processedData && report.processedData.length > 0) {
        report.processedData.forEach((player) => {
          const playerName = player.name || player.Player || 'Unknown';
          const timeValue = player.Time || player.time || '00:00:00';
          
          // Парсим время
          const timeParts = timeValue.split(':');
          const hours = parseInt(timeParts[0]) || 0;
          const minutes = parseInt(timeParts[1]) || 0;
          const totalMinutes = hours * 60 + minutes;

          if (!playerStats[playerName]) {
            playerStats[playerName] = {
              name: playerName,
              playerId: player.playerId,
              matches: [],
              totalMinutes: 0,
              matches60Plus: 0
            };
          }

          playerStats[playerName].matches.push({
            reportName: report.name,
            time: timeValue,
            minutes: totalMinutes,
            is60Plus: totalMinutes >= 60
          });

          playerStats[playerName].totalMinutes += totalMinutes;
          if (totalMinutes >= 60) {
            playerStats[playerName].matches60Plus++;
          }
        });
      }
    });

    // Выводим статистику по игрокам
    console.log('\n📊 СТАТИСТИКА ИГРОКОВ FC ALASHKERT:');
    
    const sortedPlayers = Object.values(playerStats).sort((a, b) => b.matches60Plus - a.matches60Plus);
    
    sortedPlayers.forEach((player, index) => {
      console.log(`\n${index + 1}. ${player.name} (ID: ${player.playerId})`);
      console.log(`   📊 Всего матчей: ${player.matches.length}`);
      console.log(`   📊 Матчей с 60+ минутами: ${player.matches60Plus}`);
      console.log(`   📊 Общее время: ${player.totalMinutes} минут`);
      console.log(`   📊 Среднее время: ${(player.totalMinutes / player.matches.length).toFixed(1)} минут`);
      
      if (player.matches60Plus > 0) {
        console.log(`   ✅ ИГРОК ПОДХОДИТ ДЛЯ ИГРОВОЙ МОДЕЛИ!`);
        console.log(`   📋 Матчи с 60+ минутами:`);
        player.matches.filter(m => m.is60Plus).forEach(match => {
          console.log(`      - ${match.reportName}: ${match.time} (${match.minutes} мин)`);
        });
      } else {
        console.log(`   ❌ Игрок НЕ подходит для игровой модели (нет матчей с 60+ минутами)`);
        console.log(`   📋 Все матчи:`);
        player.matches.forEach(match => {
          console.log(`      - ${match.reportName}: ${match.time} (${match.minutes} мин)`);
        });
      }
    });

    // Подсчитываем общую статистику
    const totalPlayers = sortedPlayers.length;
    const playersWith60Plus = sortedPlayers.filter(p => p.matches60Plus > 0).length;
    
    console.log('\n📊 ОБЩАЯ СТАТИСТИКА:');
    console.log(`   📊 Всего игроков: ${totalPlayers}`);
    console.log(`   📊 Игроков с 60+ минутами: ${playersWith60Plus}`);
    console.log(`   📊 Процент игроков с 60+ минутами: ${((playersWith60Plus / totalPlayers) * 100).toFixed(1)}%`);

    if (playersWith60Plus === 0) {
      console.log('\n❌ ПРОБЛЕМА НАЙДЕНА!');
      console.log('У FC Alashkert НЕТ игроков, которые играют 60+ минут в матчах!');
      console.log('Это объясняет, почему игровая модель не отображается.');
    } else {
      console.log('\n✅ Игроки с 60+ минутами найдены!');
      console.log('Проблема может быть в другом месте кода.');
    }

  } catch (error) {
    console.error('❌ Ошибка при поиске игроков:', error);
  } finally {
    await pool.end();
  }
}

findPlayers60PlusMinutes(); 