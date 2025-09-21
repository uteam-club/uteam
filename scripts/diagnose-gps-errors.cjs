#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 GPS System Comprehensive Diagnostics\n');

// 1. Проверка TypeScript компиляции
console.log('1️⃣ Checking TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout.toString());
  console.log(error.stderr.toString());
}

// 2. Проверка ESLint
console.log('\n2️⃣ Checking ESLint...');
try {
  execSync('npx eslint src/app/api/gps/ src/components/gps/ src/lib/unit-converter.ts --max-warnings 20', { stdio: 'pipe' });
  console.log('✅ ESLint passed');
} catch (error) {
  console.log('❌ ESLint failed:');
  console.log(error.stdout.toString());
}

// 3. Проверка импортов и зависимостей
console.log('\n3️⃣ Checking imports and dependencies...');
const filesToCheck = [
  'src/app/api/gps/reports/route.ts',
  'src/lib/unit-converter.ts',
  'src/lib/db.ts',
  'src/db/schema/gpsReport.ts',
  'src/db/schema/gpsReportData.ts',
  'src/db/schema/gpsCanonicalMetric.ts',
  'src/lib/auth.ts'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// 4. Проверка экспортов в критических файлах
console.log('\n4️⃣ Checking exports in critical files...');

// Проверка unit-converter.ts
const unitConverterContent = fs.readFileSync('src/lib/unit-converter.ts', 'utf8');
if (unitConverterContent.includes('export function convertUnit')) {
  console.log('✅ convertUnit function exported');
} else {
  console.log('❌ convertUnit function not exported');
}

// Проверка db.ts
const dbContent = fs.readFileSync('src/lib/db.ts', 'utf8');
if (dbContent.includes('export const db')) {
  console.log('✅ db connection exported');
} else {
  console.log('❌ db connection not exported');
}

// Проверка auth.ts
const authContent = fs.readFileSync('src/lib/auth.ts', 'utf8');
if (authContent.includes('export { authOptions }')) {
  console.log('✅ authOptions exported');
} else {
  console.log('❌ authOptions not exported');
}

// 5. Проверка схем БД
console.log('\n5️⃣ Checking database schemas...');
const schemaFiles = [
  'src/db/schema/gpsReport.ts',
  'src/db/schema/gpsReportData.ts',
  'src/db/schema/gpsCanonicalMetric.ts',
  'src/db/schema/gpsColumnMapping.ts'
];

schemaFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('export const') && content.includes('pgTable')) {
      console.log(`✅ ${file} - Valid schema`);
    } else {
      console.log(`❌ ${file} - Invalid schema structure`);
    }
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

// 6. Проверка API эндпоинтов
console.log('\n6️⃣ Checking API endpoints...');
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
    if (content.includes('export async function') && content.includes('NextResponse')) {
      console.log(`✅ ${file} - Valid API endpoint`);
    } else {
      console.log(`❌ ${file} - Invalid API structure`);
    }
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

// 7. Проверка React компонентов
console.log('\n7️⃣ Checking React components...');
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
    if (content.includes('export function') || content.includes('export default')) {
      console.log(`✅ ${file} - Valid React component`);
    } else {
      console.log(`❌ ${file} - Invalid component structure`);
    }
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

// 8. Проверка синтаксиса JSON файлов
console.log('\n8️⃣ Checking JSON files...');
const jsonFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.cjs'
];

jsonFiles.forEach(file => {
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
    console.log(`❌ ${file} - Missing`);
  }
});

// 9. Проверка переменных окружения
console.log('\n9️⃣ Checking environment variables...');
const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`✅ ${varName} is defined`);
    } else {
      console.log(`❌ ${varName} is missing`);
    }
  });
} else {
  console.log('❌ .env.local file missing');
}

// 10. Проверка зависимостей
console.log('\n🔟 Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'next',
    'react',
    'react-dom',
    'drizzle-orm',
    'pg',
    'next-auth',
    'typescript',
    '@types/node',
    '@types/react',
    '@types/react-dom'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`✅ ${dep} is installed`);
    } else {
      console.log(`❌ ${dep} is missing`);
    }
  });
} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
}

console.log('\n🎯 Diagnostics completed!');
