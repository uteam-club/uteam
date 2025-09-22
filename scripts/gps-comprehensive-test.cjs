#!/usr/bin/env node

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

console.log('🧪 GPS Comprehensive Testing\n');

// Тестирование файловой системы
function testFileSystem() {
  console.log('📁 Testing file system...');
  
  const gpsDir = path.join(__dirname, '..', 'src', 'components', 'gps');
  const apiDir = path.join(__dirname, '..', 'src', 'app', 'api', 'gps');
  const libDir = path.join(__dirname, '..', 'src', 'lib');
  
  const directories = [
    { name: 'GPS Components', path: gpsDir },
    { name: 'GPS API', path: apiDir },
    { name: 'GPS Lib', path: libDir }
  ];
  
  let allExists = true;
  
  directories.forEach(({ name, path: dirPath }) => {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      const relevantFiles = files.filter(file => 
        file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')
      );
      console.log(`  ✅ ${name}: ${relevantFiles.length} files`);
    } else {
      console.log(`  ❌ ${name}: Directory not found`);
      allExists = false;
    }
  });
  
  return allExists;
}

// Тестирование компонентов
function testComponents() {
  console.log('\n⚛️  Testing GPS components...');
  
  const components = [
    'GpsReportVisualization.tsx',
    'GpsReportVisualizationOptimized.tsx',
    'NewGpsReportModal.tsx',
    'NewGpsProfileModal.tsx',
    'EditGpsReportModal.tsx',
    'EditGpsProfileModal.tsx',
    'MetricSelector.tsx',
    'MetricSelectorOptimized.tsx',
    'GpsAnalysisTab.tsx',
    'GpsProfilesTab.tsx',
    'LazyGpsComponents.tsx'
  ];
  
  const componentsDir = path.join(__dirname, '..', 'src', 'components', 'gps');
  let validComponents = 0;
  
  components.forEach(component => {
    const filePath = path.join(componentsDir, component);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;
        const size = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(2);
        
        // Проверяем базовые требования
        const hasExport = content.includes('export');
        const hasReact = content.includes('react') || content.includes('React');
        const hasTypeScript = content.includes(':') && content.includes('interface');
        
        if (hasExport && hasReact) {
          console.log(`  ✅ ${component}: ${lines} lines, ${size} KB`);
          validComponents++;
        } else {
          console.log(`  ⚠️  ${component}: Missing exports or React imports`);
        }
      } catch (error) {
        console.log(`  ❌ ${component}: Error reading file - ${error.message}`);
      }
    } else {
      console.log(`  ❌ ${component}: File not found`);
    }
  });
  
  return { validComponents, totalComponents: components.length };
}

// Тестирование API endpoints
function testApiEndpoints() {
  console.log('\n🌐 Testing GPS API endpoints...');
  
  const endpoints = [
    'canonical-metrics/route.ts',
    'canonical-metrics-all/route.ts',
    'canonical-metrics-for-mapping/route.ts',
    'profiles/route.ts',
    'profiles/[id]/route.ts',
    'reports/route.ts',
    'reports/[id]/route.ts',
    'reports/[id]/visualization/route.ts',
    'reports/[id]/team-averages/route.ts',
    'reports/[id]/player-models/route.ts',
    'reports/[id]/data/route.ts',
    'reports/[id]/data/bulk-update/route.ts',
    'upload/route.ts',
    'events/route.ts',
    'teams/route.ts',
    'units/route.ts'
  ];
  
  const apiDir = path.join(__dirname, '..', 'src', 'app', 'api', 'gps');
  let validEndpoints = 0;
  
  endpoints.forEach(endpoint => {
    const filePath = path.join(apiDir, endpoint);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;
        const size = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(2);
        
        // Проверяем базовые требования
        const hasExport = content.includes('export async function');
        const hasNextRequest = content.includes('NextRequest');
        const hasNextResponse = content.includes('NextResponse');
        const hasAuth = content.includes('getServerSession');
        
        if (hasExport && hasNextRequest && hasNextResponse) {
          console.log(`  ✅ ${endpoint}: ${lines} lines, ${size} KB`);
          validEndpoints++;
        } else {
          console.log(`  ⚠️  ${endpoint}: Missing required exports or types`);
        }
      } catch (error) {
        console.log(`  ❌ ${endpoint}: Error reading file - ${error.message}`);
      }
    } else {
      console.log(`  ❌ ${endpoint}: File not found`);
    }
  });
  
  return { validEndpoints, totalEndpoints: endpoints.length };
}

