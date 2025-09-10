#!/usr/bin/env tsx
// scripts/canon/audit-canon-dynamic.ts

import { convertUnit } from '../../src/canon/units';
import { fromCanonical } from '../../src/services/units';
import fs from 'fs';
import path from 'path';

console.log('=== CANON DYNAMIC AUDIT ===');
console.log('Проверяем конвертер единиц через runtime...\n');

const results: Array<{ test: string; expected: number; actual: number; pass: boolean }> = [];

// 1) convertUnit('km/h','m/s', 18) === 5
try {
  const actual = convertUnit(18, 'km/h', 'm/s', 'speed');
  const expected = 5;
  const pass = Math.abs(actual - expected) < 0.01;
  results.push({ test: 'km/h → m/s', expected, actual, pass });
  console.log(`1) km/h → m/s: ${actual} (ожидаем ${expected}) ${pass ? '✅' : '❌'}`);
} catch (error) {
  results.push({ test: 'km/h → m/s', expected: 5, actual: 0, pass: false });
  console.log(`1) km/h → m/s: ERROR - ${error} ❌`);
}

// 2) convertUnit('m/s','km/h', 5) === 18
try {
  const actual = convertUnit(5, 'm/s', 'km/h', 'speed');
  const expected = 18;
  const pass = Math.abs(actual - expected) < 0.01;
  results.push({ test: 'm/s → km/h', expected, actual, pass });
  console.log(`2) m/s → km/h: ${actual} (ожидаем ${expected}) ${pass ? '✅' : '❌'}`);
} catch (error) {
  results.push({ test: 'm/s → km/h', expected: 18, actual: 0, pass: false });
  console.log(`2) m/s → km/h: ERROR - ${error} ❌`);
}

// 3) convertUnit('%','ratio', 7) === 0.07
try {
  const actual = convertUnit(7, '%', 'ratio', 'ratio');
  const expected = 0.07;
  const pass = Math.abs(actual - expected) < 0.001;
  results.push({ test: '% → ratio', expected, actual, pass });
  console.log(`3) % → ratio: ${actual} (ожидаем ${expected}) ${pass ? '✅' : '❌'}`);
} catch (error) {
  results.push({ test: '% → ratio', expected: 0.07, actual: 0, pass: false });
  console.log(`3) % → ratio: ERROR - ${error} ❌`);
}

// 4) convertUnit('ratio','%', 0.085) === 8.5
try {
  const actual = convertUnit(0.085, 'ratio', '%', 'ratio');
  const expected = 8.5;
  const pass = Math.abs(actual - expected) < 0.01;
  results.push({ test: 'ratio → %', expected, actual, pass });
  console.log(`4) ratio → %: ${actual} (ожидаем ${expected}) ${pass ? '✅' : '❌'}`);
} catch (error) {
  results.push({ test: 'ratio → %', expected: 8.5, actual: 0, pass: false });
  console.log(`4) ratio → %: ERROR - ${error} ❌`);
}

// Дополнительная проверка fromCanonical
console.log('\n--- Дополнительная проверка fromCanonical ---');
try {
  const actual = fromCanonical(0.085, 'hsr_ratio', '%');
  const expected = 8.5;
  const pass = Math.abs(actual - expected) < 0.01;
  results.push({ test: 'fromCanonical hsr_ratio → %', expected, actual: actual || 0, pass });
  console.log(`5) fromCanonical hsr_ratio → %: ${actual} (ожидаем ${expected}) ${pass ? '✅' : '❌'}`);
} catch (error) {
  results.push({ test: 'fromCanonical hsr_ratio → %', expected: 8.5, actual: 0, pass: false });
  console.log(`5) fromCanonical hsr_ratio → %: ERROR - ${error} ❌`);
}

// Итоговая статистика
const passCount = results.filter(r => r.pass).length;
const totalCount = results.length;

console.log(`\n=== ИТОГ ===`);
console.log(`PASS: ${passCount}/${totalCount}`);

// Сохраняем отчёт
const reportLines = [
  '# CANON DYNAMIC AUDIT — Runtime проверка конвертера',
  '',
  '## Результаты проверок',
  '',
  ...results.map(r => `- **${r.test}**: ${r.pass ? '✅ PASS' : '❌ FAIL'} (получено: ${r.actual}, ожидаем: ${r.expected})`),
  '',
  `## Сводка`,
  `- Всего проверок: ${totalCount}`,
  `- Успешных: ${passCount}`,
  `- Неудачных: ${totalCount - passCount}`,
  '',
  `## Статус: ${passCount === totalCount ? '✅ ВСЕ ПРОВЕРКИ ПРОШЛИ' : '❌ ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ'}`,
  '',
  '## Рекомендации',
  passCount === totalCount 
    ? '- Конвертер единиц работает корректно'
    : '- Необходимо исправить правила конвертации в src/canon/units.ts'
];

fs.writeFileSync(path.resolve('artifacts/CANON_AUDIT_DYNAMIC.md'), reportLines.join('\n'), 'utf8');

console.log(`\nОтчёт сохранён: artifacts/CANON_AUDIT_DYNAMIC.md`);
