#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

// @ts-ignore
import { CANON } from '../../src/canon/metrics.registry';

// Используем прямой pg-клиент для raw SQL
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

interface RecoveryResult {
  reportId: string;
  profileId: string;
  columnsCount: number;
  sampleColumns: string[];
  issues: string[];
  recoveryReady: boolean;
  canonVersion: string;
  createdAtISO: string;
  recoveryStrategy: string;
}

interface RecoverySummary {
  orphanReports: number;
  recoveryReady: number;
  withIssues: Record<string, number>;
  byProfileId: Record<string, { count: number; recoveryReady: number }>;
}

function extractCanonicalColumns(processedData: any, rawData: any[]): { columns: string[]; strategy: string } {
  // Стратегия 1: processedData.canonical.columns[]
  if (processedData?.canonical?.columns && Array.isArray(processedData.canonical.columns)) {
    const columns = processedData.canonical.columns
      .filter((col: any) => col.canonicalKey)
      .map((col: any) => col.canonicalKey);
    if (columns.length > 0) {
      return { columns, strategy: 'canonical.columns' };
    }
  }

  // Стратегия 2: processedData.canonical.rows[0] - ключи первой строки
  if (processedData?.canonical?.rows && Array.isArray(processedData.canonical.rows) && processedData.canonical.rows.length > 0) {
    const firstRow = processedData.canonical.rows[0];
    if (firstRow && typeof firstRow === 'object') {
      const columns = Object.keys(firstRow).filter(key => 
        key !== '__rowIndex' && 
        key !== 'rowIndex' && 
        key !== 'athlete_id' && 
        key !== 'playerId'
      );
      if (columns.length > 0) {
        return { columns, strategy: 'canonical.rows[0]' };
      }
    }
  }

  // Стратегия 3: processedData.profile.columns[]
  if (processedData?.profile?.columns && Array.isArray(processedData.profile.columns)) {
    const columns = processedData.profile.columns
      .filter((col: any) => col.canonicalKey)
      .map((col: any) => col.canonicalKey);
    if (columns.length > 0) {
      return { columns, strategy: 'profile.columns' };
    }
  }

  // Стратегия 4: rawData[0] - заголовки из raw данных
  if (rawData && Array.isArray(rawData) && rawData.length > 0) {
    const firstRow = rawData[0];
    if (firstRow && typeof firstRow === 'object') {
      const columns = Object.keys(firstRow);
      if (columns.length > 0) {
        return { columns, strategy: 'rawData[0]' };
      }
    }
  }

  return { columns: [], strategy: 'none' };
}

function buildRecoverySnapshot(columns: string[]): any {
  const snapshotColumns = columns.map((canonicalKey, index) => {
    const metric = CANON.metrics?.[canonicalKey];
    const displayName = metric?.display?.ru || metric?.display?.en || canonicalKey;
    const unit = metric?.unit || null;
    
    return {
      sourceHeader: '(recovered)',
      canonicalKey,
      displayName,
      order: index,
      isVisible: true,
      unit,
      transform: null
    };
  });

  return {
    profileId: null, // Будет установлен из отчёта
    gpsSystem: null,
    sport: null,
    columns: snapshotColumns,
    profileVersion: null,
    createdAtISO: null, // Будет установлен из отчёта
    meta: {
      recovered: true,
      reason: 'PROFILE_NOT_FOUND'
    }
  };
}

