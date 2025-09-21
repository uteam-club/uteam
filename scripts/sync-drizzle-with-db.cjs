#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 SYNCING DRIZZLE SCHEMAS WITH DATABASE\n');

// Получаем точную структуру таблицы из PostgreSQL
function getExactTableStructure(tableName) {
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
    console.log(`❌ Table ${tableName} not found: ${error.message}`);
    return [];
  }
}

// Конвертируем PostgreSQL тип в Drizzle
function convertPgTypeToDrizzle(pgType, nullable, defaultValue) {
  const type = pgType.toLowerCase();
  
  if (type.includes('uuid')) return 'uuid';
  if (type.includes('character varying') || type.includes('varchar')) {
    const lengthMatch = pgType.match(/\((\d+)\)/);
    return lengthMatch ? `varchar('COLUMN_NAME', { length: ${lengthMatch[1]} })` : 'varchar';
  }
  if (type.includes('text')) return 'text';
  if (type.includes('boolean')) return 'boolean';
  if (type.includes('integer')) return 'integer';
  if (type.includes('numeric') || type.includes('decimal')) {
    const precisionMatch = pgType.match(/\((\d+),(\d+)\)/);
    return precisionMatch ? `decimal('COLUMN_NAME', { precision: ${precisionMatch[1]}, scale: ${precisionMatch[2]} })` : 'decimal';
  }
  if (type.includes('timestamp')) return 'timestamp';
  if (type.includes('jsonb')) return 'jsonb';
  
  return 'text';
}

// Генерируем Drizzle схему для таблицы
function generateDrizzleSchema(tableName, columns) {
  let schema = `import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, decimal } from 'drizzle-orm/pg-core';\n\n`;
  
  // Добавляем импорты для foreign keys если нужно
  if (tableName === 'GpsProfileColumn' || tableName === 'GpsProfileTeam') {
    schema += `import { gpsVisualizationProfile } from './gpsColumnMapping';\n`;
    schema += `import { gpsCanonicalMetric } from './gpsCanonicalMetric';\n`;
  }
  
  schema += `export const ${tableName.toLowerCase()} = pgTable('${tableName}', {\n`;
  
  for (const col of columns) {
    const drizzleType = convertPgTypeToDrizzle(col.type, col.nullable, col.default);
    const isNullable = col.nullable === 'NULL';
    const hasDefault = col.default && col.default !== 'NULL';
    
    let fieldDef = `  ${col.name}: `;
    
    // Обрабатываем varchar с длиной
    if (drizzleType.includes('varchar') && col.type.includes('(')) {
      const lengthMatch = col.type.match(/\((\d+)\)/);
      if (lengthMatch) {
        fieldDef += `varchar('${col.name}', { length: ${lengthMatch[1]} })`;
      } else {
        fieldDef += `varchar('${col.name}')`;
      }
    } else if (drizzleType.includes('decimal') && col.type.includes('(')) {
      const precisionMatch = col.type.match(/\((\d+),(\d+)\)/);
      if (precisionMatch) {
        fieldDef += `decimal('${col.name}', { precision: ${precisionMatch[1]}, scale: ${precisionMatch[2]} })`;
      } else {
        fieldDef += `decimal('${col.name}')`;
      }
    } else {
      fieldDef += `${drizzleType.replace('COLUMN_NAME', col.name)}('${col.name}')`;
    }
    
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

// Основная функция синхронизации
function syncSchemas() {
  const tablesToSync = [
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
  
  console.log('📊 Syncing schemas for all GPS tables...\n');
  
  let syncedCount = 0;
  let errorCount = 0;
  
  for (const tableName of tablesToSync) {
    console.log(`🔧 Syncing ${tableName}...`);
    
    try {
      // Получаем структуру из БД
      const columns = getExactTableStructure(tableName);
      
      if (columns.length === 0) {
        console.log(`❌ Table ${tableName} not found in database`);
        errorCount++;
        continue;
      }
      
      // Генерируем схему
      const schema = generateDrizzleSchema(tableName, columns);
      
      // Определяем файл для записи
      let filePath;
      switch (tableName) {
        case 'GpsReport':
          filePath = 'src/db/schema/gpsReport.ts';
          break;
        case 'GpsReportData':
        case 'GpsDataChangeLog':
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
        default:
          filePath = `src/db/schema/${tableName.toLowerCase()}.ts`;
      }
      
      // Читаем существующий файл
      let existingContent = '';
      if (fs.existsSync(filePath)) {
        existingContent = fs.readFileSync(filePath, 'utf8');
      }
      
      // Если файл содержит несколько таблиц, добавляем к существующему
      if (existingContent.includes('export const') && (filePath.includes('gpsColumnMapping.ts') || filePath.includes('gpsReportData.ts') || filePath.includes('gpsCanonicalMetric.ts'))) {
        // Добавляем новую схему к существующему файлу
        if (!existingContent.includes(`export const ${tableName.toLowerCase()}`)) {
          existingContent += '\n\n' + schema;
          fs.writeFileSync(filePath, existingContent);
          console.log(`✅ Added ${tableName} to ${filePath}`);
        } else {
          console.log(`⚠️  ${tableName} already exists in ${filePath}`);
        }
      } else {
        // Записываем новый файл
        fs.writeFileSync(filePath, schema);
        console.log(`✅ Created ${filePath}`);
      }
      
      syncedCount++;
      
    } catch (error) {
      console.log(`❌ Error syncing ${tableName}: ${error.message}`);
      errorCount++;
    }
  }
  
  return { syncedCount, errorCount };
}

// Проверяем результат
function verifySync() {
  console.log('\n🔍 Verifying sync...\n');
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
    return true;
  } catch (error) {
    console.log('❌ TypeScript compilation failed:');
    console.log(error.stdout.toString());
    console.log(error.stderr.toString());
    return false;
  }
}

// Основная функция
function main() {
  try {
    const { syncedCount, errorCount } = syncSchemas();
    
    console.log('\n📊 SYNC SUMMARY');
    console.log('='.repeat(50));
    console.log(`Tables synced: ${syncedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('🎉 All schemas synced successfully!');
      
      // Проверяем результат
      if (verifySync()) {
        console.log('✅ All schemas are now perfectly synchronized!');
      } else {
        console.log('⚠️  Some TypeScript errors remain - check logs above');
      }
    } else {
      console.log('⚠️  Some errors occurred - check logs above');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

main();
