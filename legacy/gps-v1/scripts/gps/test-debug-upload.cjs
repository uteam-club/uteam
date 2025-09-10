#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки debug-функциональности GPS загрузки
 * Запускает self-test и проверяет создание debug файла
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Тестирование debug-функциональности GPS загрузки...\n');

try {
  // Запускаем self-test
  console.log('1. Запуск self-test...');
  execSync('npm run gps:selftest', { stdio: 'inherit' });
  
  // Проверяем создание debug файла
  const debugPath = path.join(process.cwd(), 'artifacts', 'last-upload-debug.json');
  console.log(`\n2. Проверка debug файла: ${debugPath}`);
  
  if (!fs.existsSync(debugPath)) {
    console.error('❌ Debug файл не найден!');
    process.exit(1);
  }
  
  // Читаем и анализируем debug файл
  const debugData = JSON.parse(fs.readFileSync(debugPath, 'utf8'));
  console.log('✅ Debug файл найден');
  
  console.log('\n📊 Анализ debug данных:');
  console.log(`   Timestamp: ${debugData.timestamp}`);
  console.log(`   Event ID: ${debugData.meta.eventId}`);
  console.log(`   Profile ID: ${debugData.meta.profileId}`);
  console.log(`   File: ${debugData.meta.fileName}`);
  
  const { debug } = debugData;
  
  console.log('\n🔍 Нормализация:');
  console.log(`   Strategy: ${debug.normalize.strategy}`);
  console.log(`   Headers: ${debug.normalize.headers?.length || 0}`);
  console.log(`   Rows: ${debug.normalize.rows}`);
  console.log(`   Sample keys: ${debug.normalize.sampleRowKeys?.join(', ') || 'none'}`);
  
  console.log('\n📋 Снапшот:');
  console.log(`   Visible columns: ${debug.snapshot.visibleCount}`);
  console.log(`   Total columns: ${debug.snapshot.totalCount}`);
  console.log(`   Expected headers: ${debug.snapshot.columns.map(c => c.sourceHeader).join(', ')}`);
  
  console.log('\n🗺️ Маппинг:');
  console.log(`   Canon rows: ${debug.mapping.canonRows}`);
  console.log(`   Missing headers: ${debug.mapping.missingHeaders.length}`);
  
  if (debug.mapping.missingHeaders.length > 0) {
    console.log('   Missing:');
    debug.mapping.missingHeaders.forEach(m => {
      console.log(`     - ${m.canonicalKey}: ${m.missing}`);
    });
  }
  
  // Проверяем критические проблемы
  const issues = [];
  
  if (debug.mapping.canonRows === 0) {
    issues.push('❌ canonRows = 0');
  }
  
  if (debug.normalize.strategy === 'unknown') {
    issues.push('❌ Unknown normalization strategy');
  }
  
  if (debug.mapping.missingHeaders.length > 0) {
    issues.push(`⚠️  Missing ${debug.mapping.missingHeaders.length} headers`);
  }
  
  if (issues.length === 0) {
    console.log('\n✅ Все проверки пройдены успешно!');
  } else {
    console.log('\n🚨 Обнаружены проблемы:');
    issues.forEach(issue => console.log(`   ${issue}`));
  }
  
  console.log(`\n📄 Полный debug сохранён в: ${debugPath}`);
  
} catch (error) {
  console.error('❌ Ошибка при тестировании:', error.message);
  process.exit(1);
}
