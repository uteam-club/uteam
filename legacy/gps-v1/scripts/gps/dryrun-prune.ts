#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

interface PruneResult {
  reports: {
    R1: { count: number; ids: string[] };
    R2: { count: number; ids: string[] };
    R3: { count: number; ids: string[] };
    R4: { count: number; ids: string[] };
    R5: { count: number; ids: string[] };
  };
  profiles: {
    P1: { count: number; ids: string[] };
    P2: { count: number; ids: string[] };
    removable_after_reports: { count: number; ids: string[] };
  };
  ageBuckets: {
    gt365: number;
    d180_365: number;
    d90_180: number;
    lt90: number;
  };
  sizeEstimate: {
    rawBytes?: number;
    processedBytes?: number;
  };
  fks: {
    GpsReport: any[];
    GpsProfile: any[];
  };
}

async function dryRunPrune() {
  const result: PruneResult = {
    reports: {
      R1: { count: 0, ids: [] },
      R2: { count: 0, ids: [] },
      R3: { count: 0, ids: [] },
      R4: { count: 0, ids: [] },
      R5: { count: 0, ids: [] }
    },
    profiles: {
      P1: { count: 0, ids: [] },
      P2: { count: 0, ids: [] },
      removable_after_reports: { count: 0, ids: [] }
    },
    ageBuckets: {
      gt365: 0,
      d180_365: 0,
      d90_180: 0,
      lt90: 0
    },
    sizeEstimate: {},
    fks: {
      GpsReport: [],
      GpsProfile: []
    }
  };

  try {
    // Подключаемся к БД
    await client.connect();
    console.log('🔌 Connected to database for dry-run prune analysis');

    // 1. Анализ отчётов по категориям
    console.log('📊 Analyzing reports by categories...');

    // R1. Orphan: отчёты без профиля
    const orphanReportsResult = await client.query(`
      SELECT r.id, r."profileId", r."fileName", r."createdAt", r."isProcessed",
             (r."profileSnapshot" IS NOT NULL) as "hasSnapshot",
             (r."canonVersion" IS NOT NULL) as "hasCanon"
      FROM public."GpsReport" r
      LEFT JOIN public."GpsProfile" p ON p.id = r."profileId"
      WHERE p.id IS NULL
      ORDER BY r."createdAt"
    `);
    result.reports.R1 = {
      count: orphanReportsResult.rows.length,
      ids: orphanReportsResult.rows.map(r => r.id)
    };

    // R2. Unprocessed stale: isProcessed = false И createdAt < now() - interval '14 days'
    const unprocessedStaleResult = await client.query(`
      SELECT id, "profileId", "fileName", "createdAt", "isProcessed",
             ("profileSnapshot" IS NOT NULL) as "hasSnapshot",
             ("canonVersion" IS NOT NULL) as "hasCanon"
      FROM public."GpsReport"
      WHERE "isProcessed" = false 
        AND "createdAt" < NOW() - INTERVAL '14 days'
      ORDER BY "createdAt"
    `);
    result.reports.R2 = {
      count: unprocessedStaleResult.rows.length,
      ids: unprocessedStaleResult.rows.map(r => r.id)
    };

    // R3. Very old: createdAt < now() - interval '365 days'
    const veryOldResult = await client.query(`
      SELECT id, "profileId", "fileName", "createdAt", "isProcessed",
             ("profileSnapshot" IS NOT NULL) as "hasSnapshot",
             ("canonVersion" IS NOT NULL) as "hasCanon"
      FROM public."GpsReport"
      WHERE "createdAt" < NOW() - INTERVAL '365 days'
      ORDER BY "createdAt"
    `);
    result.reports.R3 = {
      count: veryOldResult.rows.length,
      ids: veryOldResult.rows.map(r => r.id)
    };

    // R4. Unlinked: проверяем наличие связей (если есть поля)
    try {
      const unlinkedResult = await client.query(`
        SELECT id, "profileId", "fileName", "createdAt", "isProcessed",
               ("profileSnapshot" IS NOT NULL) as "hasSnapshot",
               ("canonVersion" IS NOT NULL) as "hasCanon"
        FROM public."GpsReport"
        WHERE ("trainingId" IS NULL OR "trainingId" = '')
          AND ("matchId" IS NULL OR "matchId" = '')
          AND ("sessionId" IS NULL OR "sessionId" = '')
          AND ("fixtureId" IS NULL OR "fixtureId" = '')
        ORDER BY "createdAt"
      `);
      result.reports.R4 = {
        count: unlinkedResult.rows.length,
        ids: unlinkedResult.rows.map(r => r.id)
      };
    } catch (error) {
      console.log('⚠️  R4 (Unlinked) - fields not available, skipping');
      result.reports.R4 = { count: 0, ids: [] };
    }

    // R5. Duplicates: по fileName, fileSize, fileHash (если есть)
    try {
      const duplicatesResult = await client.query(`
        SELECT id, "profileId", "fileName", "createdAt", "isProcessed",
               ("profileSnapshot" IS NOT NULL) as "hasSnapshot",
               ("canonVersion" IS NOT NULL) as "hasCanon"
        FROM public."GpsReport"
        WHERE id IN (
          SELECT MIN(id) as id
          FROM public."GpsReport"
          GROUP BY "fileName", "fileSize"
          HAVING COUNT(*) > 1
        )
        ORDER BY "createdAt"
      `);
      result.reports.R5 = {
        count: duplicatesResult.rows.length,
        ids: duplicatesResult.rows.map(r => r.id)
      };
    } catch (error) {
      console.log('⚠️  R5 (Duplicates) - analysis failed, skipping');
      result.reports.R5 = { count: 0, ids: [] };
    }

    // 2. Анализ профилей
    console.log('📊 Analyzing profiles...');

    // P1. Unused: профили без использования
    const unusedProfilesResult = await client.query(`
      SELECT p.id, p.name, p."gpsSystem", p."createdAt",
             (SELECT COUNT(*) FROM public."GpsReport" WHERE "profileId" = p.id) as "usageCount"
      FROM public."GpsProfile" p
      WHERE (SELECT COUNT(*) FROM public."GpsReport" WHERE "profileId" = p.id) = 0
      ORDER BY p."createdAt"
    `);
    result.profiles.P1 = {
      count: unusedProfilesResult.rows.length,
      ids: unusedProfilesResult.rows.map(p => p.id)
    };

    // P2. Legacy: профили старше 365 дней И usageCount = 0
    const legacyProfilesResult = await client.query(`
      SELECT p.id, p.name, p."gpsSystem", p."createdAt",
             (SELECT COUNT(*) FROM public."GpsReport" WHERE "profileId" = p.id) as "usageCount"
      FROM public."GpsProfile" p
      WHERE p."createdAt" < NOW() - INTERVAL '365 days'
        AND (SELECT COUNT(*) FROM public."GpsReport" WHERE "profileId" = p.id) = 0
      ORDER BY p."createdAt"
    `);
    result.profiles.P2 = {
      count: legacyProfilesResult.rows.length,
      ids: legacyProfilesResult.rows.map(p => p.id)
    };

    // P3. Profiles, используемые ТОЛЬКО отчётами из набора R*
    const allReportIds = [
      ...result.reports.R1.ids,
      ...result.reports.R2.ids,
      ...result.reports.R3.ids,
      ...result.reports.R4.ids,
      ...result.reports.R5.ids
    ];
    
    if (allReportIds.length > 0) {
      const removableAfterReportsResult = await client.query(`
        SELECT p.id, p.name, p."gpsSystem", p."createdAt",
               (SELECT COUNT(*) FROM public."GpsReport" WHERE "profileId" = p.id) as "usageCount"
        FROM public."GpsProfile" p
        WHERE (SELECT COUNT(*) FROM public."GpsReport" 
               WHERE "profileId" = p.id 
                 AND id NOT IN (${allReportIds.map(id => `'${id}'`).join(',')})) = 0
          AND (SELECT COUNT(*) FROM public."GpsReport" WHERE "profileId" = p.id) > 0
        ORDER BY p."createdAt"
      `);
      result.profiles.removable_after_reports = {
        count: removableAfterReportsResult.rows.length,
        ids: removableAfterReportsResult.rows.map(p => p.id)
      };
    }

    // 3. Возрастные бакеты
    console.log('📊 Analyzing age buckets...');
    const ageBucketsResult = await client.query(`
      SELECT 
        COUNT(CASE WHEN "createdAt" < NOW() - INTERVAL '365 days' THEN 1 END) as gt365,
        COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '365 days' 
                   AND "createdAt" < NOW() - INTERVAL '180 days' THEN 1 END) as d180_365,
        COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '180 days' 
                   AND "createdAt" < NOW() - INTERVAL '90 days' THEN 1 END) as d90_180,
        COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '90 days' THEN 1 END) as lt90
      FROM public."GpsReport"
    `);
    const buckets = ageBucketsResult.rows[0];
    result.ageBuckets = {
      gt365: parseInt(buckets.gt365),
      d180_365: parseInt(buckets.d180_365),
      d90_180: parseInt(buckets.d90_180),
      lt90: parseInt(buckets.lt90)
    };

    // 4. Оценка размера JSON данных
    console.log('📊 Estimating JSON data size...');
    try {
      const sizeResult = await client.query(`
        SELECT 
          SUM(pg_column_size("rawData")) as "rawBytes",
          SUM(pg_column_size("processedData")) as "processedBytes"
        FROM public."GpsReport"
      `);
      const sizes = sizeResult.rows[0];
      result.sizeEstimate = {
        rawBytes: sizes.rawBytes ? parseInt(sizes.rawBytes) : undefined,
        processedBytes: sizes.processedBytes ? parseInt(sizes.processedBytes) : undefined
      };
    } catch (error) {
      console.log('⚠️  Size estimation failed, skipping');
    }

    // 5. Анализ FK зависимостей
    console.log('📊 Analyzing foreign key dependencies...');
    const fkResult = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name = 'GpsReport' OR ccu.table_name = 'GpsProfile')
      ORDER BY tc.table_name, tc.constraint_name
    `);
    
    result.fks.GpsReport = fkResult.rows.filter(r => r.foreign_table_name === 'GpsReport');
    result.fks.GpsProfile = fkResult.rows.filter(r => r.foreign_table_name === 'GpsProfile');

    // 6. Создание артефактов
    console.log('📁 Creating artifacts...');
    
    // Создаём директорию для SQL
    mkdirSync('artifacts/sql', { recursive: true });
    
    // Сохраняем JSON результат
    writeFileSync('artifacts/prune-dryrun.json', JSON.stringify(result, null, 2));
    
    // Создаём человекочитаемую сводку
    const mdContent = generatePruneMarkdown(result);
    writeFileSync('artifacts/prune-dryrun.md', mdContent);
    
    // Создаём SQL скрипты
    generateSQLScripts(result);

    // 7. Консольный вывод
    console.log('\n📋 PRUNE DRY-RUN SUMMARY:');
    console.log(`Reports - R1(Orphan): ${result.reports.R1.count}, R2(Unprocessed stale): ${result.reports.R2.count}, R3(Very old): ${result.reports.R3.count}, R4(Unlinked): ${result.reports.R4.count}, R5(Duplicates): ${result.reports.R5.count}`);
    console.log(`Profiles - P1(Unused): ${result.profiles.P1.count}, P2(Legacy): ${result.profiles.P2.count}, Removable after reports: ${result.profiles.removable_after_reports.count}`);
    console.log(`Age buckets - >365d: ${result.ageBuckets.gt365}, 180-365d: ${result.ageBuckets.d180_365}, 90-180d: ${result.ageBuckets.d90_180}, <90d: ${result.ageBuckets.lt90}`);
    console.log(`Size estimate - Raw: ${result.sizeEstimate.rawBytes || 'N/A'} bytes, Processed: ${result.sizeEstimate.processedBytes || 'N/A'} bytes`);
    console.log(`FK dependencies - GpsReport: ${result.fks.GpsReport.length}, GpsProfile: ${result.fks.GpsProfile.length}`);
    
    console.log('\n📁 Artifacts:');
    console.log('- artifacts/prune-dryrun.json');
    console.log('- artifacts/prune-dryrun.md');
    console.log('- artifacts/sql/delete_reports_R1_R2_R3_R4_R5.sql');
    console.log('- artifacts/sql/delete_profiles_P1_P2.sql');
    console.log('- artifacts/sql/delete_profiles_removable_after_reports.sql');

  } catch (error) {
    console.error('❌ Prune dry-run failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

function generatePruneMarkdown(result: PruneResult): string {
  const reportsTable = Object.entries(result.reports)
    .map(([category, data]) => `| ${category} | ${data.count} | ${data.ids.slice(0, 3).join(', ')}${data.ids.length > 3 ? '...' : ''} |`)
    .join('\n');

  const profilesTable = Object.entries(result.profiles)
    .map(([category, data]) => `| ${category} | ${data.count} | ${data.ids.slice(0, 3).join(', ')}${data.ids.length > 3 ? '...' : ''} |`)
    .join('\n');

  const ageBucketsTable = `| >365 days | 180-365 days | 90-180 days | <90 days |
|-----------|--------------|-------------|----------|
| ${result.ageBuckets.gt365} | ${result.ageBuckets.d180_365} | ${result.ageBuckets.d90_180} | ${result.ageBuckets.lt90} |`;

  const fkTable = `| Table | FK Count | Rules |
|-------|----------|-------|
| GpsReport | ${result.fks.GpsReport.length} | ${result.fks.GpsReport.map(fk => fk.delete_rule).join(', ') || 'N/A'} |
| GpsProfile | ${result.fks.GpsProfile.length} | ${result.fks.GpsProfile.map(fk => fk.delete_rule).join(', ') || 'N/A'} |`;

  return `# GPS Prune Dry-Run Report

## Summary

### Reports by Category

| Category | Count | Sample IDs |
|----------|-------|------------|
${reportsTable}

### Profiles by Category

| Category | Count | Sample IDs |
|----------|-------|------------|
${profilesTable}

## Age Distribution

${ageBucketsTable}

## Size Estimate

| Data Type | Size |
|-----------|------|
| Raw Data | ${result.sizeEstimate.rawBytes ? `${Math.round(result.sizeEstimate.rawBytes / 1024 / 1024)} MB` : 'N/A'} |
| Processed Data | ${result.sizeEstimate.processedBytes ? `${Math.round(result.sizeEstimate.processedBytes / 1024 / 1024)} MB` : 'N/A'} |

## Foreign Key Dependencies

${fkTable}

## Risks and Dependencies

- **No CASCADE deletes detected**: Manual cleanup required
- **Orphan reports**: ${result.reports.R1.count} reports without profiles
- **Unprocessed stale**: ${result.reports.R2.count} reports older than 14 days and not processed
- **Very old data**: ${result.reports.R3.count} reports older than 365 days

## Notes

- All analysis performed in DRY-RUN mode (no data modified)
- Generated: ${new Date().toISOString()}
- SQL scripts prepared for safe batch deletion
`;
}

function generateSQLScripts(result: PruneResult) {
  // SQL для удаления отчётов
  const allReportIds = [
    ...result.reports.R1.ids,
    ...result.reports.R2.ids,
    ...result.reports.R3.ids,
    ...result.reports.R4.ids,
    ...result.reports.R5.ids
  ];

  if (allReportIds.length > 0) {
    const deleteReportsSQL = `-- Delete GPS Reports (Categories R1-R5)
-- Generated: ${new Date().toISOString()}
-- WARNING: This script will permanently delete ${allReportIds.length} reports
-- Review the IDs carefully before execution

BEGIN;

-- Delete reports in batches of 500
${allReportIds.reduce((sql, id, index) => {
  if (index % 500 === 0) {
    const batch = allReportIds.slice(index, index + 500);
    return sql + `DELETE FROM public."GpsReport" WHERE id IN (${batch.map(id => `'${id}'`).join(', ')});\n`;
  }
  return sql;
}, '')}

COMMIT;

-- Verification query (run after execution):
-- SELECT COUNT(*) FROM public."GpsReport" WHERE id IN (${allReportIds.slice(0, 5).map(id => `'${id}'`).join(', ')});
`;

    writeFileSync('artifacts/sql/delete_reports_R1_R2_R3_R4_R5.sql', deleteReportsSQL);
  }

  // SQL для удаления неиспользуемых профилей
  const unusedProfileIds = [...result.profiles.P1.ids, ...result.profiles.P2.ids];
  if (unusedProfileIds.length > 0) {
    const deleteProfilesSQL = `-- Delete Unused GPS Profiles (Categories P1-P2)
-- Generated: ${new Date().toISOString()}
-- WARNING: This script will permanently delete ${unusedProfileIds.length} profiles
-- Only profiles with usageCount = 0 will be deleted

BEGIN;

-- Delete unused profiles in batches of 100
${unusedProfileIds.reduce((sql, id, index) => {
  if (index % 100 === 0) {
    const batch = unusedProfileIds.slice(index, index + 100);
    return sql + `DELETE FROM public."GpsProfile" WHERE id IN (${batch.map(id => `'${id}'`).join(', ')}) AND (SELECT COUNT(*) FROM public."GpsReport" WHERE "profileId" = id) = 0;\n`;
  }
  return sql;
}, '')}

COMMIT;

-- Verification query (run after execution):
-- SELECT COUNT(*) FROM public."GpsProfile" WHERE id IN (${unusedProfileIds.slice(0, 5).map(id => `'${id}'`).join(', ')});
`;

    writeFileSync('artifacts/sql/delete_profiles_P1_P2.sql', deleteProfilesSQL);
  }

  // SQL для удаления профилей после удаления отчётов
  const removableAfterReportsIds = result.profiles.removable_after_reports.ids;
  if (removableAfterReportsIds.length > 0) {
    const deleteRemovableProfilesSQL = `-- Delete Profiles After Report Cleanup (Category P3)
-- Generated: ${new Date().toISOString()}
-- WARNING: Run this script ONLY AFTER deleting reports from delete_reports_R1_R2_R3_R4_R5.sql
-- This script deletes profiles that become unused after report deletion

BEGIN;

-- Delete profiles that will become unused after report cleanup
${removableAfterReportsIds.reduce((sql, id, index) => {
  if (index % 100 === 0) {
    const batch = removableAfterReportsIds.slice(index, index + 100);
    return sql + `DELETE FROM public."GpsProfile" WHERE id IN (${batch.map(id => `'${id}'`).join(', ')}) AND (SELECT COUNT(*) FROM public."GpsReport" WHERE "profileId" = id) = 0;\n`;
  }
  return sql;
}, '')}

COMMIT;

-- Verification query (run after execution):
-- SELECT COUNT(*) FROM public."GpsProfile" WHERE id IN (${removableAfterReportsIds.slice(0, 5).map(id => `'${id}'`).join(', ')});
`;

    writeFileSync('artifacts/sql/delete_profiles_removable_after_reports.sql', deleteRemovableProfilesSQL);
  }
}

// Запускаем prune dry-run
dryRunPrune()
  .then(() => {
    console.log('🎯 Prune dry-run completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Prune dry-run failed:', error);
    process.exit(1);
  });
