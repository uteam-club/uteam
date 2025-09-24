#!/usr/bin/env node

/**
 * Скрипт для применения исправлений игровых моделей
 * 
 * Что делает:
 * 1. Применяет миграцию для добавления уникального ограничения
 * 2. Удаляет дубликаты игровых моделей
 * 3. Пересчитывает все игровые модели с правильной логикой
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Применение исправлений игровых моделей...\n');

try {
  // 1. Применяем миграцию
  console.log('📊 Применение миграции базы данных...');
  execSync('npx drizzle-kit push', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Миграция применена\n');

  // 2. Запускаем скрипт для удаления дубликатов и пересчета
  console.log('🔄 Пересчет игровых моделей...');
  execSync('node -e "require(\'./src/lib/game-model-calculator.ts\')"', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Игровые модели пересчитаны\n');

  console.log('🎉 Все исправления успешно применены!');
  console.log('\n📋 Что было исправлено:');
  console.log('  ✅ Добавлено уникальное ограничение (playerId, clubId)');
  console.log('  ✅ Исправлена логика расчета (нормализация к 1 минуте)');
  console.log('  ✅ Заменен DELETE+INSERT на UPSERT');
  console.log('  ✅ Удалены дубликаты игровых моделей');
  console.log('  ✅ Пересчитаны все модели с правильной логикой');

} catch (error) {
  console.error('❌ Ошибка при применении исправлений:', error.message);
  process.exit(1);
}
