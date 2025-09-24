#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('🔄 Простой пересчет игровых моделей...\n');

const teamId = 'e8ed8e72-8c24-4f7c-961b-c6e3043a9b62';
const clubId = 'c9ba11c6-eb0c-4fa8-9db1-ad18d8443e69';

try {
  // Получаем игроков команды
  console.log('👥 Получение игроков...');
  const playersResult = execSync(`psql $DATABASE_URL -c "SELECT id FROM \\"Player\\" WHERE \\"teamId\\" = '${teamId}' LIMIT 5;"`, {
    encoding: 'utf8',
    cwd: process.cwd()
  });
  
  console.log('Результат запроса игроков:');
  console.log(playersResult);
  
  // Парсим результат
  const lines = playersResult.split('\n');
  console.log('Все строки:');
  lines.forEach((line, index) => {
    console.log(`${index}: "${line}"`);
  });
  
  const dataLines = lines.filter(line => 
    !line.includes('id') && 
    !line.includes('(') && 
    !line.includes('---') && 
    !line.includes('rows') &&
    line.trim().length > 0 &&
    line.trim().length > 30 // UUID имеет длину 36 символов
  );
  
  console.log('Отфильтрованные строки:');
  dataLines.forEach((line, index) => {
    console.log(`${index}: "${line}"`);
  });
  
  const players = dataLines.map(line => {
    const parts = line.split('|');
    return parts[0].trim();
  }).filter(id => id.length > 0 && id !== 'id');
  
  console.log('Игроки:', players);
  console.log(`Найдено игроков: ${players.length}`);

} catch (error) {
  console.error('❌ Ошибка:', error.message);
}
