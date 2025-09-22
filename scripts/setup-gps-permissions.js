#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Настройка GPS разрешений...\n');

try {
  // 1. Применяем миграцию
  console.log('📦 Применяем миграцию для GPS разрешений...');
  execSync('psql $DATABASE_URL -f drizzle/0032_add_gps_permissions.sql', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('✅ Миграция применена успешно\n');

  // 2. Заполняем разрешения
  console.log('🌱 Заполняем GPS разрешения...');
  execSync('npx tsx scripts/seed-gps-permissions-fixed.ts', { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });
  console.log('✅ GPS разрешения заполнены успешно\n');

  console.log('🎉 Настройка GPS разрешений завершена!');
  console.log('\n📋 Что было сделано:');
  console.log('  ✅ Созданы таблицы GPS разрешений');
  console.log('  ✅ Заполнены GPS разрешения');
  console.log('  ✅ Настроены роли и разрешения');
  console.log('\n🔧 Следующие шаги:');
  console.log('  1. Перезапустите приложение');
  console.log('  2. Проверьте работу GPS функций');
  console.log('  3. Настройте разрешения в админке');

} catch (error) {
  console.error('❌ Ошибка настройки GPS разрешений:', error.message);
  process.exit(1);
}
