// Проверяем все возможные конвертации единиц измерения

const units = [
  // Расстояние
  { code: 'm', dimension: 'distance' },
  { code: 'km', dimension: 'distance' },
  { code: 'yd', dimension: 'distance' },
  
  // Скорость
  { code: 'm/s', dimension: 'speed' },
  { code: 'km/h', dimension: 'speed' },
  { code: 'm/min', dimension: 'speed' },
  { code: 'mph', dimension: 'speed' },
  
  // Время
  { code: 's', dimension: 'time' },
  { code: 'min', dimension: 'time' },
  { code: 'h', dimension: 'time' },
  { code: 'hh:mm', dimension: 'time' },
  { code: 'hh:mm:ss', dimension: 'time' },
  
  // Ускорение
  { code: 'm/s^2', dimension: 'acceleration' },
  { code: 'g', dimension: 'acceleration' },
  
  // Пульс
  { code: 'bpm', dimension: 'heart_rate' },
  { code: '%HRmax', dimension: 'heart_rate' },
  
  // Остальные (без конвертации)
  { code: 'count', dimension: 'count' },
  { code: 'string', dimension: 'identity' },
  { code: 'AU', dimension: 'load' },
  { code: 'W/kg', dimension: 'power_mass_norm' },
  { code: '%', dimension: 'ratio' },
  { code: 'ratio', dimension: 'ratio' },
];

// Группируем по измерениям
const unitsByDimension = {};
units.forEach(unit => {
  if (!unitsByDimension[unit.dimension]) {
    unitsByDimension[unit.dimension] = [];
  }
  unitsByDimension[unit.dimension].push(unit.code);
});

console.log('Единицы измерения по категориям:');
Object.entries(unitsByDimension).forEach(([dimension, codes]) => {
  console.log(`${dimension}: ${codes.join(', ')}`);
});

console.log('\nПроверяем конвертации внутри каждой категории...\n');

// Проверяем конвертации внутри каждой категории
Object.entries(unitsByDimension).forEach(([dimension, codes]) => {
  console.log(`=== ${dimension.toUpperCase()} ===`);
  
  if (codes.length <= 1) {
    console.log(`  Только одна единица: ${codes[0]} (конвертация не нужна)`);
    return;
  }
  
  // Проверяем все пары
  for (let i = 0; i < codes.length; i++) {
    for (let j = 0; j < codes.length; j++) {
      if (i !== j) {
        const from = codes[i];
        const to = codes[j];
        console.log(`  ${from} → ${to}: нужна конвертация`);
      }
    }
  }
  
  console.log('');
});

console.log('Проверяем, что все единицы из БД покрыты в таблице конвертации...\n');

// Читаем текущую таблицу конвертации
const fs = require('fs');
const converterContent = fs.readFileSync('./src/lib/unit-converter.ts', 'utf8');

// Извлекаем все единицы из таблицы конвертации
const unitMatches = converterContent.match(/'([^']+)':\s*{/g);
const converterUnits = unitMatches ? unitMatches.map(match => match.match(/'([^']+)'/)[1]) : [];

console.log('Единицы в таблице конвертации:');
converterUnits.forEach(unit => console.log(`  ${unit}`));

console.log('\nЕдиницы из БД, которых нет в таблице конвертации:');
const missingUnits = units.filter(unit => !converterUnits.includes(unit.code));
missingUnits.forEach(unit => console.log(`  ${unit.code} (${unit.dimension})`));

console.log('\nЕдиницы в таблице конвертации, которых нет в БД:');
const extraUnits = converterUnits.filter(unit => !units.some(u => u.code === unit));
extraUnits.forEach(unit => console.log(`  ${unit}`));
