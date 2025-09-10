#!/usr/bin/env tsx
// scripts/gps/backfill-sanitize-report.ts

import { config } from 'dotenv';
import { Client } from 'pg';
import { validateAthleteNameColumn } from '../../src/services/gps/validators/nameColumn.validator';
import { sanitizeRowsWithWarnings } from '../../src/services/gps/sanitizers/rowSanitizer';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

interface GpsReport {
  id: string;
  name: string;
  rawData: any[][];
  processedData: {
    canonical: {
      rows: Record<string, any>[];
      summary: Record<string, any>;
    };
    profile: {
      columns: Array<{
        sourceHeader: string;
        canonicalKey: string;
        displayName: string;
        isVisible: boolean;
      }>;
    };
  };
  importMeta: {
    warnings?: any[];
    suggestions?: any;
  };
}

async function sanitizeReport(reportId: string, dryRun: boolean = false): Promise<void> {
  console.log(`🔍 Загружаем отчёт ${reportId}...`);
  
  const result = await client.query(`
    SELECT id, name, "rawData", "processedData", "importMeta"
    FROM public."GpsReport"
    WHERE id = $1
  `, [reportId]);
  
  if (result.rows.length === 0) {
    console.error(`❌ Отчёт ${reportId} не найден`);
    return;
  }
  
  const report: GpsReport = result.rows[0];
  console.log(`📊 Отчёт: ${report.name}`);
  console.log(`📈 Исходное количество строк: ${report.processedData.canonical.rows.length}`);
  
  // Валидация колонки имён
  console.log(`🔍 Валидация колонки имён...`);
  const nameColumn = report.processedData.profile.columns.find(col => col.canonicalKey === 'athlete_name');
  let nameValidation = { warnings: [], suggestions: {} };
  
  if (nameColumn && report.rawData.length > 0) {
    // Извлекаем заголовки из rawData
    const headers = report.rawData[0] || [];
    const nameValues = report.rawData
      .slice(1, 51) // Пропускаем заголовок, берем первые 50 строк
      .map(row => {
        const nameIndex = headers.findIndex((h: string) => h === nameColumn.sourceHeader);
        return nameIndex >= 0 ? String(row[nameIndex] || '') : '';
      });
    
    nameValidation = validateAthleteNameColumn(nameValues, headers, nameColumn.sourceHeader);
    
    if (nameValidation.warnings.length > 0) {
      console.log(`⚠️  Найдены проблемы с колонкой имён:`);
      nameValidation.warnings.forEach((warning: any) => {
        console.log(`   - ${warning.message}`);
      });
    }
    
    if (nameValidation.suggestions.athleteNameHeader) {
      console.log(`💡 Предложение: использовать колонку "${nameValidation.suggestions.athleteNameHeader}" для имён игроков`);
    }
  }
  
  // Санитизация строк
  console.log(`🧹 Санитизация строк...`);
  const metricKeys = report.processedData.profile.columns
    .filter(col => col.canonicalKey !== 'athlete_name' && col.isVisible)
    .map(col => col.canonicalKey);
  
  const sanitizationResult = sanitizeRowsWithWarnings(
    report.processedData.canonical.rows,
    metricKeys,
    report.importMeta || {}
  );
  
  console.log(`📊 Результат санитизации:`);
  console.log(`   - Исходных строк: ${report.processedData.canonical.rows.length}`);
  console.log(`   - Отфильтровано: ${sanitizationResult.updatedImportMeta.warnings.reduce((sum: number, w: any) => sum + (w.count || 0), 0)}`);
  console.log(`   - Осталось: ${sanitizationResult.sanitizedRows.length}`);
  
  if (sanitizationResult.updatedImportMeta.warnings.length > 0) {
    console.log(`⚠️  Предупреждения:`);
    sanitizationResult.updatedImportMeta.warnings.forEach((warning: any) => {
      console.log(`   - ${warning.message}`);
    });
  }
  
  if (dryRun) {
    console.log(`🔍 DRY RUN: Изменения не применены`);
    return;
  }
  
  // Обновляем отчёт
  console.log(`💾 Обновляем отчёт...`);
  
  const updatedProcessedData = {
    ...report.processedData,
    canonical: {
      ...report.processedData.canonical,
      rows: sanitizationResult.sanitizedRows
    }
  };
  
  const updatedImportMeta = {
    ...report.importMeta,
    warnings: [
      ...(report.importMeta?.warnings || []),
      ...nameValidation.warnings,
      ...sanitizationResult.updatedImportMeta.warnings
    ],
    suggestions: {
      ...(report.importMeta?.suggestions || {}),
      ...nameValidation.suggestions
    }
  };
  
  await client.query(`
    UPDATE public."GpsReport"
    SET "processedData" = $1, "importMeta" = $2, "updatedAt" = NOW()
    WHERE id = $3
  `, [updatedProcessedData, updatedImportMeta, reportId]);
  
  console.log(`✅ Отчёт ${reportId} успешно обновлён`);
}

async function main() {
  const args = process.argv.slice(2);
  const reportId = args[0] || process.env.REPORT_ID;
  const dryRun = args.includes('--dry') || process.env.DRY_RUN === 'true';
  
  if (!reportId) {
    console.error('❌ Укажите ID отчёта:');
    console.error('   tsx scripts/gps/backfill-sanitize-report.ts <REPORT_ID> [--dry]');
    console.error('   или установите переменную окружения REPORT_ID');
    process.exit(1);
  }
  
  try {
    await client.connect();
    console.log(`🚀 Подключение к БД установлено`);
    
    await sanitizeReport(reportId, dryRun);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log(`🔌 Соединение с БД закрыто`);
  }
}

// Запускаем main
main();
