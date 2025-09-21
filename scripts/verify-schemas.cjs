#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFYING DRIZZLE SCHEMAS vs DATABASE\n');

// Функция для получения структуры таблицы из PostgreSQL
function getTableStructure(tableName) {
  try {
    const command = `psql "postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt" -c "\\d \\"${tableName}\\""`;
    const output = execSync(command, { encoding: 'utf8' });
    
    const lines = output.split('\n');
    const columns = [];
    let inColumns = false;
    
    for (const line of lines) {
      if (line.includes('Column') && line.includes('Type')) {
        inColumns = true;
        continue;
      }
      if (inColumns && line.trim() && !line.includes('Indexes:') && !line.includes('(')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const columnName = parts[0];
          const dataType = parts[1];
          const nullable = parts[2] === 'not' ? 'NOT NULL' : 'NULL';
          const defaultValue = parts.slice(3).join(' ') || null;
          
          columns.push({
            name: columnName,
            type: dataType,
            nullable: nullable,
            default: defaultValue
          });
        }
      }
      if (line.includes('Indexes:')) {
        break;
      }
    }
    
    return columns;
  } catch (error) {
    console.log(`❌ Table ${tableName} not found in database`);
    return [];
  }
}

// Функция для парсинга Drizzle схемы
function parseDrizzleSchema(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const columns = [];
    
    // Ищем pgTable определение
    const tableMatch = content.match(/export const (\w+) = pgTable\('([^']+)',\s*{([^}]+)}/s);
    if (!tableMatch) return { tableName: null, columns: [] };
    
    const tableName = tableMatch[2];
    const tableContent = tableMatch[3];
    
    // Парсим колонки
    const columnMatches = tableContent.matchAll(/(\w+):\s*(\w+)\(['"`]([^'"`]+)['"`]([^)]*)\)/g);
    
    for (const match of columnMatches) {
      const columnName = match[3];
      const columnType = match[2];
      const options = match[4] || '';
      
      const nullable = !options.includes('.notNull()');
      const hasDefault = options.includes('.default');
      
      columns.push({
        name: columnName,
        type: columnType,
        nullable: nullable ? 'NULL' : 'NOT NULL',
        default: hasDefault ? 'HAS_DEFAULT' : null
      });
    }
    
    return { tableName, columns };
  } catch (error) {
    console.log(`❌ Error parsing Drizzle schema ${filePath}: ${error.message}`);
    return { tableName: null, columns: [] };
  }
}

// Список таблиц для проверки
const tablesToCheck = [
  'GpsReport',
  'GpsReportData', 
  'GpsCanonicalMetric',
  'GpsUnit',
  'GpsColumnMapping',
  'GpsVisualizationProfile',
  'GpsProfileColumn',
  'GpsProfileTeam',
  'GpsDataChangeLog'
];

console.log('📊 Checking all GPS-related tables...\n');

let totalIssues = 0;
let criticalIssues = 0;
let perfectMatches = 0;

// Проверяем каждую таблицу
for (const tableName of tablesToCheck) {
  console.log(`🔍 Checking table: ${tableName}`);
  console.log('='.repeat(50));
  
  // Получаем структуру из базы данных
  const dbColumns = getTableStructure(tableName);
  
  if (dbColumns.length === 0) {
    console.log(`❌ Table ${tableName} not found in database`);
    criticalIssues++;
    continue;
  }
  
  // Ищем соответствующий файл Drizzle
  let drizzleSchema = null;
  const drizzleFiles = [
    'src/db/schema/gpsReport.ts',
    'src/db/schema/gpsReportData.ts',
    'src/db/schema/gpsCanonicalMetric.ts',
    'src/db/schema/gpsColumnMapping.ts'
  ];
  
  for (const file of drizzleFiles) {
    if (fs.existsSync(file)) {
      const schema = parseDrizzleSchema(file);
      if (schema.tableName === tableName) {
        drizzleSchema = schema;
        break;
      }
    }
  }
  
  if (!drizzleSchema) {
    console.log(`❌ No Drizzle schema found for ${tableName}`);
    criticalIssues++;
    continue;
  }
  
  console.log(`✅ Found Drizzle schema for ${tableName}`);
  
  // Сравниваем колонки
  const dbColumnNames = new Set(dbColumns.map(col => col.name));
  const drizzleColumnNames = new Set(drizzleSchema.columns.map(col => col.name));
  
  // Колонки в БД, но не в Drizzle
  const missingInDrizzle = [...dbColumnNames].filter(name => !drizzleColumnNames.has(name));
  if (missingInDrizzle.length > 0) {
    console.log(`❌ Missing in Drizzle schema: ${missingInDrizzle.join(', ')}`);
    totalIssues += missingInDrizzle.length;
    criticalIssues += missingInDrizzle.length;
  }
  
  // Колонки в Drizzle, но не в БД
  const missingInDB = [...drizzleColumnNames].filter(name => !dbColumnNames.has(name));
  if (missingInDB.length > 0) {
    console.log(`❌ Missing in database: ${missingInDB.join(', ')}`);
    totalIssues += missingInDB.length;
    criticalIssues += missingInDB.length;
  }
  
  // Проверяем типы данных и nullable
  let typeIssues = 0;
  for (const dbCol of dbColumns) {
    const drizzleCol = drizzleSchema.columns.find(col => col.name === dbCol.name);
    if (!drizzleCol) continue;
    
    // Проверяем nullable
    if (dbCol.nullable !== drizzleCol.nullable) {
      console.log(`⚠️  ${dbCol.name}: nullable mismatch - DB: ${dbCol.nullable}, Drizzle: ${drizzleCol.nullable}`);
      typeIssues++;
    }
    
    // Проверяем типы (упрощенная проверка)
    const dbType = dbCol.type.toLowerCase();
    const drizzleType = drizzleCol.type.toLowerCase();
    
    if (!dbType.includes(drizzleType) && !drizzleType.includes(dbType)) {
      console.log(`⚠️  ${dbCol.name}: type mismatch - DB: ${dbCol.type}, Drizzle: ${drizzleCol.type}`);
      typeIssues++;
    }
  }
  
  totalIssues += typeIssues;
  
  if (missingInDrizzle.length === 0 && missingInDB.length === 0 && typeIssues === 0) {
    console.log(`✅ ${tableName} schema matches perfectly!`);
    perfectMatches++;
  } else {
    console.log(`⚠️  ${tableName} has ${missingInDrizzle.length + missingInDB.length + typeIssues} issues`);
  }
}

// Проверяем TypeScript компиляцию
console.log('\n🔍 Checking TypeScript compilation...\n');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout.toString());
  console.log(error.stderr.toString());
  totalIssues++;
  criticalIssues++;
}

// Итоговый отчет
console.log('\n\n📊 VERIFICATION SUMMARY');
console.log('='.repeat(50));
console.log(`Tables checked: ${tablesToCheck.length}`);
console.log(`Perfect matches: ${perfectMatches}`);
console.log(`Total issues: ${totalIssues}`);
console.log(`Critical issues: ${criticalIssues}`);

if (criticalIssues === 0 && totalIssues === 0) {
  console.log('🎉 ALL SCHEMAS ARE PERFECTLY SYNCHRONIZED!');
} else if (criticalIssues === 0) {
  console.log('⚠️  Minor issues detected - schemas are mostly synchronized');
} else {
  console.log('🚨 Critical issues detected - immediate action required');
}

console.log('\n🔧 Next steps:');
if (criticalIssues > 0) {
  console.log('1. Fix missing columns in Drizzle schemas');
  console.log('2. Update database to match Drizzle schemas');
  console.log('3. Re-run this script to verify fixes');
} else {
  console.log('1. All schemas are synchronized');
  console.log('2. System is ready for production');
  console.log('3. Test GPS functionality');
}
