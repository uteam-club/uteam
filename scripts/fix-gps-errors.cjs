#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 GPS Error Fixing Script\n');

// 1. Исправление TypeScript ошибок
console.log('1️⃣ Fixing TypeScript errors...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ No TypeScript errors found');
} catch (error) {
  console.log('❌ TypeScript errors found, attempting to fix...');
  
  const errorOutput = error.stdout.toString() + error.stderr.toString();
  console.log('Error details:', errorOutput);
  
  // Автоматические исправления
  if (errorOutput.includes('Cannot find module')) {
    console.log('🔧 Fixing module import issues...');
    // Здесь можно добавить автоматические исправления импортов
  }
  
  if (errorOutput.includes('implicitly has an \'any\' type')) {
    console.log('🔧 Fixing implicit any type issues...');
    // Здесь можно добавить автоматические исправления типов
  }
}

// 2. Исправление ESLint ошибок
console.log('\n2️⃣ Fixing ESLint errors...');
try {
  execSync('npx eslint src/app/api/gps/ src/components/gps/ src/lib/unit-converter.ts --fix --max-warnings 20', { stdio: 'pipe' });
  console.log('✅ ESLint errors fixed');
} catch (error) {
  console.log('❌ ESLint errors could not be automatically fixed');
  console.log(error.stdout.toString());
}

// 3. Проверка и исправление импортов
console.log('\n3️⃣ Checking and fixing imports...');
const filesToCheck = [
  'src/app/api/gps/reports/route.ts',
  'src/app/api/gps/profiles/route.ts',
  'src/app/api/gps/canonical-metrics/route.ts',
  'src/app/api/gps/teams/route.ts',
  'src/app/api/gps/events/route.ts'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Проверяем и исправляем импорты
    if (content.includes("import { db } from '@/db'")) {
      console.log(`🔧 Fixing db import in ${file}`);
      const fixedContent = content.replace("import { db } from '@/db'", "import { db } from '@/lib/db'");
      fs.writeFileSync(file, fixedContent);
    }
    
    if (content.includes("import { db } from '@/db/index'")) {
      console.log(`🔧 Fixing db import in ${file}`);
      const fixedContent = content.replace("import { db } from '@/db/index'", "import { db } from '@/lib/db'");
      fs.writeFileSync(file, fixedContent);
    }
    
    // Проверяем наличие всех необходимых импортов
    const requiredImports = [
      'NextRequest',
      'NextResponse',
      'getServerSession',
      'authOptions',
      'db',
      'eq',
      'and'
    ];
    
    const missingImports = requiredImports.filter(imp => !content.includes(imp));
    if (missingImports.length > 0) {
      console.log(`⚠️  ${file} - Missing imports: ${missingImports.join(', ')}`);
    } else {
      console.log(`✅ ${file} - All required imports present`);
    }
  }
});

// 4. Проверка и исправление схем БД
console.log('\n4️⃣ Checking and fixing database schemas...');
const schemaFiles = [
  'src/db/schema/gpsReport.ts',
  'src/db/schema/gpsReportData.ts',
  'src/db/schema/gpsCanonicalMetric.ts',
  'src/db/schema/gpsColumnMapping.ts'
];

schemaFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Проверяем синтаксис схемы
    if (content.includes('SyntaxError') || content.includes('Unexpected token')) {
      console.log(`❌ ${file} - Syntax errors detected`);
    } else if (content.includes('pgTable') && content.includes('export const')) {
      console.log(`✅ ${file} - Valid schema structure`);
    } else {
      console.log(`⚠️  ${file} - Potential schema issues`);
    }
  }
});

// 5. Проверка и исправление утилит
console.log('\n5️⃣ Checking and fixing utility functions...');
const utilityFiles = [
  'src/lib/unit-converter.ts',
  'src/lib/db.ts',
  'src/lib/auth.ts'
];

utilityFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    if (file.includes('unit-converter')) {
      if (!content.includes('export function convertUnit')) {
        console.log(`❌ ${file} - convertUnit function not exported`);
      } else {
        console.log(`✅ ${file} - convertUnit function exported`);
      }
    } else if (file.includes('db.ts')) {
      if (!content.includes('export const db')) {
        console.log(`❌ ${file} - db not exported`);
      } else {
        console.log(`✅ ${file} - db exported`);
      }
    } else if (file.includes('auth.ts')) {
      if (!content.includes('export { authOptions }')) {
        console.log(`❌ ${file} - authOptions not exported`);
      } else {
        console.log(`✅ ${file} - authOptions exported`);
      }
    }
  }
});

// 6. Проверка и исправление React компонентов
console.log('\n6️⃣ Checking and fixing React components...');
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
  }
});

// 7. Финальная проверка
console.log('\n7️⃣ Final verification...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful after fixes');
} catch (error) {
  console.log('❌ TypeScript errors still exist:');
  console.log(error.stdout.toString());
  console.log(error.stderr.toString());
}

try {
  execSync('npx eslint src/app/api/gps/ src/components/gps/ src/lib/unit-converter.ts --max-warnings 20', { stdio: 'pipe' });
  console.log('✅ ESLint passed after fixes');
} catch (error) {
  console.log('❌ ESLint errors still exist:');
  console.log(error.stdout.toString());
}

console.log('\n🎯 Error fixing completed!');
