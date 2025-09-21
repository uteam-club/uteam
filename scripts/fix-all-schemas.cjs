#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 MASS FIXING ALL DRIZZLE SCHEMAS\n');

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

// Функция для конвертации типа PostgreSQL в Drizzle
function convertPostgresTypeToDrizzle(pgType, nullable) {
  const type = pgType.toLowerCase();
  
  if (type.includes('uuid')) return 'uuid';
  if (type.includes('character varying') || type.includes('varchar')) return 'varchar';
  if (type.includes('text')) return 'text';
  if (type.includes('boolean')) return 'boolean';
  if (type.includes('integer')) return 'integer';
  if (type.includes('numeric') || type.includes('decimal')) return 'decimal';
  if (type.includes('timestamp')) return 'timestamp';
  if (type.includes('jsonb')) return 'jsonb';
  
  return 'text'; // fallback
}

// Функция для генерации Drizzle схемы
function generateDrizzleSchema(tableName, columns) {
  let schema = `import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, decimal } from 'drizzle-orm/pg-core';\n\n`;
  
  // Добавляем импорты для foreign keys если нужно
  const hasForeignKeys = columns.some(col => col.name.includes('Id') && col.name !== 'id');
  if (hasForeignKeys) {
    schema += `// Add necessary imports for foreign keys\n`;
  }
  
  schema += `export const ${tableName.toLowerCase()} = pgTable('${tableName}', {\n`;
  
  for (const col of columns) {
    const drizzleType = convertPostgresTypeToDrizzle(col.type, col.nullable);
    const isNullable = col.nullable === 'NULL';
    const hasDefault = col.default && col.default !== 'NULL';
    
    let fieldDef = `  ${col.name}: ${drizzleType}('${col.name}'`;
    
    // Добавляем параметры для varchar
    if (drizzleType === 'varchar' && col.type.includes('(')) {
      const lengthMatch = col.type.match(/\((\d+)\)/);
      if (lengthMatch) {
        fieldDef += `, { length: ${lengthMatch[1]} }`;
      }
    }
    
    fieldDef += ')';
    
    // Добавляем .notNull() если нужно
    if (!isNullable) {
      fieldDef += '.notNull()';
    }
    
    // Добавляем .default() если есть
    if (hasDefault) {
      if (col.default.includes('gen_random_uuid()')) {
        fieldDef += '.defaultRandom()';
      } else if (col.default.includes('now()')) {
        fieldDef += '.defaultNow()';
      } else if (col.default.includes('true')) {
        fieldDef += '.default(true)';
      } else if (col.default.includes('false')) {
        fieldDef += '.default(false)';
      } else if (col.default.includes("'")) {
        const defaultValue = col.default.match(/'([^']+)'/);
        if (defaultValue) {
          fieldDef += `.default('${defaultValue[1]}')`;
        }
      } else if (!isNaN(col.default)) {
        fieldDef += `.default(${col.default})`;
      }
    }
    
    // Добавляем .primaryKey() для id
    if (col.name === 'id') {
      fieldDef += '.primaryKey()';
    }
    
    // Добавляем .unique() для уникальных полей
    if (col.name.includes('code') || col.name.includes('email')) {
      fieldDef += '.unique()';
    }
    
    fieldDef += ',';
    schema += fieldDef + '\n';
  }
  
  schema += '});\n';
  return schema;
}