async function dryRunRecovery() {
  const results: RecoveryResult[] = [];
  const summary: RecoverySummary = {
    orphanReports: 0,
    recoveryReady: 0,
    withIssues: {},
    byProfileId: {}
  };

  try {
    // Подключаемся к БД
    await client.connect();
    console.log('🔌 Connected to database for dry-run recovery');

    // 1. Находим orphan-отчёты (profileSnapshot IS NULL И профиль не существует)
    const orphanReportsResult = await client.query(`
      SELECT r.id, r."profileId", r."gpsSystem", r."processedData", r."rawData", r."createdAt"
      FROM public."GpsReport" r
      LEFT JOIN public."GpsProfile" p ON p.id = r."profileId"
      WHERE r."profileSnapshot" IS NULL 
        AND p.id IS NULL
      ORDER BY r."createdAt"
    `);

    summary.orphanReports = orphanReportsResult.rows.length;
    console.log(`📊 Orphan reports found: ${summary.orphanReports}`);

    if (summary.orphanReports === 0) {
      console.log('✅ No orphan reports need recovery');
      return;
    }

    // 2. Обрабатываем каждый orphan-отчёт
    for (const report of orphanReportsResult.rows) {
      const result: RecoveryResult = {
        reportId: report.id,
        profileId: report.profileId,
        columnsCount: 0,
        sampleColumns: [],
        issues: [],
        recoveryReady: false,
        canonVersion: CANON.__meta?.version || 'unknown',
        createdAtISO: report.createdAt.toISOString(),
        recoveryStrategy: 'none'
      };

      try {
        // Извлекаем канонические колонки
        const { columns, strategy } = extractCanonicalColumns(report.processedData, report.rawData);
        result.recoveryStrategy = strategy;
        result.columnsCount = columns.length;
        result.sampleColumns = columns.slice(0, 5);

        if (columns.length === 0) {
          result.issues.push('EMPTY_COLUMNS');
        } else {
          // Строим recovery snapshot
          const recoverySnapshot = buildRecoverySnapshot(columns);
          
          // Валидации
          const uniqueKeys = new Set(columns);
          if (columns.length !== uniqueKeys.size) {
            result.issues.push('DUPLICATE_CANONICAL_KEY');
          }

          // Проверка на неизвестные ключи
          const unknownKeys = columns.filter(key => !CANON.metrics?.[key]);
          if (unknownKeys.length > 0) {
            result.issues.push('UNKNOWN_KEYS');
          }

          // Проверка конфликтов единиц
          for (const col of recoverySnapshot.columns) {
            if (col.unit && CANON.dimensions) {
              const metric = CANON.metrics?.[col.canonicalKey];
              if (metric?.dimension && CANON.dimensions[metric.dimension]) {
                const allowedUnits = CANON.dimensions[metric.dimension].allowed_units || [];
                if (!allowedUnits.includes(col.unit)) {
                  result.issues.push('UNIT_CONFLICT');
                  break;
                }
              }
            }
          }

          // Определяем готовность к recovery
          result.recoveryReady = columns.length > 0 && !result.issues.includes('EMPTY_COLUMNS');
        }

      } catch (error) {
        result.issues.push(`ERROR: ${error}`);
      }

      results.push(result);

      // Обновляем статистику
      if (result.recoveryReady) {
        summary.recoveryReady++;
      }

      for (const issue of result.issues) {
        summary.withIssues[issue] = (summary.withIssues[issue] || 0) + 1;
      }

      // Агрегируем по profileId
      if (!summary.byProfileId[result.profileId]) {
        summary.byProfileId[result.profileId] = { count: 0, recoveryReady: 0 };
      }
      summary.byProfileId[result.profileId].count++;
      if (result.recoveryReady) {
        summary.byProfileId[result.profileId].recoveryReady++;
      }
    }

    // Сохраняем результаты
    writeFileSync('artifacts/recover-dryrun.json', JSON.stringify(results, null, 2));
    
    // Создаём человекочитаемую сводку
    const mdContent = generateRecoveryMarkdown(summary, results);
    writeFileSync('artifacts/recover-dryrun.md', mdContent);

    console.log('\n📋 RECOVERY DRY-RUN SUMMARY:');
    console.log(`Orphan reports: ${summary.orphanReports}`);
    console.log(`Recovery ready: ${summary.recoveryReady}`);
    console.log(`With issues: ${Object.keys(summary.withIssues).length} types`);
    console.log(`Top issues: ${Object.entries(summary.withIssues).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(', ')}`);
    console.log('\n📁 Artifacts:');
    console.log('- artifacts/recover-dryrun.json');
    console.log('- artifacts/recover-dryrun.md');

  } catch (error) {
    console.error('❌ Recovery dry-run failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

function generateRecoveryMarkdown(summary: RecoverySummary, results: RecoveryResult[]): string {
  const issuesTable = Object.entries(summary.withIssues)
    .sort(([,a], [,b]) => b - a)
    .map(([issue, count]) => `| ${issue} | ${count} |`)
    .join('\n');

  const profileTable = Object.entries(summary.byProfileId)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 10)
    .map(([profileId, stats]) => `| ${profileId} | ${stats.count} | ${stats.recoveryReady} |`)
    .join('\n');

  const examples = results
    .filter(r => r.recoveryReady)
    .slice(0, 5)
    .map(r => `| ${r.reportId} | ${r.profileId} | ${r.columnsCount} | ${r.sampleColumns.join(', ')} | ${r.issues.join(', ') || 'None'} |`)
    .join('\n');

  return `# GPS Recovery Dry-Run Report

## Summary

| Metric | Count |
|--------|-------|
| Orphan reports | ${summary.orphanReports} |
| Recovery ready | ${summary.recoveryReady} |
| With issues | ${Object.keys(summary.withIssues).length} types |

## Issues by Type

| Issue | Count |
|-------|-------|
${issuesTable}

## By Profile ID (Top 10)

| Profile ID | Reports | Recovery Ready |
|------------|---------|----------------|
${profileTable}

## Example Recovery-Ready Reports

| Report ID | Profile ID | Columns | Sample Columns | Issues |
|-----------|------------|---------|----------------|--------|
${examples}

## Notes

- All orphan reports (profileSnapshot IS NULL AND profile NOT EXISTS) have been analyzed
- No database writes were performed (DRY-RUN mode)
- Canon version: ${CANON.__meta?.version || 'unknown'}
- Generated: ${new Date().toISOString()}
`;
}

// Запускаем recovery dry-run
dryRunRecovery()
  .then(() => {
    console.log('🎯 Recovery dry-run completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Recovery dry-run failed:', error);
    process.exit(1);
  });
