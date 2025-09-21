const { convertUnit, isConversionSupported, formatValue, getPrecision } = require('./src/lib/unit-converter');

/**
 * Комплексный тест конвертаций единиц измерения
 */
function testAllConversions() {
  console.log('🧪 Тестирование конвертаций единиц измерения...\n');

  const testCases = [
    // === ДИСТАНЦИЯ ===
    {
      category: 'Distance (Дистанция)',
      tests: [
        { from: 'm', to: 'km', value: 1000, expected: 1 },
        { from: 'm', to: 'miles', value: 1609.34, expected: 1 },
        { from: 'm', to: 'yards', value: 1, expected: 1.09361 },
        { from: 'm', to: 'feet', value: 1, expected: 3.28084 },
        { from: 'km', to: 'm', value: 1, expected: 1000 },
        { from: 'km', to: 'miles', value: 1, expected: 0.621371 },
        { from: 'miles', to: 'm', value: 1, expected: 1609.34 },
        { from: 'yards', to: 'm', value: 1, expected: 0.9144 },
        { from: 'feet', to: 'm', value: 1, expected: 0.3048 },
        { from: 'yd', to: 'm', value: 1, expected: 0.9144 },
      ]
    },

    // === СКОРОСТЬ ===
    {
      category: 'Speed (Скорость)',
      tests: [
        { from: 'm/s', to: 'km/h', value: 1, expected: 3.6 },
        { from: 'm/s', to: 'mph', value: 1, expected: 2.23694 },
        { from: 'm/s', to: 'knots', value: 1, expected: 1.94384 },
        { from: 'm/s', to: 'm/min', value: 1, expected: 60 },
        { from: 'km/h', to: 'm/s', value: 3.6, expected: 1 },
        { from: 'km/h', to: 'mph', value: 1, expected: 0.621371 },
        { from: 'mph', to: 'm/s', value: 1, expected: 0.44704 },
        { from: 'knots', to: 'm/s', value: 1, expected: 0.514444 },
        { from: 'm/min', to: 'm/s', value: 60, expected: 1 },
      ]
    },

    // === ВРЕМЯ ===
    {
      category: 'Time (Время)',
      tests: [
        { from: 's', to: 'min', value: 60, expected: 1 },
        { from: 's', to: 'h', value: 3600, expected: 1 },
        { from: 's', to: 'ms', value: 1, expected: 1000 },
        { from: 'min', to: 's', value: 1, expected: 60 },
        { from: 'min', to: 'h', value: 60, expected: 1 },
        { from: 'h', to: 's', value: 1, expected: 3600 },
        { from: 'h', to: 'min', value: 1, expected: 60 },
        { from: 'ms', to: 's', value: 1000, expected: 1 },
        { from: 'ms', to: 'min', value: 60000, expected: 1 },
        { from: 'ms', to: 'h', value: 3600000, expected: 1 },
      ]
    },

    // === ВРЕМЯ В ФОРМАТАХ ===
    {
      category: 'Time Formats (Форматы времени)',
      tests: [
        { from: 'hh:mm:ss', to: 's', value: '01:19:22', expected: 4752 },
        { from: 'hh:mm', to: 's', value: '01:19', expected: 4740 },
        { from: 'mm:ss', to: 's', value: '19:22', expected: 1162 },
        { from: 'ss', to: 's', value: '22', expected: 22 },
        { from: 'hh.mm.ss', to: 's', value: '01.19.22', expected: 4752 },
        { from: 'hh,mm,ss', to: 's', value: '01,19,22', expected: 4752 },
        { from: 'hh mm ss', to: 's', value: '01 19 22', expected: 4752 },
        { from: 'hh.mm', to: 's', value: '01.19', expected: 4740 },
        { from: 'mm.ss', to: 's', value: '19.22', expected: 1162 },
        { from: 'hh:mm:ss.fff', to: 's', value: '01:19:22.500', expected: 4752.5 },
        { from: 'hh:mm:ss,fff', to: 's', value: '01:19:22,500', expected: 4752.5 },
      ]
    },

    // === УСКОРЕНИЕ ===
    {
      category: 'Acceleration (Ускорение)',
      tests: [
        { from: 'm/s^2', to: 'g', value: 1, expected: 0.101972 },
        { from: 'g', to: 'm/s^2', value: 1, expected: 9.80665 },
      ]
    },

    // === ПРОЦЕНТЫ ===
    {
      category: 'Percentages (Проценты)',
      tests: [
        { from: '%', to: 'ratio', value: 50, expected: 0.5 },
        { from: 'ratio', to: '%', value: 0.5, expected: 50 },
      ]
    },

    // === КОЛИЧЕСТВО ===
    {
      category: 'Count (Количество)',
      tests: [
        { from: 'count', to: 'count', value: 10, expected: 10 },
        { from: 'times', to: 'times', value: 5, expected: 5 },
        { from: 'sprints', to: 'sprints', value: 3, expected: 3 },
      ]
    },

    // === ПУЛЬС ===
    {
      category: 'Heart Rate (Пульс)',
      tests: [
        { from: 'bpm', to: 'bpm', value: 150, expected: 150 },
        { from: '%HRmax', to: '%HRmax', value: 80, expected: 80 },
      ]
    },

    // === НАГРУЗКА ===
    {
      category: 'Load (Нагрузка)',
      tests: [
        { from: 'AU', to: 'AU', value: 100, expected: 100 },
      ]
    },

    // === МОЩНОСТЬ ===
    {
      category: 'Power (Мощность)',
      tests: [
        { from: 'W/kg', to: 'W/kg', value: 5.5, expected: 5.5 },
      ]
    },

    // === ИДЕНТИЧНОСТЬ ===
    {
      category: 'Identity (Идентичность)',
      tests: [
        { from: 'string', to: 'string', value: 'test', expected: 'test' },
      ]
    },
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const category of testCases) {
    console.log(`\n📊 ${category.category}:`);
    console.log('─'.repeat(50));

    for (const test of category.tests) {
      totalTests++;
      
      try {
        const result = convertUnit(test.value, test.from, test.to);
        const isPassed = Math.abs(result - test.expected) < 0.001;
        
        if (isPassed) {
          passedTests++;
          console.log(`✅ ${test.value} ${test.from} → ${result.toFixed(6)} ${test.to} (expected: ${test.expected})`);
        } else {
          failedTests++;
          console.log(`❌ ${test.value} ${test.from} → ${result.toFixed(6)} ${test.to} (expected: ${test.expected})`);
        }
      } catch (error) {
        failedTests++;
        console.log(`💥 ${test.value} ${test.from} → ERROR: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📈 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:`);
  console.log(`   Всего тестов: ${totalTests}`);
  console.log(`   ✅ Прошло: ${passedTests}`);
  console.log(`   ❌ Провалено: ${failedTests}`);
  console.log(`   📊 Успешность: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  return { totalTests, passedTests, failedTests };
}

/**
 * Тест поддержки конвертаций
 */
function testConversionSupport() {
  console.log('\n🔍 Тестирование поддержки конвертаций...\n');

  const testPairs = [
    // Должны поддерживаться
    { from: 'm', to: 'km', shouldSupport: true },
    { from: 'm/s', to: 'km/h', shouldSupport: true },
    { from: 's', to: 'min', shouldSupport: true },
    { from: 'hh:mm:ss', to: 's', shouldSupport: true },
    { from: 'm/s^2', to: 'g', shouldSupport: true },
    { from: '%', to: 'ratio', shouldSupport: true },
    
    // Не должны поддерживаться
    { from: 'm', to: 'invalid', shouldSupport: false },
    { from: 'invalid', to: 'm', shouldSupport: false },
    { from: 'm', to: 'bpm', shouldSupport: false },
  ];

  let supportTests = 0;
  let supportPassed = 0;

  for (const test of testPairs) {
    supportTests++;
    const isSupported = isConversionSupported(test.from, test.to);
    const isCorrect = isSupported === test.shouldSupport;
    
    if (isCorrect) {
      supportPassed++;
      console.log(`✅ ${test.from} → ${test.to}: ${isSupported ? 'поддерживается' : 'не поддерживается'} (ожидалось: ${test.shouldSupport ? 'поддерживается' : 'не поддерживается'})`);
    } else {
      console.log(`❌ ${test.from} → ${test.to}: ${isSupported ? 'поддерживается' : 'не поддерживается'} (ожидалось: ${test.shouldSupport ? 'поддерживается' : 'не поддерживается'})`);
    }
  }

  console.log(`\n📊 Поддержка конвертаций: ${supportPassed}/${supportTests} (${((supportPassed / supportTests) * 100).toFixed(1)}%)`);
  
  return { supportTests, supportPassed };
}

/**
 * Тест форматирования значений
 */
function testValueFormatting() {
  console.log('\n🎨 Тестирование форматирования значений...\n');

  const formatTests = [
    { value: 1234.5678, unit: 'm', precision: 0, expected: '1235 m' },
    { value: 1234.5678, unit: 'km', precision: 2, expected: '1234.57 km' },
    { value: 1234.5678, unit: 'm/s', precision: 1, expected: '1234.6 m/s' },
    { value: 1234.5678, unit: 's', precision: 0, expected: '1235 s' },
    { value: 1234.5678, unit: 'bpm', precision: 0, expected: '1235 bpm' },
  ];

  let formatPassed = 0;
  for (const test of formatTests) {
    const result = formatValue(test.value, test.unit, test.precision);
    const isPassed = result === test.expected;
    
    if (isPassed) {
      formatPassed++;
      console.log(`✅ ${test.value} ${test.unit} (precision: ${test.precision}) → "${result}"`);
    } else {
      console.log(`❌ ${test.value} ${test.unit} (precision: ${test.precision}) → "${result}" (expected: "${test.expected}")`);
    }
  }

  console.log(`\n📊 Форматирование: ${formatPassed}/${formatTests.length} (${((formatPassed / formatTests.length) * 100).toFixed(1)}%)`);
  
  return { formatTests: formatTests.length, formatPassed };
}

// Запуск всех тестов
console.log('🚀 Запуск комплексного тестирования конвертаций единиц измерения...\n');

const conversionResults = testAllConversions();
const supportResults = testConversionSupport();
const formatResults = testValueFormatting();

console.log('\n' + '='.repeat(60));
console.log('📋 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:');
console.log(`   Конвертации: ${conversionResults.passedTests}/${conversionResults.totalTests} (${((conversionResults.passedTests / conversionResults.totalTests) * 100).toFixed(1)}%)`);
console.log(`   Поддержка: ${supportResults.supportPassed}/${supportResults.supportTests} (${((supportResults.supportPassed / supportResults.supportTests) * 100).toFixed(1)}%)`);
console.log(`   Форматирование: ${formatResults.formatPassed}/${formatResults.formatTests} (${((formatResults.formatPassed / formatResults.formatTests) * 100).toFixed(1)}%)`);

const totalPassed = conversionResults.passedTests + supportResults.supportPassed + formatResults.formatPassed;
const totalTests = conversionResults.totalTests + supportResults.supportTests + formatResults.formatTests;
console.log(`   ОБЩИЙ РЕЗУЛЬТАТ: ${totalPassed}/${totalTests} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
console.log('='.repeat(60));
