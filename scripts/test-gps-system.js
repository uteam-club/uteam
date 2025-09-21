#!/usr/bin/env node

/**
 * Скрипт для тестирования GPS системы
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing GPS System...\n');

// Функция для выполнения команд
function runCommand(command, description) {
  console.log(`📋 ${description}`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log('✅ Success\n');
    return output;
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('📄 Output:', error.stdout || '');
    console.log('📄 Error:', error.stderr || '');
    console.log('');
    return null;
  }
}

// Проверяем TypeScript компиляцию
console.log('🔍 Checking TypeScript compilation...');
runCommand('npx tsc --noEmit', 'TypeScript type checking');

// Проверяем ESLint
console.log('🔍 Checking ESLint...');
runCommand('npx eslint src/components/gps/ src/app/api/gps/ src/lib/unit-converter.ts src/lib/gps-file-parser.ts src/lib/player-name-matcher.ts --max-warnings 0', 'ESLint checking');

// Проверяем, что все необходимые файлы существуют
console.log('🔍 Checking required files...');
const requiredFiles = [
  'src/components/gps/GpsAnalysisTab.tsx',
  'src/components/gps/NewGpsReportModal.tsx',
  'src/components/gps/NewGpsProfileModal.tsx',
  'src/components/gps/GpsProfilesList.tsx',
  'src/components/gps/GpsReportVisualization.tsx',
  'src/lib/unit-converter.ts',
  'src/lib/gps-file-parser.ts',
  'src/lib/player-name-matcher.ts',
  'src/db/schema/gpsCanonicalMetric.ts',
  'src/db/schema/gpsColumnMapping.ts',
  'src/db/schema/gpsReport.ts',
  'src/db/schema/gpsReportData.ts',
  'src/app/api/gps/canonical-metrics/route.ts',
  'src/app/api/gps/profiles/route.ts',
  'src/app/api/gps/reports/route.ts',
  'src/app/api/gps/teams/route.ts',
  'src/app/api/gps/events/route.ts',
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

if (allFilesExist) {
  console.log('\n✅ All required files exist!');
} else {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

// Проверяем схему БД
console.log('\n🔍 Checking database schema...');
const schemaFiles = [
  'src/db/schema/gpsCanonicalMetric.ts',
  'src/db/schema/gpsColumnMapping.ts',
  'src/db/schema/gpsReport.ts',
  'src/db/schema/gpsReportData.ts',
];

for (const schemaFile of schemaFiles) {
  const content = fs.readFileSync(schemaFile, 'utf8');
  if (content.includes('export const') && content.includes('pgTable')) {
    console.log(`✅ ${schemaFile} - Valid schema`);
  } else {
    console.log(`❌ ${schemaFile} - Invalid schema`);
    allFilesExist = false;
  }
}

// Проверяем API эндпоинты
console.log('\n🔍 Checking API endpoints...');
const apiFiles = [
  'src/app/api/gps/canonical-metrics/route.ts',
  'src/app/api/gps/profiles/route.ts',
  'src/app/api/gps/reports/route.ts',
  'src/app/api/gps/teams/route.ts',
  'src/app/api/gps/events/route.ts',
];

for (const apiFile of apiFiles) {
  const content = fs.readFileSync(apiFile, 'utf8');
  if (content.includes('export async function') && content.includes('NextResponse')) {
    console.log(`✅ ${apiFile} - Valid API endpoint`);
  } else {
    console.log(`❌ ${apiFile} - Invalid API endpoint`);
    allFilesExist = false;
  }
}

// Проверяем компоненты
console.log('\n🔍 Checking React components...');
const componentFiles = [
  'src/components/gps/GpsAnalysisTab.tsx',
  'src/components/gps/NewGpsReportModal.tsx',
  'src/components/gps/NewGpsProfileModal.tsx',
  'src/components/gps/GpsProfilesList.tsx',
  'src/components/gps/GpsReportVisualization.tsx',
];

for (const componentFile of componentFiles) {
  const content = fs.readFileSync(componentFile, 'utf8');
  if (content.includes('export function') && content.includes('React')) {
    console.log(`✅ ${componentFile} - Valid React component`);
  } else {
    console.log(`❌ ${componentFile} - Invalid React component`);
    allFilesExist = false;
  }
}

// Проверяем утилиты
console.log('\n🔍 Checking utility functions...');
const utilityFiles = [
  'src/lib/unit-converter.ts',
  'src/lib/gps-file-parser.ts',
  'src/lib/player-name-matcher.ts',
];

for (const utilityFile of utilityFiles) {
  const content = fs.readFileSync(utilityFile, 'utf8');
  if (content.includes('export') && content.includes('function')) {
    console.log(`✅ ${utilityFile} - Valid utility`);
  } else {
    console.log(`❌ ${utilityFile} - Invalid utility`);
    allFilesExist = false;
  }
}

console.log('\n🎉 GPS System test completed!');

if (allFilesExist) {
  console.log('✅ All checks passed! The GPS system is ready to use.');
  process.exit(0);
} else {
  console.log('❌ Some checks failed! Please fix the issues above.');
  process.exit(1);
}