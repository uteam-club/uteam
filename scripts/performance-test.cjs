#!/usr/bin/env node

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

console.log('🚀 GPS Performance Testing\n');

// Тестирование времени сборки
function testBuildPerformance() {
  console.log('📦 Testing build performance...');
  
  const startTime = performance.now();
  
  try {
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'pipe' });
    
    const endTime = performance.now();
    const buildTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Build completed in ${buildTime}s`);
    
    // Анализируем размер bundle
    const buildDir = path.join(__dirname, '..', '.next', 'static', 'chunks');
    if (fs.existsSync(buildDir)) {
      const files = fs.readdirSync(buildDir);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      
      let totalSize = 0;
      jsFiles.forEach(file => {
        const filePath = path.join(buildDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });
      
      const totalSizeKB = (totalSize / 1024).toFixed(2);
      const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
      
      console.log(`📊 Total bundle size: ${totalSizeKB} KB (${totalSizeMB} MB)`);
      
      // Оценка производительности
      if (parseFloat(totalSizeMB) < 2) {
        console.log('✅ Bundle size: Excellent (<2MB)');
      } else if (parseFloat(totalSizeMB) < 5) {
        console.log('⚠️  Bundle size: Good (2-5MB)');
      } else {
        console.log('❌ Bundle size: Needs optimization (>5MB)');
      }
    }
    
    return { buildTime: parseFloat(buildTime), success: true };
  } catch (error) {
    const endTime = performance.now();
    const buildTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`❌ Build failed after ${buildTime}s: ${error.message}`);
    return { buildTime: parseFloat(buildTime), success: false };
  }
}

// Тестирование времени загрузки компонентов
function testComponentLoadTime() {
  console.log('\n⚡ Testing component load time...');
  
  const components = [
    'GpsReportVisualization',
    'NewGpsReportModal',
    'NewGpsProfileModal',
    'EditGpsReportModal',
    'EditGpsProfileModal',
    'MetricSelector'
  ];
  
  const results = {};
  
  components.forEach(component => {
    const startTime = performance.now();
    
    try {
      // Симулируем загрузку компонента
      const componentPath = path.join(__dirname, '..', 'src', 'components', 'gps', `${component}.tsx`);
      
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, 'utf8');
        const lines = content.split('\n').length;
        const size = Buffer.byteLength(content, 'utf8');
        
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        results[component] = {
          loadTime: parseFloat(loadTime.toFixed(3)),
          lines,
          size: (size / 1024).toFixed(2) + ' KB'
        };
        
        console.log(`  ${component}: ${loadTime.toFixed(3)}ms (${lines} lines, ${(size / 1024).toFixed(2)} KB)`);
      } else {
        console.log(`  ${component}: ❌ File not found`);
      }
    } catch (error) {
      console.log(`  ${component}: ❌ Error - ${error.message}`);
    }
  });
  
  return results;
}

// Тестирование API endpoints
async function testApiPerformance() {
  console.log('\n🌐 Testing API performance...');
  
  const endpoints = [
    '/api/gps/canonical-metrics',
    '/api/gps/canonical-metrics-all',
    '/api/gps/profiles',
    '/api/gps/units'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    const startTime = performance.now();
    
    try {
      // Симулируем запрос к API
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      results[endpoint] = {
        responseTime: parseFloat(responseTime.toFixed(3)),
        status: response.status,
        success: response.ok
      };
      
      const status = response.ok ? '✅' : '❌';
      console.log(`  ${endpoint}: ${responseTime.toFixed(3)}ms ${status} (${response.status})`);
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      results[endpoint] = {
        responseTime: parseFloat(responseTime.toFixed(3)),
        status: 'ERROR',
        success: false,
        error: error.message
      };
      
      console.log(`  ${endpoint}: ${responseTime.toFixed(3)}ms ❌ (${error.message})`);
    }
  }
  
  return results;
}

// Генерация отчета о производительности
function generatePerformanceReport(buildResults, componentResults, apiResults) {
  console.log('\n📋 Performance Report');
  console.log('='.repeat(50));
  
  // Build performance
  console.log('\n📦 Build Performance:');
  console.log(`  Build time: ${buildResults.buildTime}s`);
  console.log(`  Status: ${buildResults.success ? '✅ Success' : '❌ Failed'}`);
  
  // Component performance
  console.log('\n⚡ Component Performance:');
  const componentTimes = Object.values(componentResults).map(r => r.loadTime);
  const avgComponentTime = componentTimes.reduce((a, b) => a + b, 0) / componentTimes.length;
  console.log(`  Average load time: ${avgComponentTime.toFixed(3)}ms`);
  console.log(`  Total components: ${Object.keys(componentResults).length}`);
  
  // API performance
  console.log('\n🌐 API Performance:');
  const apiTimes = Object.values(apiResults).map(r => r.responseTime);
  const avgApiTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
  const successfulApis = Object.values(apiResults).filter(r => r.success).length;
  console.log(`  Average response time: ${avgApiTime.toFixed(3)}ms`);
  console.log(`  Successful requests: ${successfulApis}/${Object.keys(apiResults).length}`);
  
  // Overall assessment
  console.log('\n🎯 Overall Assessment:');
  
  let score = 0;
  let maxScore = 0;
  
  // Build score (0-3)
  maxScore += 3;
  if (buildResults.success) {
    if (buildResults.buildTime < 30) score += 3;
    else if (buildResults.buildTime < 60) score += 2;
    else score += 1;
  }
  
  // Component score (0-3)
  maxScore += 3;
  if (avgComponentTime < 1) score += 3;
  else if (avgComponentTime < 5) score += 2;
  else if (avgComponentTime < 10) score += 1;
  
  // API score (0-3)
  maxScore += 3;
  if (avgApiTime < 100) score += 3;
  else if (avgApiTime < 500) score += 2;
  else if (avgApiTime < 1000) score += 1;
  
  const percentage = Math.round((score / maxScore) * 100);
  console.log(`  Performance Score: ${score}/${maxScore} (${percentage}%)`);
  
  if (percentage >= 80) {
    console.log('  Status: ✅ Excellent');
  } else if (percentage >= 60) {
    console.log('  Status: ⚠️  Good');
  } else if (percentage >= 40) {
    console.log('  Status: ⚠️  Fair');
  } else {
    console.log('  Status: ❌ Needs improvement');
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (buildResults.buildTime > 60) {
    console.log('  - Consider optimizing build process');
  }
  if (avgComponentTime > 5) {
    console.log('  - Consider lazy loading for heavy components');
  }
  if (avgApiTime > 500) {
    console.log('  - Consider API caching and optimization');
  }
  if (percentage < 60) {
    console.log('  - Review overall performance optimization');
  }
}

// Основная функция
async function runPerformanceTests() {
  try {
    const buildResults = testBuildPerformance();
    const componentResults = testComponentLoadTime();
    const apiResults = await testApiPerformance();
    
    generatePerformanceReport(buildResults, componentResults, apiResults);
    
    console.log('\n✅ Performance testing complete!');
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  }
}

// Запуск тестов
if (require.main === module) {
  runPerformanceTests();
}

module.exports = {
  testBuildPerformance,
  testComponentLoadTime,
  testApiPerformance,
  generatePerformanceReport
};
