#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки фикса канонизации GPS-отчётов
 * 
 * Этот скрипт симулирует процесс загрузки GPS-файла и проверяет,
 * что canonical.rows создаются правильно с оригинальными заголовками.
 */

const { buildCanonColumns, mapRowsToCanonical } = require('./src/services/canon.mapper.ts');

console.log('🧪 Тестирование фикса канонизации GPS-отчётов\n');

// Симулируем профиль с маппингом колонок
const profile = {
  id: 'test-profile',
  columnMapping: [
    {
      type: 'column',
      name: 'Total Distance',
      mappedColumn: 'Дистанция',
      canonicalKey: 'total_distance_m',
      isVisible: true,
      order: 1
    },
    {
      type: 'column',
      name: 'Max Speed',
      mappedColumn: 'Max Speed (km/h)',
      canonicalKey: 'max_speed_ms',
      isVisible: true,
      order: 2
    },
    {
      type: 'column',
      name: 'HSR Percentage',
      mappedColumn: 'HSR%',
      canonicalKey: 'hsr_ratio',
      isVisible: true,
      order: 3
    }
  ]
};

// Симулируем rawRows с оригинальными заголовками (как они приходят из файла)
const rawRows = [
  {
    'name': 'Игрок 1',
    'Дистанция': '12345',
    'Max Speed (km/h)': '32.4',
    'HSR%': '8.5'
  },
  {
    'name': 'Игрок 2',
    'Дистанция': '9800',
    'Max Speed (km/h)': '34.2',
    'HSR%': '12.1'
  }
];

console.log('📋 Профиль:');
console.log('  - Колонок в маппинге:', profile.columnMapping.length);
profile.columnMapping.forEach(col => {
  console.log(`    • ${col.mappedColumn} → ${col.canonicalKey}`);
});

console.log('\n📊 RawRows (оригинальные заголовки):');
console.log('  - Строк:', rawRows.length);
console.log('  - Заголовки:', Object.keys(rawRows[0]));

// Строим canonical колонки
const canonColumns = buildCanonColumns(profile.columnMapping);
console.log('\n🔧 Canonical колонки:');
console.log('  - Количество:', canonColumns.length);
canonColumns.forEach(col => {
  console.log(`    • ${col.sourceHeader} → ${col.canonicalKey} (${col.dimension})`);
});

// Применяем маппинг к rawRows
const { rows: canonicalRows, meta } = mapRowsToCanonical(rawRows, canonColumns);

console.log('\n✅ Результат канонизации:');
console.log('  - Canonical строк:', canonicalRows.length);
console.log('  - Версия:', meta.canonVersion);
console.log('  - Предупреждения:', meta.warnings.length);

if (canonicalRows.length > 0) {
  console.log('\n📈 Первая canonical строка:');
  const firstRow = canonicalRows[0];
  Object.entries(firstRow).forEach(([key, value]) => {
    console.log(`    • ${key}: ${value}`);
  });
  
  // Проверяем конверсии
  console.log('\n🔍 Проверка конверсий:');
  console.log(`  - Дистанция: ${rawRows[0]['Дистанция']} → ${firstRow.total_distance_m} м`);
  console.log(`  - Скорость: ${rawRows[0]['Max Speed (km/h)']} км/ч → ${firstRow.max_speed_ms} м/с`);
  console.log(`  - HSR: ${rawRows[0]['HSR%']}% → ${firstRow.hsr_ratio} (ratio)`);
  
  // Проверяем athlete_name
  console.log(`  - Имя: ${rawRows[0]['name']} → ${firstRow.athlete_name}`);
}

if (meta.warnings.length > 0) {
  console.log('\n⚠️ Предупреждения:');
  meta.warnings.forEach(warning => {
    console.log(`    • ${warning}`);
  });
}

// Финальная проверка
const success = canonicalRows.length > 0 && 
                canonicalRows[0].athlete_name && 
                canonicalRows[0].total_distance_m && 
                canonicalRows[0].max_speed_ms && 
                canonicalRows[0].hsr_ratio;

console.log('\n🎯 Результат теста:', success ? '✅ УСПЕХ' : '❌ ОШИБКА');
console.log('   Канонизация работает правильно с оригинальными заголовками!');
