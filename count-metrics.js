// Подсчет количества метрик в скрипте

const fs = require('fs');

// Читаем файл
const content = fs.readFileSync('scripts/seed-gps-canonical-metrics.ts', 'utf8');

// Находим начало и конец массива метрик
const startIndex = content.indexOf('const canonicalMetrics = [');
const endIndex = content.indexOf('];', startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log('Не удалось найти массив метрик');
  process.exit(1);
}

const metricsSection = content.substring(startIndex, endIndex);

// Подсчитываем количество объектов метрик (по code:)
const metricMatches = metricsSection.match(/code:\s*'[^']+'/g);
const metricCount = metricMatches ? metricMatches.length : 0;

console.log(`📊 Количество метрик в скрипте: ${metricCount}`);

// Также проверим количество усредняемых метрик
const averageableSection = content.substring(0, startIndex);
const averageableMatches = averageableSection.match(/'[^']+',/g);
const averageableCount = averageableMatches ? averageableMatches.length : 0;

console.log(`📈 Количество усредняемых метрик: ${averageableCount}`);

// Выведем все метрики
console.log('\n📋 Список всех метрик:');
metricMatches.forEach((match, index) => {
  const code = match.match(/'([^']+)'/)[1];
  console.log(`${index + 1}. ${code}`);
});