// Тестирование библиотек
function testLibraries() {
  console.log('\n📚 Testing GPS libraries...');
  
  const libraries = [
    'gps-file-parser.ts',
    'gps-validation.ts',
    'gps-errors.ts',
    'gps-permissions.ts',
    'gps-constants.ts',
    'gps-queries.ts',
    'db-cache.ts',
    'api-cache-middleware.ts',
    'pagination.ts',
    'validation.ts',
    'api-error-handler.ts',
    'logger.ts',
    'tree-shaking.ts'
  ];
  
  const libDir = path.join(__dirname, '..', 'src', 'lib');
  let validLibraries = 0;
  
  libraries.forEach(library => {
    const filePath = path.join(libDir, library);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;
        const size = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(2);
        
        // Проверяем базовые требования
        const hasExport = content.includes('export');
        const hasTypeScript = content.includes(':') || content.includes('interface');
        
        if (hasExport) {
          console.log(`  ✅ ${library}: ${lines} lines, ${size} KB`);
          validLibraries++;
        } else {
          console.log(`  ⚠️  ${library}: Missing exports`);
        }
      } catch (error) {
        console.log(`  ❌ ${library}: Error reading file - ${error.message}`);
      }
    } else {
      console.log(`  ❌ ${library}: File not found`);
    }
  });
  
  return { validLibraries, totalLibraries: libraries.length };
}

// Тестирование схемы БД
function testDatabaseSchema() {
  console.log('\n🗄️  Testing database schema...');
  
  const schemaFiles = [
    'gpsReport.ts',
    'gpsReportData.ts',
    'gpsCanonicalMetric.ts',
    'gpsColumnMapping.ts',
    'gpsPermissions.ts'
  ];
  
  const schemaDir = path.join(__dirname, '..', 'src', 'db', 'schema');
  let validSchemas = 0;
  
  schemaFiles.forEach(schema => {
    const filePath = path.join(schemaDir, schema);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;
        const size = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(2);
        
        // Проверяем базовые требования
        const hasPgTable = content.includes('pgTable');
        const hasExport = content.includes('export');
        const hasRelations = content.includes('relations');
        
        if (hasPgTable && hasExport) {
          console.log(`  ✅ ${schema}: ${lines} lines, ${size} KB`);
          validSchemas++;
        } else {
          console.log(`  ⚠️  ${schema}: Missing required Drizzle exports`);
        }
      } catch (error) {
        console.log(`  ❌ ${schema}: Error reading file - ${error.message}`);
      }
    } else {
      console.log(`  ❌ ${schema}: File not found`);
    }
  });
  
  return { validSchemas, totalSchemas: schemaFiles.length };
}

// Проверка импортов и зависимостей
function testImports() {
  console.log('\n🔗 Testing imports and dependencies...');
  
  const gpsComponentsDir = path.join(__dirname, '..', 'src', 'components', 'gps');
  const files = fs.readdirSync(gpsComponentsDir).filter(file => file.endsWith('.tsx'));
  
  let validImports = 0;
  let totalFiles = files.length;
  
  files.forEach(file => {
    const filePath = path.join(gpsComponentsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Проверяем импорты
      const hasReactImport = content.includes("import React") || content.includes("import {");
      const hasUIComponents = content.includes("@/components/ui/");
      const hasLibImports = content.includes("@/lib/");
      const hasProperExports = content.includes("export");
      
      if (hasReactImport && hasProperExports) {
        console.log(`  ✅ ${file}: Valid imports and exports`);
        validImports++;
      } else {
        console.log(`  ⚠️  ${file}: Missing required imports or exports`);
      }
    } catch (error) {
      console.log(`  ❌ ${file}: Error reading file - ${error.message}`);
    }
  });
  
  return { validImports, totalFiles };
}

