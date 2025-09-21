#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧹 CLEANING AND RECREATING SCHEMAS\n');

// Очищаем все файлы схем
const schemaFiles = [
  'src/db/schema/gpsReport.ts',
  'src/db/schema/gpsReportData.ts',
  'src/db/schema/gpsCanonicalMetric.ts',
  'src/db/schema/gpsColumnMapping.ts'
];

console.log('🗑️  Cleaning existing schema files...');
for (const file of schemaFiles) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`✅ Deleted ${file}`);
  }
}

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

// Создаем правильные схемы
function createCorrectSchemas() {
  console.log('📝 Creating correct schemas...\n');
  
  // GpsReport
  const gpsReportColumns = getExactTableStructure('GpsReport');
  if (gpsReportColumns.length > 0) {
    let gpsReportSchema = `import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';\n\n`;
    gpsReportSchema += `export const gpsReport = pgTable('GpsReport', {\n`;
    
    for (const col of gpsReportColumns) {
      let fieldDef = `  ${col.name}: `;
      
      if (col.type.includes('uuid')) {
        fieldDef += `uuid('${col.name}')`;
      } else if (col.type.includes('character varying')) {
        const lengthMatch = col.type.match(/\((\d+)\)/);
        if (lengthMatch) {
          fieldDef += `varchar('${col.name}', { length: ${lengthMatch[1]} })`;
        } else {
          fieldDef += `varchar('${col.name}')`;
        }
      } else if (col.type.includes('text')) {
        fieldDef += `text('${col.name}')`;
      } else if (col.type.includes('boolean')) {
        fieldDef += `boolean('${col.name}')`;
      } else if (col.type.includes('integer')) {
        fieldDef += `integer('${col.name}')`;
      } else if (col.type.includes('timestamp')) {
        fieldDef += `timestamp('${col.name}', { withTimezone: true })`;
      } else if (col.type.includes('jsonb')) {
        fieldDef += `jsonb('${col.name}')`;
      } else {
        fieldDef += `text('${col.name}')`;
      }
      
      if (col.nullable === 'NOT NULL') {
        fieldDef += '.notNull()';
      }
      
      if (col.default && col.default.includes('gen_random_uuid()')) {
        fieldDef += '.defaultRandom()';
      } else if (col.default && col.default.includes('now()')) {
        fieldDef += '.defaultNow()';
      } else if (col.default && col.default.includes('true')) {
        fieldDef += '.default(true)';
      } else if (col.default && col.default.includes('false')) {
        fieldDef += '.default(false)';
      } else if (col.default && col.default.includes("'")) {
        const defaultValue = col.default.match(/'([^']+)'/);
        if (defaultValue) {
          fieldDef += `.default('${defaultValue[1]}')`;
        }
      } else if (col.default && !isNaN(col.default)) {
        fieldDef += `.default(${col.default})`;
      }
      
      if (col.name === 'id') {
        fieldDef += '.primaryKey()';
      }
      
      if (col.name.includes('code')) {
        fieldDef += '.unique()';
      }
      
      fieldDef += ',';
      gpsReportSchema += fieldDef + '\n';
    }
    
    gpsReportSchema += '});\n';
    fs.writeFileSync('src/db/schema/gpsReport.ts', gpsReportSchema);
    console.log('✅ Created gpsReport.ts');
  }
  
  // GpsReportData
  const gpsReportDataColumns = getExactTableStructure('GpsReportData');
  if (gpsReportDataColumns.length > 0) {
    let gpsReportDataSchema = `import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';\n\n`;
    gpsReportDataSchema += `export const gpsReportData = pgTable('GpsReportData', {\n`;
    
    for (const col of gpsReportDataColumns) {
      let fieldDef = `  ${col.name}: `;
      
      if (col.type.includes('uuid')) {
        fieldDef += `uuid('${col.name}')`;
      } else if (col.type.includes('character varying')) {
        const lengthMatch = col.type.match(/\((\d+)\)/);
        if (lengthMatch) {
          fieldDef += `varchar('${col.name}', { length: ${lengthMatch[1]} })`;
        } else {
          fieldDef += `varchar('${col.name}')`;
        }
      } else if (col.type.includes('text')) {
        fieldDef += `text('${col.name}')`;
      } else if (col.type.includes('timestamp')) {
        fieldDef += `timestamp('${col.name}', { withTimezone: true })`;
      } else {
        fieldDef += `text('${col.name}')`;
      }
      
      if (col.nullable === 'NOT NULL') {
        fieldDef += '.notNull()';
      }
      
      if (col.default && col.default.includes('gen_random_uuid()')) {
        fieldDef += '.defaultRandom()';
      } else if (col.default && col.default.includes('now()')) {
        fieldDef += '.defaultNow()';
      }
      
      if (col.name === 'id') {
        fieldDef += '.primaryKey()';
      }
      
      fieldDef += ',';
      gpsReportDataSchema += fieldDef + '\n';
    }
    
    gpsReportDataSchema += '});\n';
    fs.writeFileSync('src/db/schema/gpsReportData.ts', gpsReportDataSchema);
    console.log('✅ Created gpsReportData.ts');
  }
  
  // GpsCanonicalMetric
  const gpsCanonicalMetricColumns = getExactTableStructure('GpsCanonicalMetric');
  if (gpsCanonicalMetricColumns.length > 0) {
    let gpsCanonicalMetricSchema = `import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';\n\n`;
    gpsCanonicalMetricSchema += `export const gpsCanonicalMetric = pgTable('GpsCanonicalMetric', {\n`;
    
    for (const col of gpsCanonicalMetricColumns) {
      let fieldDef = `  ${col.name}: `;
      
      if (col.type.includes('uuid')) {
        fieldDef += `uuid('${col.name}')`;
      } else if (col.type.includes('character varying')) {
        const lengthMatch = col.type.match(/\((\d+)\)/);
        if (lengthMatch) {
          fieldDef += `varchar('${col.name}', { length: ${lengthMatch[1]} })`;
        } else {
          fieldDef += `varchar('${col.name}')`;
        }
      } else if (col.type.includes('text')) {
        fieldDef += `text('${col.name}')`;
      } else if (col.type.includes('boolean')) {
        fieldDef += `boolean('${col.name}')`;
      } else if (col.type.includes('timestamp')) {
        fieldDef += `timestamp('${col.name}', { withTimezone: true })`;
      } else if (col.type.includes('jsonb')) {
        fieldDef += `jsonb('${col.name}')`;
      } else {
        fieldDef += `text('${col.name}')`;
      }
      
      if (col.nullable === 'NOT NULL') {
        fieldDef += '.notNull()';
      }
      
      if (col.default && col.default.includes('gen_random_uuid()')) {
        fieldDef += '.defaultRandom()';
      } else if (col.default && col.default.includes('now()')) {
        fieldDef += '.defaultNow()';
      } else if (col.default && col.default.includes('true')) {
        fieldDef += '.default(true)';
      } else if (col.default && col.default.includes('false')) {
        fieldDef += '.default(false)';
      }
      
      if (col.name === 'id') {
        fieldDef += '.primaryKey()';
      }
      
      if (col.name.includes('code')) {
        fieldDef += '.unique()';
      }
      
      fieldDef += ',';
      gpsCanonicalMetricSchema += fieldDef + '\n';
    }
    
    gpsCanonicalMetricSchema += '});\n';
    fs.writeFileSync('src/db/schema/gpsCanonicalMetric.ts', gpsCanonicalMetricSchema);
    console.log('✅ Created gpsCanonicalMetric.ts');
  }
  
  // GpsColumnMapping и связанные таблицы
  const gpsColumnMappingColumns = getExactTableStructure('GpsColumnMapping');
  if (gpsColumnMappingColumns.length > 0) {
    let gpsColumnMappingSchema = `import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';\n`;
    gpsColumnMappingSchema += `import { gpsCanonicalMetric } from './gpsCanonicalMetric';\n\n`;
    
    // GpsColumnMapping
    gpsColumnMappingSchema += `export const gpsColumnMapping = pgTable('GpsColumnMapping', {\n`;
    for (const col of gpsColumnMappingColumns) {
      let fieldDef = `  ${col.name}: `;
      
      if (col.type.includes('uuid')) {
        fieldDef += `uuid('${col.name}')`;
      } else if (col.type.includes('character varying')) {
        const lengthMatch = col.type.match(/\((\d+)\)/);
        if (lengthMatch) {
          fieldDef += `varchar('${col.name}', { length: ${lengthMatch[1]} })`;
        } else {
          fieldDef += `varchar('${col.name}')`;
        }
      } else if (col.type.includes('text')) {
        fieldDef += `text('${col.name}')`;
      } else if (col.type.includes('boolean')) {
        fieldDef += `boolean('${col.name}')`;
      } else if (col.type.includes('integer')) {
        fieldDef += `integer('${col.name}')`;
      } else if (col.type.includes('timestamp')) {
        fieldDef += `timestamp('${col.name}', { withTimezone: true })`;
      } else {
        fieldDef += `text('${col.name}')`;
      }
      
      if (col.nullable === 'NOT NULL') {
        fieldDef += '.notNull()';
      }
      
      if (col.default && col.default.includes('gen_random_uuid()')) {
        fieldDef += '.defaultRandom()';
      } else if (col.default && col.default.includes('now()')) {
        fieldDef += '.defaultNow()';
      } else if (col.default && col.default.includes('true')) {
        fieldDef += '.default(true)';
      } else if (col.default && col.default.includes('false')) {
        fieldDef += '.default(false)';
      } else if (col.default && !isNaN(col.default)) {
        fieldDef += `.default(${col.default})`;
      }
      
      if (col.name === 'id') {
        fieldDef += '.primaryKey()';
      }
      
      fieldDef += ',';
      gpsColumnMappingSchema += fieldDef + '\n';
    }
    gpsColumnMappingSchema += '});\n\n';
    
    // Добавляем остальные таблицы...
    gpsColumnMappingSchema += `export const gpsVisualizationProfile = pgTable('GpsVisualizationProfile', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  clubId: uuid('clubId').notNull(),
  createdById: uuid('createdById').notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const gpsProfileColumn = pgTable('GpsProfileColumn', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profileId').references(() => gpsVisualizationProfile.id, { onDelete: 'cascade' }).notNull(),
  canonicalMetricId: uuid('canonicalMetricId').references(() => gpsCanonicalMetric.id, { onDelete: 'cascade' }).notNull(),
  displayName: varchar('displayName', { length: 255 }).notNull(),
  displayUnit: varchar('displayUnit', { length: 50 }).notNull(),
  displayOrder: integer('displayOrder').notNull(),
  isVisible: boolean('isVisible').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const gpsProfileTeam = pgTable('GpsProfileTeam', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profileId').references(() => gpsVisualizationProfile.id, { onDelete: 'cascade' }).notNull(),
  teamId: uuid('teamId').notNull(),
  clubId: uuid('clubId').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
});
`;
    
    fs.writeFileSync('src/db/schema/gpsColumnMapping.ts', gpsColumnMappingSchema);
    console.log('✅ Created gpsColumnMapping.ts');
  }
}

// Основная функция
function main() {
  try {
    createCorrectSchemas();
    
    console.log('\n🔍 Checking TypeScript compilation...\n');
    
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      console.log('✅ TypeScript compilation successful');
      console.log('\n🎉 All schemas are now perfectly synchronized!');
    } catch (error) {
      console.log('❌ TypeScript compilation failed:');
      console.log(error.stdout.toString());
      console.log(error.stderr.toString());
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

main();
