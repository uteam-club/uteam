#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

// @ts-ignore
import { buildProfileSnapshot } from '../../src/services/gps/profileSnapshot.service';
// @ts-ignore
import { CANON } from '../../src/canon/metrics.registry';

// Используем прямой pg-клиент для raw SQL
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

interface BackfillResult {
  reportId: string;
  profileId: string;
  columnsCount: number;
  issues: string[];
  canonVersion: string;
  createdAtISO: string;
  willWrite: {
    profileSnapshot: boolean;
    canonVersion: boolean;
  };
}

interface BackfillSummary {
  totalReports: number;
  missingSnapshot: number;
  canBackfill: number;
  withIssues: number;
  byProfileId: Record<string, { count: number; issuesCount: number }>;
  topIssues: Record<string, number>;
}

async function dryRunBackfill() {
  const results: BackfillResult[] = [];
  const summary: BackfillSummary = {
    totalReports: 0,
    missingSnapshot: 0,
    canBackfill: 0,
    withIssues: 0,
    byProfileId: {},
    topIssues: {}
  };

  try {
    // Подключаемся к БД
    await client.connect();
    console.log('🔌 Connected to database for dry-run backfill');

    // 1. Подсчитываем общее количество отчётов
    const totalCountResult = await client.query(`
      SELECT COUNT(*) as total FROM public."GpsReport"
    `);
    summary.totalReports = parseInt(totalCountResult.rows[0].total);

    // 2. Подсчитываем отчёты без snapshot
    const missingSnapshotResult = await client.query(`
      SELECT COUNT(*) as missing FROM public."GpsReport" 
      WHERE "profileSnapshot" IS NULL
    `);
    summary.missingSnapshot = parseInt(missingSnapshotResult.rows[0].missing);

    console.log(`📊 Total reports: ${summary.totalReports}`);
    console.log(`📊 Missing snapshot: ${summary.missingSnapshot}`);

    if (summary.missingSnapshot === 0) {
      console.log('✅ No reports need backfill');
      return;
    }

    // 3. Обрабатываем отчёты пакетами
    const batchSize = 200;
    let offset = 0;
    let processed = 0;

    while (processed < summary.missingSnapshot) {
      const reportsResult = await client.query(`
        SELECT id, "profileId", "gpsSystem", "createdAt"
        FROM public."GpsReport" 
        WHERE "profileSnapshot" IS NULL
        ORDER BY "createdAt"
        LIMIT $1 OFFSET $2
      `, [batchSize, offset]);

      if (reportsResult.rows.length === 0) break;

      for (const report of reportsResult.rows) {
        const result: BackfillResult = {
          reportId: report.id,
          profileId: report.profileId,
          columnsCount: 0,
          issues: [],
          canonVersion: CANON.__meta?.version || 'unknown',
          createdAtISO: report.createdAt.toISOString(),
          willWrite: {
            profileSnapshot: true,
            canonVersion: true
          }
        };

        try {
          // Загружаем профиль
          const profileResult = await client.query(`
            SELECT id, "gpsSystem", "columnMapping", "createdAt"
            FROM public."GpsProfile" 
            WHERE id = $1
          `, [report.profileId]);

          if (profileResult.rows.length === 0) {
            result.issues.push('PROFILE_NOT_FOUND');
            result.willWrite.profileSnapshot = false;
            result.willWrite.canonVersion = false;
          } else {
            const profile = profileResult.rows[0];
            
            // Строим snapshot
            const profileSnapshot = buildProfileSnapshot({
              id: profile.id,
              gpsSystem: profile.gpsSystem,
              columnMapping: profile.columnMapping || [],
              createdAt: profile.createdAt.toISOString(),
            });

            result.columnsCount = profileSnapshot.columns.length;

            // Валидации
            if (result.columnsCount === 0) {
              result.issues.push('EMPTY_COLUMNS');
            }

            // Проверка дубликатов canonicalKey
            const canonicalKeys = profileSnapshot.columns.map(col => col.canonicalKey);
            const uniqueKeys = new Set(canonicalKeys);
            if (canonicalKeys.length !== uniqueKeys.size) {
              result.issues.push('DUPLICATE_CANONICAL_KEY');
            }

            // Проверка конфликтов unitOverride vs canon.units
            for (const col of profileSnapshot.columns) {
              if (col.unit && CANON.dimensions) {
                const dimension = CANON.metrics?.[col.canonicalKey]?.dimension;
                if (dimension && CANON.dimensions[dimension]) {
                  const allowedUnits = CANON.dimensions[dimension].allowed_units || [];
                  if (!allowedUnits.includes(col.unit)) {
                    result.issues.push('UNIT_CONFLICT');
                    break;
                  }
                }
              }
            }
          }

        } catch (error) {
          result.issues.push(`ERROR: ${error}`);
          result.willWrite.profileSnapshot = false;
          result.willWrite.canonVersion = false;
        }

        results.push(result);
        processed++;

        // Обновляем статистику
        if (!result.issues.includes('PROFILE_NOT_FOUND')) {
          summary.canBackfill++;
        }
        if (result.issues.length > 0) {
          summary.withIssues++;
        }

        // Агрегируем по profileId
        if (!summary.byProfileId[result.profileId]) {
          summary.byProfileId[result.profileId] = { count: 0, issuesCount: 0 };
        }
        summary.byProfileId[result.profileId].count++;
        if (result.issues.length > 0) {
          summary.byProfileId[result.profileId].issuesCount++;
        }

        // Агрегируем issues
        for (const issue of result.issues) {
          summary.topIssues[issue] = (summary.topIssues[issue] || 0) + 1;
        }
      }

      offset += batchSize;
      console.log(`📦 Processed batch: ${processed}/${summary.missingSnapshot}`);
    }

    // Сохраняем результаты
    writeFileSync('artifacts/backfill-dryrun.json', JSON.stringify(results, null, 2));
    
    // Создаём человекочитаемую сводку
    const mdContent = generateMarkdownReport(summary, results);
    writeFileSync('artifacts/backfill-dryrun.md', mdContent);

    console.log('\n📋 DRY-RUN SUMMARY:');
    console.log(`Total reports: ${summary.totalReports}`);
    console.log(`Missing snapshot: ${summary.missingSnapshot}`);
    console.log(`Can backfill: ${summary.canBackfill}`);
    console.log(`With issues: ${summary.withIssues}`);
    console.log(`Top issues: ${Object.entries(summary.topIssues).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(', ')}`);
    console.log('\n📁 Artifacts:');
    console.log('- artifacts/backfill-dryrun.json');
    console.log('- artifacts/backfill-dryrun.md');

  } catch (error) {
    console.error('❌ Dry-run failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

function generateMarkdownReport(summary: BackfillSummary, results: BackfillResult[]): string {
  const topIssuesTable = Object.entries(summary.topIssues)
    .sort(([,a], [,b]) => b - a)
    .map(([issue, count]) => `| ${issue} | ${count} |`)
    .join('\n');

  const profileTable = Object.entries(summary.byProfileId)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 10)
    .map(([profileId, stats]) => `| ${profileId} | ${stats.count} | ${stats.issuesCount} |`)
    .join('\n');

  const examples = results
    .filter(r => r.willWrite.profileSnapshot && r.issues.length === 0)
    .slice(0, 5)
    .map(r => `| ${r.reportId} | ${r.profileId} | ${r.columnsCount} | ${r.issues.join(', ') || 'None'} |`)
    .join('\n');

  return `# GPS Backfill Dry-Run Report

## Summary

| Metric | Count |
|--------|-------|
| Total reports | ${summary.totalReports} |
| Missing snapshot | ${summary.missingSnapshot} |
| Can backfill | ${summary.canBackfill} |
| With issues | ${summary.withIssues} |

## Top Issues

| Issue | Count |
|-------|-------|
${topIssuesTable}

## By Profile ID (Top 10)

| Profile ID | Reports | Issues |
|------------|---------|--------|
${profileTable}

## Example Reports for Backfill

| Report ID | Profile ID | Columns | Issues |
|-----------|------------|---------|--------|
${examples}

## Notes

- All reports with NULL profileSnapshot have been analyzed
- No database writes were performed (DRY-RUN mode)
- Canon version: ${CANON.__meta?.version || 'unknown'}
- Generated: ${new Date().toISOString()}
`;
}

// Запускаем dry-run
dryRunBackfill()
  .then(() => {
    console.log('🎯 Dry-run completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Dry-run failed:', error);
    process.exit(1);
  });