// Список всех таблиц для исправления
const tablesToFix = [
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

console.log('📊 Fixing schemas for all GPS tables...\n');

let fixedCount = 0;
let errorCount = 0;

for (const tableName of tablesToFix) {
  console.log(`🔧 Fixing ${tableName}...`);
  
  try {
    // Получаем структуру из базы данных
    const columns = getTableStructure(tableName);
    
    if (columns.length === 0) {
      console.log(`❌ Table ${tableName} not found in database`);
      errorCount++;
      continue;
    }
    
    // Генерируем новую схему
    const newSchema = generateDrizzleSchema(tableName, columns);
    
    // Определяем файл для записи
    let filePath;
    switch (tableName) {
      case 'GpsReport':
        filePath = 'src/db/schema/gpsReport.ts';
        break;
      case 'GpsReportData':
        filePath = 'src/db/schema/gpsReportData.ts';
        break;
      case 'GpsCanonicalMetric':
      case 'GpsUnit':
        filePath = 'src/db/schema/gpsCanonicalMetric.ts';
        break;
      case 'GpsColumnMapping':
      case 'GpsVisualizationProfile':
      case 'GpsProfileColumn':
      case 'GpsProfileTeam':
        filePath = 'src/db/schema/gpsColumnMapping.ts';
        break;
      case 'GpsDataChangeLog':
        filePath = 'src/db/schema/gpsReportData.ts';
        break;
      default:
        filePath = `src/db/schema/${tableName.toLowerCase()}.ts`;
    }
    
    // Читаем существующий файл
    let existingContent = '';
    if (fs.existsSync(filePath)) {
      existingContent = fs.readFileSync(filePath, 'utf8');
    }
    
    // Если файл содержит несколько таблиц, добавляем к существующему
    if (existingContent.includes('export const') && filePath.includes('gpsColumnMapping.ts')) {
      // Добавляем новую схему к существующему файлу
      const newTableSchema = generateDrizzleSchema(tableName, columns);
      if (!existingContent.includes(`export const ${tableName.toLowerCase()}`)) {
        existingContent += '\n\n' + newTableSchema;
        fs.writeFileSync(filePath, existingContent);
        console.log(`✅ Added ${tableName} to ${filePath}`);
      } else {
        console.log(`⚠️  ${tableName} already exists in ${filePath}`);
      }
    } else {
      // Записываем новый файл
      fs.writeFileSync(filePath, newSchema);
      console.log(`✅ Created ${filePath}`);
    }
    
    fixedCount++;
    
  } catch (error) {
    console.log(`❌ Error fixing ${tableName}: ${error.message}`);
    errorCount++;
  }
}

// Теперь давайте исправим все API файлы, чтобы они использовали правильные поля
console.log('\n🔧 Fixing API files...\n');

// Список API файлов для исправления
const apiFiles = [
  'src/app/api/gps/reports/route.ts',
  'src/app/api/gps/profiles/route.ts',
  'src/app/api/gps/canonical-metrics/route.ts',
  'src/app/api/gps/teams/route.ts',
  'src/app/api/gps/events/route.ts'
];

for (const apiFile of apiFiles) {
  if (fs.existsSync(apiFile)) {
    try {
      let content = fs.readFileSync(apiFile, 'utf8');
      
      // Исправляем reportId на gpsReportId
      content = content.replace(/reportId/g, 'gpsReportId');
      
      // Исправляем playerData на правильную структуру
      content = content.replace(/playerData/g, 'canonicalMetric, value, unit');
      
      // Исправляем импорты
      content = content.replace(/from '@\/db'/g, 'from \'@/lib/db\'');
      
      fs.writeFileSync(apiFile, content);
      console.log(`✅ Fixed ${apiFile}`);
    } catch (error) {
      console.log(`❌ Error fixing ${apiFile}: ${error.message}`);
      errorCount++;
    }
  }
}

// Исправляем типы
console.log('\n🔧 Fixing TypeScript types...\n');

const typesFile = 'src/types/gps.ts';
if (fs.existsSync(typesFile)) {
  try {
    let content = fs.readFileSync(typesFile, 'utf8');
    
    // Обновляем GpsReportData интерфейс
    content = content.replace(
      /export interface GpsReportData \{[\s\S]*?\}/,
      `export interface GpsReportData {
  id: string;
  gpsReportId: string;
  playerId: string;
  canonicalMetric: string;
  value: string;
  unit: string;
  createdAt: Date;
}`
    );
    
    fs.writeFileSync(typesFile, content);
    console.log(`✅ Fixed ${typesFile}`);
  } catch (error) {
    console.log(`❌ Error fixing ${typesFile}: ${error.message}`);
    errorCount++;
  }
}

// Проверяем TypeScript компиляцию
console.log('\n🔧 Checking TypeScript compilation...\n');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout.toString());
  console.log(error.stderr.toString());
  errorCount++;
}

// Итоговый отчет
console.log('\n\n📊 MASS FIX SUMMARY');
console.log('='.repeat(50));
console.log(`Tables fixed: ${fixedCount}`);
console.log(`Errors: ${errorCount}`);

if (errorCount === 0) {
  console.log('🎉 All schemas fixed successfully!');
} else {
  console.log('⚠️  Some errors occurred - check logs above');
}

console.log('\n🔧 Next steps:');
console.log('1. Run: node scripts/compare-drizzle-db.cjs');
console.log('2. Test GPS system functionality');
console.log('3. Fix any remaining issues');
