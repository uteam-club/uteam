#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏥 GPS System Health Check\n');

let totalIssues = 0;
let criticalIssues = 0;

// Функция для проверки файла
function checkFile(filePath, checks) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${filePath} - File missing`);
    criticalIssues++;
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let fileIssues = 0;
  
  checks.forEach(check => {
    if (check.type === 'contains') {
      if (!content.includes(check.value)) {
        console.log(`❌ ${filePath} - Missing: ${check.description}`);
        fileIssues++;
        if (check.critical) criticalIssues++;
      }
    } else if (check.type === 'notContains') {
      if (content.includes(check.value)) {
        console.log(`❌ ${filePath} - Contains unwanted: ${check.description}`);
        fileIssues++;
        if (check.critical) criticalIssues++;
      }
    } else if (check.type === 'regex') {
      const regex = new RegExp(check.value);
      if (!regex.test(content)) {
        console.log(`❌ ${filePath} - Regex failed: ${check.description}`);
        fileIssues++;
        if (check.critical) criticalIssues++;
      }
    }
  });
  
  if (fileIssues === 0) {
    console.log(`✅ ${filePath} - All checks passed`);
  }
  
  totalIssues += fileIssues;
  return fileIssues === 0;
}

// 1. Проверка API файлов
console.log('1️⃣ Checking API files...');
const apiFiles = [
  {
    path: 'src/app/api/gps/reports/route.ts',
    checks: [
      { type: 'contains', value: 'export async function POST', description: 'POST handler', critical: true },
      { type: 'contains', value: 'export async function GET', description: 'GET handler', critical: true },
      { type: 'contains', value: 'NextRequest', description: 'NextRequest import', critical: true },
      { type: 'contains', value: 'NextResponse', description: 'NextResponse import', critical: true },
      { type: 'contains', value: 'getServerSession', description: 'getServerSession import', critical: true },
      { type: 'contains', value: 'authOptions', description: 'authOptions import', critical: true },
      { type: 'contains', value: 'db', description: 'db import', critical: true },
      { type: 'contains', value: 'eq', description: 'eq import', critical: true },
      { type: 'contains', value: 'and', description: 'and import', critical: true },
      { type: 'contains', value: 'convertUnit', description: 'convertUnit import', critical: true },
      { type: 'contains', value: 'gpsReport', description: 'gpsReport import', critical: true },
      { type: 'contains', value: 'gpsReportData', description: 'gpsReportData import', critical: true },
      { type: 'contains', value: 'gpsCanonicalMetric', description: 'gpsCanonicalMetric import', critical: true }
    ]
  },
  {
    path: 'src/app/api/gps/profiles/route.ts',
    checks: [
      { type: 'contains', value: 'export async function', description: 'API handlers', critical: true },
      { type: 'contains', value: 'NextRequest', description: 'NextRequest import', critical: true },
      { type: 'contains', value: 'NextResponse', description: 'NextResponse import', critical: true }
    ]
  },
  {
    path: 'src/app/api/gps/canonical-metrics/route.ts',
    checks: [
      { type: 'contains', value: 'export async function', description: 'API handlers', critical: true },
      { type: 'contains', value: 'NextRequest', description: 'NextRequest import', critical: true },
      { type: 'contains', value: 'NextResponse', description: 'NextResponse import', critical: true }
    ]
  },
  {
    path: 'src/app/api/gps/teams/route.ts',
    checks: [
      { type: 'contains', value: 'export async function', description: 'API handlers', critical: true },
      { type: 'contains', value: 'NextRequest', description: 'NextRequest import', critical: true },
      { type: 'contains', value: 'NextResponse', description: 'NextResponse import', critical: true }
    ]
  },
  {
    path: 'src/app/api/gps/events/route.ts',
    checks: [
      { type: 'contains', value: 'export async function', description: 'API handlers', critical: true },
      { type: 'contains', value: 'NextRequest', description: 'NextRequest import', critical: true },
      { type: 'contains', value: 'NextResponse', description: 'NextResponse import', critical: true }
    ]
  }
];

apiFiles.forEach(file => {
  checkFile(file.path, file.checks);
});

// 2. Проверка схем БД
console.log('\n2️⃣ Checking database schemas...');
const schemaFiles = [
  {
    path: 'src/db/schema/gpsReport.ts',
    checks: [
      { type: 'contains', value: 'export const gpsReport', description: 'gpsReport export', critical: true },
      { type: 'contains', value: 'pgTable', description: 'pgTable definition', critical: true },
      { type: 'contains', value: 'id: uuid', description: 'id field', critical: true },
      { type: 'contains', value: 'name: varchar', description: 'name field', critical: true },
      { type: 'contains', value: 'fileName: varchar', description: 'fileName field', critical: true },
      { type: 'contains', value: 'gpsSystem: varchar', description: 'gpsSystem field', critical: true },
      { type: 'contains', value: 'eventType: varchar', description: 'eventType field', critical: true },
      { type: 'contains', value: 'eventId: uuid', description: 'eventId field', critical: true },
      { type: 'contains', value: 'profileId: uuid', description: 'profileId field', critical: true },
      { type: 'contains', value: 'clubId: uuid', description: 'clubId field', critical: true },
      { type: 'contains', value: 'teamId: uuid', description: 'teamId field', critical: true },
      { type: 'contains', value: 'uploadedById: uuid', description: 'uploadedById field', critical: true }
    ]
  },
  {
    path: 'src/db/schema/gpsReportData.ts',
    checks: [
      { type: 'contains', value: 'export const gpsReportData', description: 'gpsReportData export', critical: true },
      { type: 'contains', value: 'pgTable', description: 'pgTable definition', critical: true },
      { type: 'contains', value: 'reportId: uuid', description: 'reportId field', critical: true },
      { type: 'contains', value: 'playerId: uuid', description: 'playerId field', critical: true },
      { type: 'contains', value: 'playerName: varchar', description: 'playerName field', critical: true },
      { type: 'contains', value: 'playerData: jsonb', description: 'playerData field', critical: true }
    ]
  },
  {
    path: 'src/db/schema/gpsCanonicalMetric.ts',
    checks: [
      { type: 'contains', value: 'export const gpsCanonicalMetric', description: 'gpsCanonicalMetric export', critical: true },
      { type: 'contains', value: 'pgTable', description: 'pgTable definition', critical: true },
      { type: 'contains', value: 'code: varchar', description: 'code field', critical: true },
      { type: 'contains', value: 'name: varchar', description: 'name field', critical: true },
      { type: 'contains', value: 'category: varchar', description: 'category field', critical: true },
      { type: 'contains', value: 'dimension: varchar', description: 'dimension field', critical: true },
      { type: 'contains', value: 'canonicalUnit: varchar', description: 'canonicalUnit field', critical: true }
    ]
  },
  {
    path: 'src/db/schema/gpsColumnMapping.ts',
    checks: [
      { type: 'contains', value: 'export const gpsColumnMapping', description: 'gpsColumnMapping export', critical: true },
      { type: 'contains', value: 'export const gpsVisualizationProfile', description: 'gpsVisualizationProfile export', critical: true },
      { type: 'contains', value: 'export const gpsProfileColumn', description: 'gpsProfileColumn export', critical: true },
      { type: 'contains', value: 'export const gpsProfileTeam', description: 'gpsProfileTeam export', critical: true }
    ]
  }
];

schemaFiles.forEach(file => {
  checkFile(file.path, file.checks);
});

// 3. Проверка утилит
console.log('\n3️⃣ Checking utility functions...');
const utilityFiles = [
  {
    path: 'src/lib/unit-converter.ts',
    checks: [
      { type: 'contains', value: 'export function convertUnit', description: 'convertUnit function', critical: true },
      { type: 'contains', value: 'interface UnitConversion', description: 'UnitConversion interface', critical: true },
      { type: 'contains', value: 'export function formatValue', description: 'formatValue function', critical: true },
      { type: 'contains', value: 'export function getPrecision', description: 'getPrecision function', critical: true }
    ]
  },
  {
    path: 'src/lib/db.ts',
    checks: [
      { type: 'contains', value: 'export const db', description: 'db export', critical: true },
      { type: 'contains', value: 'drizzle', description: 'drizzle import', critical: true },
      { type: 'contains', value: 'Pool', description: 'Pool import', critical: true },
      { type: 'contains', value: 'schema', description: 'schema import', critical: true }
    ]
  },
  {
    path: 'src/lib/auth.ts',
    checks: [
      { type: 'contains', value: 'export { authOptions }', description: 'authOptions export', critical: true },
      { type: 'contains', value: 'getServerSession', description: 'getServerSession import', critical: true },
      { type: 'contains', value: 'next-auth', description: 'next-auth import', critical: true }
    ]
  }
];

utilityFiles.forEach(file => {
  checkFile(file.path, file.checks);
});

// 4. Проверка React компонентов
console.log('\n4️⃣ Checking React components...');
const componentFiles = [
  {
    path: 'src/components/gps/GpsAnalysisTab.tsx',
    checks: [
      { type: 'contains', value: 'export function GpsAnalysisTab', description: 'GpsAnalysisTab export', critical: true },
      { type: 'contains', value: 'useState', description: 'useState hook', critical: true },
      { type: 'contains', value: 'useEffect', description: 'useEffect hook', critical: true },
      { type: 'contains', value: 'return (', description: 'JSX return', critical: true }
    ]
  },
  {
    path: 'src/components/gps/NewGpsReportModal.tsx',
    checks: [
      { type: 'contains', value: 'export function NewGpsReportModal', description: 'NewGpsReportModal export', critical: true },
      { type: 'contains', value: 'useState', description: 'useState hook', critical: true },
      { type: 'contains', value: 'useEffect', description: 'useEffect hook', critical: true },
      { type: 'contains', value: 'return (', description: 'JSX return', critical: true }
    ]
  },
  {
    path: 'src/components/gps/NewGpsProfileModal.tsx',
    checks: [
      { type: 'contains', value: 'export function NewGpsProfileModal', description: 'NewGpsProfileModal export', critical: true },
      { type: 'contains', value: 'useState', description: 'useState hook', critical: true },
      { type: 'contains', value: 'useEffect', description: 'useEffect hook', critical: true },
      { type: 'contains', value: 'return (', description: 'JSX return', critical: true }
    ]
  },
  {
    path: 'src/components/gps/GpsProfilesList.tsx',
    checks: [
      { type: 'contains', value: 'export function GpsProfilesList', description: 'GpsProfilesList export', critical: true },
      { type: 'contains', value: 'useState', description: 'useState hook', critical: true },
      { type: 'contains', value: 'useEffect', description: 'useEffect hook', critical: true },
      { type: 'contains', value: 'return (', description: 'JSX return', critical: true }
    ]
  },
  {
    path: 'src/components/gps/GpsReportVisualization.tsx',
    checks: [
      { type: 'contains', value: 'export function GpsReportVisualization', description: 'GpsReportVisualization export', critical: true },
      { type: 'contains', value: 'useState', description: 'useState hook', critical: true },
      { type: 'contains', value: 'useEffect', description: 'useEffect hook', critical: true },
      { type: 'contains', value: 'return (', description: 'JSX return', critical: true }
    ]
  }
];

componentFiles.forEach(file => {
  checkFile(file.path, file.checks);
});

// 5. Проверка конфигурационных файлов
console.log('\n5️⃣ Checking configuration files...');
const configFiles = [
  {
    path: 'package.json',
    checks: [
      { type: 'contains', value: '"name"', description: 'package name', critical: true },
      { type: 'contains', value: '"version"', description: 'package version', critical: true },
      { type: 'contains', value: '"dependencies"', description: 'dependencies', critical: true },
      { type: 'contains', value: '"devDependencies"', description: 'devDependencies', critical: true }
    ]
  },
  {
    path: 'tsconfig.json',
    checks: [
      { type: 'contains', value: '"compilerOptions"', description: 'compiler options', critical: true },
      { type: 'contains', value: '"target"', description: 'target', critical: true },
      { type: 'contains', value: '"lib"', description: 'lib', critical: true },
      { type: 'contains', value: '"module"', description: 'module', critical: true }
    ]
  },
  {
    path: 'next.config.cjs',
    checks: [
      { type: 'contains', value: 'module.exports', description: 'module exports', critical: true },
      { type: 'contains', value: 'nextConfig', description: 'nextConfig', critical: true }
    ]
  }
];

configFiles.forEach(file => {
  checkFile(file.path, file.checks);
});

// 6. Финальная проверка компиляции
console.log('\n6️⃣ Final compilation check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout.toString());
  console.log(error.stderr.toString());
  criticalIssues++;
}

// 7. Финальная проверка ESLint
console.log('\n7️⃣ Final ESLint check...');
try {
  execSync('npx eslint src/app/api/gps/ src/components/gps/ src/lib/unit-converter.ts --max-warnings 20', { stdio: 'pipe' });
  console.log('✅ ESLint passed');
} catch (error) {
  console.log('❌ ESLint failed:');
  console.log(error.stdout.toString());
  totalIssues++;
}

// Итоговый отчет
console.log('\n📊 Health Check Summary:');
console.log(`Total issues found: ${totalIssues}`);
console.log(`Critical issues: ${criticalIssues}`);

if (criticalIssues === 0) {
  console.log('🎉 GPS System is healthy!');
} else if (criticalIssues < 5) {
  console.log('⚠️  GPS System has minor issues that need attention');
} else {
  console.log('🚨 GPS System has critical issues that need immediate attention');
}

console.log('\n🔧 To fix issues, run: node scripts/fix-gps-errors.cjs');
console.log('📋 For detailed diagnostics, run: node scripts/diagnose-gps-errors.cjs');