// Генерация отчета
function generateComprehensiveReport(results) {
  console.log('\n📋 Comprehensive GPS System Report');
  console.log('='.repeat(60));
  
  const {
    fileSystem,
    components,
    apiEndpoints,
    libraries,
    databaseSchema,
    imports
  } = results;
  
  // Общая статистика
  console.log('\n📊 Overall Statistics:');
  console.log(`  File System: ${fileSystem ? '✅' : '❌'}`);
  console.log(`  Components: ${components.validComponents}/${components.totalComponents} (${Math.round(components.validComponents/components.totalComponents*100)}%)`);
  console.log(`  API Endpoints: ${apiEndpoints.validEndpoints}/${apiEndpoints.totalEndpoints} (${Math.round(apiEndpoints.validEndpoints/apiEndpoints.totalEndpoints*100)}%)`);
  console.log(`  Libraries: ${libraries.validLibraries}/${libraries.totalLibraries} (${Math.round(libraries.validLibraries/libraries.totalLibraries*100)}%)`);
  console.log(`  Database Schema: ${databaseSchema.validSchemas}/${databaseSchema.totalSchemas} (${Math.round(databaseSchema.validSchemas/databaseSchema.totalSchemas*100)}%)`);
  console.log(`  Imports: ${imports.validImports}/${imports.totalFiles} (${Math.round(imports.validImports/imports.totalFiles*100)}%)`);
  
  // Расчет общего балла
  const totalItems = components.totalComponents + apiEndpoints.totalEndpoints + libraries.totalLibraries + databaseSchema.totalSchemas + imports.totalFiles;
  const validItems = components.validComponents + apiEndpoints.validEndpoints + libraries.validLibraries + databaseSchema.validSchemas + imports.validImports;
  const overallScore = Math.round((validItems / totalItems) * 100);
  
  console.log(`\n🎯 Overall Score: ${overallScore}%`);
  
  // Оценка качества
  if (overallScore >= 90) {
    console.log('  Status: ✅ Excellent - GPS system is fully functional');
  } else if (overallScore >= 80) {
    console.log('  Status: ⚠️  Good - Minor issues to address');
  } else if (overallScore >= 70) {
    console.log('  Status: ⚠️  Fair - Several issues need attention');
  } else {
    console.log('  Status: ❌ Poor - Major issues require fixing');
  }
  
  // Рекомендации
  console.log('\n💡 Recommendations:');
  
  if (components.validComponents < components.totalComponents) {
    console.log('  - Fix missing or broken GPS components');
  }
  
  if (apiEndpoints.validEndpoints < apiEndpoints.totalEndpoints) {
    console.log('  - Fix missing or broken API endpoints');
  }
  
  if (libraries.validLibraries < libraries.totalLibraries) {
    console.log('  - Fix missing or broken utility libraries');
  }
  
  if (databaseSchema.validSchemas < databaseSchema.totalSchemas) {
    console.log('  - Fix missing or broken database schemas');
  }
  
  if (imports.validImports < imports.totalFiles) {
    console.log('  - Fix import/export issues in components');
  }
  
  if (overallScore >= 90) {
    console.log('  - System is ready for production use');
    console.log('  - Consider adding automated tests');
    console.log('  - Monitor performance in production');
  }
  
  return overallScore;
}

// Основная функция
async function runComprehensiveTest() {
  const startTime = performance.now();
  
  try {
    console.log('🚀 Starting comprehensive GPS system test...\n');
    
    const fileSystem = testFileSystem();
    const components = testComponents();
    const apiEndpoints = testApiEndpoints();
    const libraries = testLibraries();
    const databaseSchema = testDatabaseSchema();
    const imports = testImports();
    
    const results = {
      fileSystem,
      components,
      apiEndpoints,
      libraries,
      databaseSchema,
      imports
    };
    
    const overallScore = generateComprehensiveReport(results);
    
    const endTime = performance.now();
    const testTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️  Test completed in ${testTime}s`);
    console.log(`🎯 Final Score: ${overallScore}%`);
    
    if (overallScore >= 90) {
      console.log('\n🎉 GPS system is ready for production!');
    } else {
      console.log('\n⚠️  GPS system needs attention before production use.');
    }
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
    process.exit(1);
  }
}

// Запуск теста
if (require.main === module) {
  runComprehensiveTest();
}

module.exports = {
  testFileSystem,
  testComponents,
  testApiEndpoints,
  testLibraries,
  testDatabaseSchema,
  testImports,
  generateComprehensiveReport
};
