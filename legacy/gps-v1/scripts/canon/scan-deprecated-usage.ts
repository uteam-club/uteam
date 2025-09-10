#!/usr/bin/env tsx
// scripts/canon/scan-deprecated-usage.ts

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { Client } from 'pg';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function scanDeprecatedUsage() {
  console.log('🔍 Сканирование использования deprecated метрик...\n');

  try {
    // Загружаем реестр
    const registryPath = path.resolve('src/canon/metrics.registry.json');
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(registryContent);

    // Находим deprecated метрики
    const deprecatedMetrics = registry.metrics
      .filter((m: any) => m.deprecated === true)
      .map((m: any) => m.key);

    console.log(`📊 Найдено deprecated метрик: ${deprecatedMetrics.length}`);
    console.log('Deprecated метрики:', deprecatedMetrics.join(', '));

    // 1. Сканируем код
    console.log('\n🔍 Сканирование кода...');
    const codeResults = await scanCodeForDeprecated(deprecatedMetrics);
    
    // 2. Сканируем БД
    console.log('\n🔍 Сканирование БД...');
    const dbResults = await scanDbForDeprecated(deprecatedMetrics);

    // Сохраняем отчёты
    await saveReports(codeResults, dbResults, deprecatedMetrics);

    console.log('\n✅ Сканирование завершено');
    console.log(`📄 Отчёты сохранены в artifacts/canon-usage/`);

  } catch (error) {
    console.error('❌ Ошибка при сканировании:', error);
  } finally {
    await client.end();
  }
}

async function scanCodeForDeprecated(deprecatedMetrics: string[]) {
  const results: Array<{ file: string; line: number; content: string; metric: string }> = [];
  
  // Получаем все .ts и .tsx файлы в src
  const srcFiles = await getAllTsFiles('src');
  
  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        deprecatedMetrics.forEach(metric => {
          // Ищем упоминания метрики в коде
          if (line.includes(metric) && !line.includes('//') && !line.includes('*')) {
            results.push({
              file: file.replace(process.cwd() + '/', ''),
              line: index + 1,
              content: line.trim(),
              metric
            });
          }
        });
      });
    } catch (error) {
      console.warn(`⚠️  Не удалось прочитать файл ${file}:`, error);
    }
  }
  
  return results;
}

async function getAllTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Пропускаем node_modules, .next, dist
        if (!['node_modules', '.next', 'dist', 'coverage'].includes(entry.name)) {
          const subFiles = await getAllTsFiles(fullPath);
          files.push(...subFiles);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Не удалось прочитать директорию ${dir}:`, error);
  }
  
  return files;
}

async function scanDbForDeprecated(deprecatedMetrics: string[]) {
  const results: any = {
    profiles: [],
    reports: []
  };

  try {
    await client.connect();
    console.log('✅ Подключение к БД установлено');

    // Сканируем профили
    const profilesResult = await client.query(`
      SELECT id, name, "columnMapping"
      FROM public."GpsProfile"
      WHERE "columnMapping" IS NOT NULL
    `);

    for (const profile of profilesResult.rows) {
      const columnMapping = profile.columnMapping || [];
      const deprecatedInProfile = [];
      
      for (const column of columnMapping) {
        if (column.canonicalKey && deprecatedMetrics.includes(column.canonicalKey)) {
          deprecatedInProfile.push({
            canonicalKey: column.canonicalKey,
            mappedColumn: column.mappedColumn,
            name: column.name
          });
        }
      }
      
      if (deprecatedInProfile.length > 0) {
        results.profiles.push({
          id: profile.id,
          name: profile.name,
          deprecatedColumns: deprecatedInProfile
        });
      }
    }

    // Сканируем последние 10 отчётов
    const reportsResult = await client.query(`
      SELECT id, "fileName", "processedData"
      FROM public."GpsReport"
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    for (const report of reportsResult.rows) {
      const profileSnapshot = report.processedData?.profileSnapshot;
      const columns = profileSnapshot?.columns || [];
      const deprecatedInReport = [];
      
      for (const column of columns) {
        if (column.canonicalKey && deprecatedMetrics.includes(column.canonicalKey)) {
          deprecatedInReport.push({
            canonicalKey: column.canonicalKey,
            sourceHeader: column.sourceHeader,
            displayName: column.displayName
          });
        }
      }
      
      if (deprecatedInReport.length > 0) {
        results.reports.push({
          id: report.id,
          fileName: report.fileName,
          deprecatedColumns: deprecatedInReport
        });
      }
    }

  } catch (error) {
    console.error('❌ Ошибка при сканировании БД:', error);
  }

  return results;
}

async function saveReports(codeResults: any[], dbResults: any, deprecatedMetrics: string[]) {
  // Сохраняем отчёт по коду
  const codeReport = [
    '# Deprecated Metrics Usage in Code',
    '',
    `**Дата:** ${new Date().toISOString()}`,
    `**Deprecated метрик:** ${deprecatedMetrics.length}`,
    `**Найдено упоминаний в коде:** ${codeResults.length}`,
    '',
    '## Deprecated метрики:',
    deprecatedMetrics.map(m => `- ${m}`).join('\n'),
    '',
    '## Упоминания в коде:',
    ''
  ];

  if (codeResults.length === 0) {
    codeReport.push('✅ Deprecated метрики не найдены в коде');
  } else {
    codeReport.push('| Файл | Строка | Содержимое | Метрика |');
    codeReport.push('|------|--------|------------|---------|');
    
    codeResults.forEach(result => {
      codeReport.push(`| ${result.file} | ${result.line} | \`${result.content}\` | ${result.metric} |`);
    });
  }

  const codeReportPath = path.resolve('artifacts/canon-usage/DEPRECATED_CODE.txt');
  fs.writeFileSync(codeReportPath, codeReport.join('\n'), 'utf8');

  // Сохраняем отчёт по БД
  const dbReportPath = path.resolve('artifacts/canon-usage/DEPRECATED_DB.json');
  fs.writeFileSync(dbReportPath, JSON.stringify(dbResults, null, 2), 'utf8');

  console.log(`📄 Код: ${codeResults.length} упоминаний`);
  console.log(`📄 Профили: ${dbResults.profiles.length} с deprecated метриками`);
  console.log(`📄 Отчёты: ${dbResults.reports.length} с deprecated метриками`);
}

// Запускаем сканирование
scanDeprecatedUsage();
