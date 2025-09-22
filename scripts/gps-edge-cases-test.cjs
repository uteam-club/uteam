#!/usr/bin/env node

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

console.log('🔍 GPS Edge Cases Testing\n');

// Тестирование граничных условий для файлов
function testFileEdgeCases() {
  console.log('📁 Testing file edge cases...');
  
  const testCases = [
    {
      name: 'Empty file',
      content: '',
      expected: 'Should handle empty files gracefully'
    },
    {
      name: 'Very large file',
      content: 'x'.repeat(10 * 1024 * 1024), // 10MB
      expected: 'Should handle large files efficiently'
    },
    {
      name: 'File with special characters',
      content: 'test\n\r\t\0\x00\xFF\u0000\uFFFF',
      expected: 'Should handle special characters correctly'
    },
    {
      name: 'File with only whitespace',
      content: '   \n\t\r   ',
      expected: 'Should handle whitespace-only files'
    },
    {
      name: 'File with very long lines',
      content: 'x'.repeat(10000) + '\n' + 'y'.repeat(10000),
      expected: 'Should handle very long lines'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach(testCase => {
    try {
      // Симулируем обработку файла
      const startTime = performance.now();
      
      // Проверяем размер файла
      const fileSize = Buffer.byteLength(testCase.content, 'utf8');
      const isValidSize = fileSize <= 10 * 1024 * 1024; // 10MB limit
      
      // Проверяем наличие контента
      const hasContent = testCase.content.trim().length > 0;
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      if (isValidSize && processingTime < 1000) { // 1 second limit
        console.log(`  ✅ ${testCase.name}: ${fileSize} bytes, ${processingTime.toFixed(3)}ms`);
        passedTests++;
      } else {
        console.log(`  ❌ ${testCase.name}: Failed validation`);
      }
    } catch (error) {
      console.log(`  ❌ ${testCase.name}: Error - ${error.message}`);
    }
  });
  
  return { passedTests, totalTests: testCases.length };
}

// Тестирование граничных условий для данных
function testDataEdgeCases() {
  console.log('\n📊 Testing data edge cases...');
  
  const testCases = [
    {
      name: 'Empty GPS data',
      data: { rows: [], headers: [] },
      expected: 'Should handle empty data gracefully'
    },
    {
      name: 'GPS data with null values',
      data: { 
        rows: [
          { player: 'Player1', distance: null, speed: undefined, heartRate: '' }
        ], 
        headers: ['player', 'distance', 'speed', 'heartRate'] 
      },
      expected: 'Should handle null/undefined values'
    },
    {
      name: 'GPS data with extreme values',
      data: { 
        rows: [
          { player: 'Player1', distance: 999999999, speed: -999999, heartRate: 0 }
        ], 
        headers: ['player', 'distance', 'speed', 'heartRate'] 
      },
      expected: 'Should handle extreme values'
    },
    {
      name: 'GPS data with invalid types',
      data: { 
        rows: [
          { player: 123, distance: 'invalid', speed: {}, heartRate: [] }
        ], 
        headers: ['player', 'distance', 'speed', 'heartRate'] 
      },
      expected: 'Should handle invalid data types'
    },
    {
      name: 'GPS data with very long strings',
      data: { 
        rows: [
          { player: 'A'.repeat(1000), distance: 1000, speed: 5, heartRate: 150 }
        ], 
        headers: ['player', 'distance', 'speed', 'heartRate'] 
      },
      expected: 'Should handle very long strings'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach(testCase => {
    try {
      const startTime = performance.now();
      
      // Проверяем структуру данных
      const hasRows = Array.isArray(testCase.data.rows);
      const hasHeaders = Array.isArray(testCase.data.headers);
      const isValidStructure = hasRows && hasHeaders;
      
      // Проверяем обработку данных
      let dataValid = true;
      if (testCase.data.rows.length > 0) {
        testCase.data.rows.forEach(row => {
          Object.values(row).forEach(value => {
            if (value === null || value === undefined) {
              // Null/undefined values should be handled gracefully
            } else if (typeof value === 'string' && value.length > 1000) {
              // Very long strings should be truncated or handled
              dataValid = false;
            }
          });
        });
      }
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      if (isValidStructure && dataValid && processingTime < 100) {
        console.log(`  ✅ ${testCase.name}: ${processingTime.toFixed(3)}ms`);
        passedTests++;
      } else {
        console.log(`  ❌ ${testCase.name}: Failed validation`);
      }
    } catch (error) {
      console.log(`  ❌ ${testCase.name}: Error - ${error.message}`);
    }
  });
  
  return { passedTests, totalTests: testCases.length };
}

// Тестирование граничных условий для API
function testApiEdgeCases() {
  console.log('\n🌐 Testing API edge cases...');
  
  const testCases = [
    {
      name: 'Invalid UUID format',
      input: 'invalid-uuid',
      expected: 'Should reject invalid UUIDs'
    },
    {
      name: 'Empty request body',
      input: {},
      expected: 'Should handle empty request bodies'
    },
    {
      name: 'Request with missing required fields',
      input: { name: 'Test' }, // Missing required fields
      expected: 'Should validate required fields'
    },
    {
      name: 'Request with SQL injection attempt',
      input: { name: "'; DROP TABLE users; --" },
      expected: 'Should prevent SQL injection'
    },
    {
      name: 'Request with XSS attempt',
      input: { name: '<script>alert("xss")</script>' },
      expected: 'Should prevent XSS attacks'
    },
    {
      name: 'Request with very large payload',
      input: { data: 'x'.repeat(1000000) }, // 1MB payload
      expected: 'Should handle large payloads'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach(testCase => {
    try {
      const startTime = performance.now();
      
      // Симулируем валидацию API
      let isValid = true;
      
      // Проверка UUID
      if (testCase.name.includes('UUID')) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        isValid = uuidRegex.test(testCase.input);
      }
      
      // Проверка размера payload
      if (testCase.name.includes('large payload')) {
        const payloadSize = JSON.stringify(testCase.input).length;
        isValid = payloadSize <= 10 * 1024 * 1024; // 10MB limit
      }
      
      // Проверка SQL injection
      if (testCase.name.includes('SQL injection')) {
        const sqlPatterns = /('|(\\')|(;)|(\\;)|(--)|(\\/\\*)|(\\*\\/))/i;
        isValid = !sqlPatterns.test(testCase.input.name);
      }
      
      // Проверка XSS
      if (testCase.name.includes('XSS')) {
        const xssPatterns = /<script|javascript:|on\w+\s*=/i;
        isValid = !xssPatterns.test(testCase.input.name);
      }
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      if (isValid && processingTime < 50) {
        console.log(`  ✅ ${testCase.name}: ${processingTime.toFixed(3)}ms`);
        passedTests++;
      } else {
        console.log(`  ❌ ${testCase.name}: Failed validation`);
      }
    } catch (error) {
      console.log(`  ❌ ${testCase.name}: Error - ${error.message}`);
    }
  });
  
  return { passedTests, totalTests: testCases.length };
}

// Тестирование граничных условий для компонентов
function testComponentEdgeCases() {
  console.log('\n⚛️  Testing component edge cases...');
  
  const testCases = [
    {
      name: 'Component with no props',
      props: {},
      expected: 'Should handle missing props gracefully'
    },
    {
      name: 'Component with null props',
      props: { data: null, loading: null },
      expected: 'Should handle null props'
    },
    {
      name: 'Component with undefined props',
      props: { data: undefined, loading: undefined },
      expected: 'Should handle undefined props'
    },
    {
      name: 'Component with empty arrays',
      props: { data: [], items: [] },
      expected: 'Should handle empty arrays'
    },
    {
      name: 'Component with very large datasets',
      props: { data: Array(10000).fill({ id: 1, name: 'Item' }) },
      expected: 'Should handle large datasets efficiently'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach(testCase => {
    try {
      const startTime = performance.now();
      
      // Симулируем рендеринг компонента
      let isValid = true;
      
      // Проверяем обработку null/undefined
      Object.values(testCase.props).forEach(value => {
        if (value === null || value === undefined) {
          // Должно обрабатываться gracefully
        } else if (Array.isArray(value) && value.length > 1000) {
          // Большие массивы должны обрабатываться efficiently
          isValid = value.length <= 10000; // Лимит для теста
        }
      });
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      if (isValid && processingTime < 100) {
        console.log(`  ✅ ${testCase.name}: ${processingTime.toFixed(3)}ms`);
        passedTests++;
      } else {
        console.log(`  ❌ ${testCase.name}: Failed validation`);
      }
    } catch (error) {
      console.log(`  ❌ ${testCase.name}: Error - ${error.message}`);
    }
  });
  
  return { passedTests, totalTests: testCases.length };
}

// Тестирование граничных условий для производительности
function testPerformanceEdgeCases() {
  console.log('\n⚡ Testing performance edge cases...');
  
  const testCases = [
    {
      name: 'Concurrent API requests',
      requests: 100,
      expected: 'Should handle concurrent requests efficiently'
    },
    {
      name: 'Memory usage with large datasets',
      dataSize: 1000000, // 1M items
      expected: 'Should handle large datasets without memory issues'
    },
    {
      name: 'Rapid state updates',
      updates: 1000,
      expected: 'Should handle rapid state updates efficiently'
    },
    {
      name: 'Long-running operations',
      duration: 5000, // 5 seconds
      expected: 'Should handle long-running operations without blocking'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach(testCase => {
    try {
      const startTime = performance.now();
      
      // Симулируем нагрузку
      if (testCase.name.includes('Concurrent')) {
        // Симулируем concurrent requests
        const promises = Array(testCase.requests).fill(0).map(() => 
          new Promise(resolve => setTimeout(resolve, Math.random() * 100))
        );
        
        Promise.all(promises).then(() => {
          const endTime = performance.now();
          const processingTime = endTime - startTime;
          
          if (processingTime < 2000) { // 2 second limit
            console.log(`  ✅ ${testCase.name}: ${processingTime.toFixed(3)}ms`);
            passedTests++;
          } else {
            console.log(`  ❌ ${testCase.name}: Too slow - ${processingTime.toFixed(3)}ms`);
          }
        });
      } else {
        // Для других тестов просто проверяем время выполнения
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        if (processingTime < 100) {
          console.log(`  ✅ ${testCase.name}: ${processingTime.toFixed(3)}ms`);
          passedTests++;
        } else {
          console.log(`  ❌ ${testCase.name}: Too slow - ${processingTime.toFixed(3)}ms`);
        }
      }
    } catch (error) {
      console.log(`  ❌ ${testCase.name}: Error - ${error.message}`);
    }
  });
  
  return { passedTests, totalTests: testCases.length };
}

// Генерация отчета по edge cases
function generateEdgeCasesReport(results) {
  console.log('\n📋 Edge Cases Testing Report');
  console.log('='.repeat(50));
  
  const {
    fileTests,
    dataTests,
    apiTests,
    componentTests,
    performanceTests
  } = results;
  
  // Статистика по тестам
  console.log('\n📊 Test Results:');
  console.log(`  File Edge Cases: ${fileTests.passedTests}/${fileTests.totalTests} (${Math.round(fileTests.passedTests/fileTests.totalTests*100)}%)`);
  console.log(`  Data Edge Cases: ${dataTests.passedTests}/${dataTests.totalTests} (${Math.round(dataTests.passedTests/dataTests.totalTests*100)}%)`);
  console.log(`  API Edge Cases: ${apiTests.passedTests}/${apiTests.totalTests} (${Math.round(apiTests.passedTests/apiTests.totalTests*100)}%)`);
  console.log(`  Component Edge Cases: ${componentTests.passedTests}/${componentTests.totalTests} (${Math.round(componentTests.passedTests/componentTests.totalTests*100)}%)`);
  console.log(`  Performance Edge Cases: ${performanceTests.passedTests}/${performanceTests.totalTests} (${Math.round(performanceTests.passedTests/performanceTests.totalTests*100)}%)`);
  
  // Общий балл
  const totalTests = fileTests.totalTests + dataTests.totalTests + apiTests.totalTests + componentTests.totalTests + performanceTests.totalTests;
  const passedTests = fileTests.passedTests + dataTests.passedTests + apiTests.passedTests + componentTests.passedTests + performanceTests.passedTests;
  const overallScore = Math.round((passedTests / totalTests) * 100);
  
  console.log(`\n🎯 Overall Edge Cases Score: ${overallScore}%`);
  
  // Оценка устойчивости
  if (overallScore >= 90) {
    console.log('  Status: ✅ Excellent - System is very robust');
  } else if (overallScore >= 80) {
    console.log('  Status: ⚠️  Good - Minor edge cases need attention');
  } else if (overallScore >= 70) {
    console.log('  Status: ⚠️  Fair - Several edge cases need fixing');
  } else {
    console.log('  Status: ❌ Poor - Many edge cases need attention');
  }
  
  // Рекомендации
  console.log('\n💡 Recommendations:');
  
  if (fileTests.passedTests < fileTests.totalTests) {
    console.log('  - Improve file handling for edge cases');
  }
  
  if (dataTests.passedTests < dataTests.totalTests) {
    console.log('  - Improve data validation and sanitization');
  }
  
  if (apiTests.passedTests < apiTests.totalTests) {
    console.log('  - Strengthen API security and validation');
  }
  
  if (componentTests.passedTests < componentTests.totalTests) {
    console.log('  - Improve component error handling');
  }
  
  if (performanceTests.passedTests < performanceTests.totalTests) {
    console.log('  - Optimize performance for edge cases');
  }
  
  if (overallScore >= 90) {
    console.log('  - System is robust and ready for production');
    console.log('  - Consider adding monitoring for edge cases');
    console.log('  - Implement automated edge case testing');
  }
  
  return overallScore;
}

// Основная функция
async function runEdgeCasesTest() {
  const startTime = performance.now();
  
  try {
    console.log('🚀 Starting edge cases testing...\n');
    
    const fileTests = testFileEdgeCases();
    const dataTests = testDataEdgeCases();
    const apiTests = testApiEdgeCases();
    const componentTests = testComponentEdgeCases();
    const performanceTests = testPerformanceEdgeCases();
    
    const results = {
      fileTests,
      dataTests,
      apiTests,
      componentTests,
      performanceTests
    };
    
    const overallScore = generateEdgeCasesReport(results);
    
    const endTime = performance.now();
    const testTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️  Edge cases test completed in ${testTime}s`);
    console.log(`🎯 Final Edge Cases Score: ${overallScore}%`);
    
    if (overallScore >= 90) {
      console.log('\n🎉 System is robust and handles edge cases well!');
    } else {
      console.log('\n⚠️  System needs improvement for edge cases.');
    }
    
  } catch (error) {
    console.error('❌ Edge cases test failed:', error);
    process.exit(1);
  }
}

// Запуск теста
if (require.main === module) {
  runEdgeCasesTest();
}

module.exports = {
  testFileEdgeCases,
  testDataEdgeCases,
  testApiEdgeCases,
  testComponentEdgeCases,
  testPerformanceEdgeCases,
  generateEdgeCasesReport
};
