// Простой тест конвертации процентов в доли
const CANON = require('./src/canon/metrics.registry.json');

function toCanonical(value, fromUnit, dimensionKey) {
  const dim = CANON.dimensions[dimensionKey];
  if (!dim) throw new Error(`Unknown dimension: ${dimensionKey}`);
  
  const conv = dim.conversions || {};
  
  // direct conversion
  const directKey = `${fromUnit}->${dim.canonical_unit}`;
  if (directKey in conv) return value * conv[directKey];
  
  throw new Error(`No conversion from ${fromUnit} to ${dim.canonical_unit}`);
}

// Тест 1: 7% должно стать 0.07
console.log('Тест 1: 7% ->', toCanonical(7, '%', 'ratio'));

// Тест 2: 8.5% должно стать 0.085  
console.log('Тест 2: 8.5% ->', toCanonical(8.5, '%', 'ratio'));

// Тест 3: 0.42 уже доля, должна остаться 0.42
console.log('Тест 3: 0.42 (уже доля) ->', toCanonical(0.42, 'ratio', 'ratio'));
