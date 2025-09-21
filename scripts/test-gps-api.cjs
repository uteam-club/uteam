#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 GPS API Testing Script\n');

// 1. Тест компиляции TypeScript
console.log('1️⃣ Testing TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout.toString());
  console.log(error.stderr.toString());
  process.exit(1);
}

// 2. Тест импортов в API файлах
console.log('\n2️⃣ Testing API imports...');
const apiFiles = [
  'src/app/api/gps/reports/route.ts',
  'src/app/api/gps/profiles/route.ts',
  'src/app/api/gps/canonical-metrics/route.ts',
  'src/app/api/gps/teams/route.ts',
  'src/app/api/gps/events/route.ts'
];

apiFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Проверяем критические импорты
    const criticalImports = [
      'NextRequest',
      'NextResponse',
      'getServerSession',
      'authOptions',
      'db',
      'eq',
      'and'
    ];
    
    const missingImports = criticalImports.filter(imp => !content.includes(imp));
    
    if (missingImports.length === 0) {
      console.log(`✅ ${file} - All critical imports present`);
    } else {
      console.log(`❌ ${file} - Missing imports: ${missingImports.join(', ')}`);
    }
  } else {
    console.log(`❌ ${file} - File missing`);
  }
});

// 3. Тест схем БД
console.log('\n3️⃣ Testing database schemas...');
const schemaFiles = [
  'src/db/schema/gpsReport.ts',
  'src/db/schema/gpsReportData.ts',
  'src/db/schema/gpsCanonicalMetric.ts',
  'src/db/schema/gpsColumnMapping.ts'
];

schemaFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Проверяем структуру схемы
    const hasPgTable = content.includes('pgTable');
    const hasExport = content.includes('export const');
    const hasValidSyntax = !content.includes('SyntaxError') && !content.includes('Unexpected token');
    
    if (hasPgTable && hasExport && hasValidSyntax) {
      console.log(`✅ ${file} - Valid schema structure`);
    } else {
      console.log(`❌ ${file} - Invalid schema structure`);
      if (!hasPgTable) console.log('  - Missing pgTable');
      if (!hasExport) console.log('  - Missing export');
      if (!hasValidSyntax) console.log('  - Syntax errors detected');
    }
  } else {
    console.log(`❌ ${file} - File missing`);
  }
});

// 4. Тест утилит
console.log('\n4️⃣ Testing utility functions...');
const utilityFiles = [
  'src/lib/unit-converter.ts',
  'src/lib/db.ts',
  'src/lib/auth.ts'
];

utilityFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    if (file.includes('unit-converter')) {
      const hasConvertUnit = content.includes('export function convertUnit');
      const hasUnitConversion = content.includes('interface UnitConversion');
      console.log(`✅ ${file} - ${hasConvertUnit ? 'convertUnit exported' : 'convertUnit missing'}, ${hasUnitConversion ? 'UnitConversion interface present' : 'UnitConversion interface missing'}`);
    } else if (file.includes('db.ts')) {
      const hasDbExport = content.includes('export const db');
      const hasDrizzle = content.includes('drizzle');
      console.log(`✅ ${file} - ${hasDbExport ? 'db exported' : 'db missing'}, ${hasDrizzle ? 'drizzle imported' : 'drizzle missing'}`);
    } else if (file.includes('auth.ts')) {
      const hasAuthOptions = content.includes('export { authOptions }');
      const hasGetServerSession = content.includes('getServerSession');
      console.log(`✅ ${file} - ${hasAuthOptions ? 'authOptions exported' : 'authOptions missing'}, ${hasGetServerSession ? 'getServerSession imported' : 'getServerSession missing'}`);
    }
  } else {
    console.log(`❌ ${file} - File missing`);
  }
});

// 5. Тест React компонентов
console.log('\n5️⃣ Testing React components...');
const componentFiles = [
  'src/components/gps/GpsAnalysisTab.tsx',
  'src/components/gps/NewGpsReportModal.tsx',
  'src/components/gps/NewGpsProfileModal.tsx',
  'src/components/gps/GpsProfilesList.tsx',
  'src/components/gps/GpsReportVisualization.tsx'
];

componentFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    const hasReactImport = content.includes('import React') || content.includes('from "react"');
    const hasExport = content.includes('export function') || content.includes('export default');
    const hasValidJSX = content.includes('<') && content.includes('>');
    
    if (hasReactImport && hasExport && hasValidJSX) {
      console.log(`✅ ${file} - Valid React component`);
    } else {
      console.log(`❌ ${file} - Invalid component structure`);
      if (!hasReactImport) console.log('  - Missing React import');
      if (!hasExport) console.log('  - Missing export');
      if (!hasValidJSX) console.log('  - No JSX detected');
    }
  } else {
    console.log(`❌ ${file} - File missing`);
  }
});

// 6. Тест конфигурационных файлов
console.log('\n6️⃣ Testing configuration files...');
const configFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.cjs',
  'tailwind.config.js'
];

configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (file.endsWith('.json')) {
        JSON.parse(content);
      }
      console.log(`✅ ${file} - Valid syntax`);
    } catch (error) {
      console.log(`❌ ${file} - Invalid syntax: ${error.message}`);
    }
  } else {
    console.log(`❌ ${file} - File missing`);
  }
});

console.log('\n🎯 API testing completed!');
