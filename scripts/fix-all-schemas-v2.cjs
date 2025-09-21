#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 MASS FIXING ALL DRIZZLE SCHEMAS V2\n');

// Получаем структуру таблицы из PostgreSQL
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

// Создаем правильные схемы
function createCorrectSchemas() {
  console.log('📝 Creating correct schemas...\n');
  
  // GpsReport
  const gpsReportSchema = `import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

export const gpsReport = pgTable('GpsReport', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  fileName: varchar('fileName', { length: 255 }).notNull(),
  fileUrl: text('fileUrl').notNull(),
  gpsSystem: varchar('gpsSystem', { length: 100 }).notNull(),
  eventType: varchar('eventType', { length: 50 }).notNull(),
  eventId: uuid('eventId').notNull(),
  profileId: uuid('profileId'),
  rawData: jsonb('rawData'),
  processedData: jsonb('processedData'),
  metadata: jsonb('metadata'),
  isProcessed: boolean('isProcessed').default(false).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  clubId: uuid('clubId').notNull(),
  uploadedById: uuid('uploadedById').notNull(),
  teamId: uuid('teamId').notNull(),
  ingestStatus: varchar('ingestStatus', { length: 50 }).default('pending').notNull(),
  ingestError: text('ingestError'),
  filePath: text('filePath'),
  profileSnapshot: jsonb('profileSnapshot'),
  canonVersion: text('canonVersion'),
  importMeta: jsonb('importMeta'),
  fileSize: integer('fileSize'),
  gpsProfileId: uuid('gpsProfileId'),
  trainingId: uuid('trainingId'),
  matchId: uuid('matchId'),
  status: varchar('status', { length: 50 }).default('uploaded').notNull(),
  processedAt: timestamp('processedAt', { withTimezone: true }),
  errorMessage: text('errorMessage'),
  playersCount: integer('playersCount').default(0),
  hasEdits: boolean('hasEdits').default(false),
});
`;
  
  // GpsReportData
  const gpsReportDataSchema = `import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const gpsReportData = pgTable('GpsReportData', {
  id: uuid('id').primaryKey().defaultRandom(),
  gpsReportId: uuid('gpsReportId').notNull(),
  playerId: uuid('playerId').notNull(),
  canonicalMetric: varchar('canonicalMetric', { length: 100 }).notNull(),
  value: text('value').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
});

export const gpsDataChangeLog = pgTable('GpsDataChangeLog', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportDataId: uuid('reportDataId').notNull(),
  reportId: uuid('reportId').notNull(),
  playerId: uuid('playerId').notNull(),
  clubId: uuid('clubId').notNull(),
  fieldName: varchar('fieldName', { length: 100 }).notNull(),
  fieldLabel: varchar('fieldLabel', { length: 255 }).notNull(),
  oldValue: jsonb('oldValue'),
  newValue: jsonb('newValue').notNull(),
  changedById: uuid('changedById').notNull(),
  changedByName: varchar('changedByName', { length: 255 }).notNull(),
  changedAt: timestamp('changedAt', { withTimezone: true }).defaultNow().notNull(),
  changeReason: text('changeReason'),
  changeType: varchar('changeType', { length: 50 }).default('manual').notNull(),
});
`;
  
  // GpsCanonicalMetric
  const gpsCanonicalMetricSchema = `import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, decimal } from 'drizzle-orm/pg-core';

export const gpsCanonicalMetric = pgTable('GpsCanonicalMetric', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  dimension: varchar('dimension', { length: 100 }).notNull(),
  canonicalUnit: varchar('canonicalUnit', { length: 50 }).notNull(),
  supportedUnits: jsonb('supportedUnits'),
  isDerived: boolean('isDerived').default(false).notNull(),
  formula: text('formula'),
  metadata: jsonb('metadata'),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const gpsUnit = pgTable('GpsUnit', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  dimension: varchar('dimension', { length: 100 }).notNull(),
  conversionFactor: decimal('conversionFactor', { precision: 10, scale: 6 }).notNull(),
  isCanonical: boolean('isCanonical').default(false).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});
`;
  
  // GpsColumnMapping
  const gpsColumnMappingSchema = `import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { gpsCanonicalMetric } from './gpsCanonicalMetric';

export const gpsColumnMapping = pgTable('GpsColumnMapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  gpsProfileId: uuid('gpsProfileId').notNull(),
  sourceColumn: varchar('sourceColumn', { length: 255 }).notNull(),
  customName: varchar('customName', { length: 255 }).notNull(),
  canonicalMetric: varchar('canonicalMetric', { length: 100 }).notNull(),
  isVisible: boolean('isVisible').default(true).notNull(),
  displayOrder: integer('displayOrder').default(0).notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  displayUnit: varchar('displayUnit', { length: 50 }),
  sourceUnit: varchar('sourceUnit', { length: 50 }),
});

export const gpsVisualizationProfile = pgTable('GpsVisualizationProfile', {
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
  
  // Записываем файлы
  fs.writeFileSync('src/db/schema/gpsReport.ts', gpsReportSchema);
  fs.writeFileSync('src/db/schema/gpsReportData.ts', gpsReportDataSchema);
  fs.writeFileSync('src/db/schema/gpsCanonicalMetric.ts', gpsCanonicalMetricSchema);
  fs.writeFileSync('src/db/schema/gpsColumnMapping.ts', gpsColumnMappingSchema);
  
  console.log('✅ All schema files created');
}

// Исправляем все импорты в API файлах
function fixAllImports() {
  console.log('🔧 Fixing all imports...\n');
  
  const filesToFix = [
    'src/app/api/gps/reports/route.ts',
    'src/app/api/gps/profiles/route.ts',
    'src/app/api/gps/canonical-metrics/route.ts',
    'src/app/api/gps/teams/route.ts',
    'src/app/api/gps/events/route.ts',
    'src/app/api/gps/upload/route.ts',
    'src/services/gps.service.ts',
    'src/lib/canonical-metrics.ts'
  ];
  
  for (const file of filesToFix) {
    if (fs.existsSync(file)) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        
        // Исправляем импорты
        content = content.replace(/from '@\/db\/schema\/gpsReport'/g, 'from \'@/db/schema/gpsReport\'');
        content = content.replace(/from '@\/db\/schema\/gpsReportData'/g, 'from \'@/db/schema/gpsReportData\'');
        content = content.replace(/from '@\/db\/schema\/gpsCanonicalMetric'/g, 'from \'@/db/schema/gpsCanonicalMetric\'');
        content = content.replace(/from '@\/db\/schema\/gpsColumnMapping'/g, 'from \'@/db/schema/gpsColumnMapping\'');
        content = content.replace(/from '@\/db'/g, 'from \'@/lib/db\'');
        
        // Исправляем названия экспортов
        content = content.replace(/gpsReport/g, 'gpsReport');
        content = content.replace(/gpsReportData/g, 'gpsReportData');
        content = content.replace(/gpsCanonicalMetric/g, 'gpsCanonicalMetric');
        content = content.replace(/gpsUnit/g, 'gpsUnit');
        content = content.replace(/gpsColumnMapping/g, 'gpsColumnMapping');
        content = content.replace(/gpsVisualizationProfile/g, 'gpsVisualizationProfile');
        content = content.replace(/gpsProfileColumn/g, 'gpsProfileColumn');
        content = content.replace(/gpsProfileTeam/g, 'gpsProfileTeam');
        content = content.replace(/gpsDataChangeLog/g, 'gpsDataChangeLog');
        
        fs.writeFileSync(file, content);
        console.log(`✅ Fixed ${file}`);
      } catch (error) {
        console.log(`❌ Error fixing ${file}: ${error.message}`);
      }
    }
  }
}

// Исправляем типы
function fixTypes() {
  console.log('🔧 Fixing TypeScript types...\n');
  
  const typesContent = `// GPS Report types
export interface GpsReport {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  gpsSystem: string;
  eventType: 'training' | 'match';
  eventId: string;
  profileId: string | null;
  rawData: any;
  processedData: any;
  metadata: any;
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
  clubId: string;
  uploadedById: string;
  teamId: string;
  ingestStatus: string;
  ingestError: string | null;
  filePath: string | null;
  profileSnapshot: any;
  canonVersion: string | null;
  importMeta: any;
  fileSize: number | null;
  gpsProfileId: string | null;
  trainingId: string | null;
  matchId: string | null;
  status: string;
  processedAt: Date | null;
  errorMessage: string | null;
  playersCount: number;
  hasEdits: boolean;
}

// GPS Report Data types
export interface GpsReportData {
  id: string;
  gpsReportId: string;
  playerId: string;
  canonicalMetric: string;
  value: string;
  unit: string;
  createdAt: Date;
}

// GPS Data Change Log types
export interface GpsDataChangeLog {
  id: string;
  reportDataId: string;
  reportId: string;
  playerId: string;
  clubId: string;
  fieldName: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
  changedById: string;
  changedByName: string;
  changedAt: Date;
  changeReason: string | null;
  changeType: string;
}

// GPS Canonical Metric types
export interface GpsCanonicalMetric {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  dimension: string;
  canonicalUnit: string;
  supportedUnits: any;
  isDerived: boolean;
  formula: string | null;
  metadata: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GPS Unit types
export interface GpsUnit {
  id: string;
  code: string;
  name: string;
  dimension: string;
  conversionFactor: number;
  isCanonical: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GPS Column Mapping types
export interface GpsColumnMapping {
  id: string;
  gpsProfileId: string;
  sourceColumn: string;
  customName: string;
  canonicalMetric: string;
  isVisible: boolean;
  displayOrder: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  displayUnit: string | null;
  sourceUnit: string | null;
}

// GPS Visualization Profile types
export interface GpsVisualizationProfile {
  id: string;
  name: string;
  description: string | null;
  clubId: string;
  createdById: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GPS Profile Column types
export interface GpsProfileColumn {
  id: string;
  profileId: string;
  canonicalMetricId: string;
  displayName: string;
  displayUnit: string;
  displayOrder: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GPS Profile Team types
export interface GpsProfileTeam {
  id: string;
  profileId: string;
  teamId: string;
  clubId: string;
  createdAt: Date;
}

// GPS Permission types
export interface GpsPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

// GPS User Permission types
export interface GpsUserPermission {
  id: string;
  userId: string;
  permissionId: string;
  resourceId: string | null;
  grantedAt: Date;
  grantedBy: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Request types
export interface CreateGpsReportRequest {
  name: string;
  fileName: string;
  fileSize: number;
  eventType: 'training' | 'match';
  eventId: string;
  teamId: string;
  profileId?: string;
  columnMappings: Array<{
    originalColumn: string;
    canonicalMetric: string;
    sourceUnit: string;
    isActive: boolean;
  }>;
  playerMappings: Array<{
    filePlayerName: string;
    playerId: string | null;
    similarity: 'high' | 'medium' | 'low' | 'not_found';
  }>;
  parsedData: {
    rows: Array<Record<string, any>>;
  };
}

export interface UpdateGpsReportDataRequest {
  dataId: string;
  fieldName: string;
  fieldLabel: string;
  newValue: {
    value: number;
    unit: string;
  };
  changeReason?: string;
}
`;
  
  fs.writeFileSync('src/types/gps.ts', typesContent);
  console.log('✅ Fixed types');
}

// Основная функция
function main() {
  try {
    createCorrectSchemas();
    fixAllImports();
    fixTypes();
    
    console.log('\n🔧 Checking TypeScript compilation...\n');
    
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      console.log('✅ TypeScript compilation successful');
    } catch (error) {
      console.log('❌ TypeScript compilation failed:');
      console.log(error.stdout.toString());
      console.log(error.stderr.toString());
    }
    
    console.log('\n🎉 All schemas fixed successfully!');
    console.log('\n🔧 Next steps:');
    console.log('1. Run: node scripts/compare-drizzle-db.cjs');
    console.log('2. Test GPS system functionality');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

main();
