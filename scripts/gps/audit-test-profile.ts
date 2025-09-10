#!/usr/bin/env tsx
// scripts/gps/audit-test-profile.ts

import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

interface GpsProfile {
  id: string;
  name: string;
  gpsSystem: string;
  columnMapping?: any[];
  createdAt: string;
}

interface GpsReport {
  id: string;
  fileName: string;
  gpsSystem: string;
  profileId: string;
  createdAt: string;
  processedData?: {
    canonical?: {
      columns?: any[];
      rows?: any[];
    };
  };
  importMeta?: {
    warnings?: any[];
    suggestions?: any;
  };
  rawData?: any[][];
}

async function auditTestProfile() {
  console.log('🔍 Аудит профиля "Test" и последнего GPS отчёта...\n');
  
  const lines: string[] = [];
  lines.push('# GPS Check: Test Profile & Last Report');
  lines.push('');
  lines.push(`**Дата:** ${new Date().toISOString()}`);
  lines.push('');

  try {
    await client.connect();
    console.log('✅ Подключение к БД установлено');

    // 1) Найти профиль "Test"
    console.log('🔍 Ищем профиль "Test"...');
    const profileResult = await client.query(`
      SELECT id, name, "gpsSystem", "columnMapping", "createdAt"
      FROM public."GpsProfile"
      WHERE name = 'Test'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (profileResult.rows.length === 0) {
      lines.push('## ❌ Профиль "Test" не найден');
      console.log('❌ Профиль "Test" не найден');
      return;
    }

    const profile: GpsProfile = profileResult.rows[0];
    console.log(`✅ Найден профиль: ${profile.name} (${profile.id})`);

    lines.push('## 1. Профиль "Test"');
    lines.push(`- **ID:** ${profile.id}`);
    lines.push(`- **Name:** ${profile.name}`);
    lines.push(`- **GPS System:** ${profile.gpsSystem}`);
    lines.push(`- **Created:** ${profile.createdAt}`);
    lines.push('');

    // Column mapping
    if (profile.columnMapping && profile.columnMapping.length > 0) {
      lines.push('### Column Mapping:');
      lines.push('```json');
      lines.push(JSON.stringify(profile.columnMapping, null, 2));
      lines.push('```');
      lines.push('');
    }

    // 2) Найти последний GpsReport
    console.log('🔍 Ищем последний GPS отчёт...');
    const reportResult = await client.query(`
      SELECT id, "fileName", "gpsSystem", "profileId", "createdAt", 
             "processedData", "importMeta", "rawData"
      FROM public."GpsReport"
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (reportResult.rows.length === 0) {
      lines.push('## ❌ GPS отчёты не найдены');
      console.log('❌ GPS отчёты не найдены');
      return;
    }

    const report: GpsReport = reportResult.rows[0];
    console.log(`✅ Найден отчёт: ${report.fileName} (${report.id})`);

    lines.push('## 2. Последний GPS отчёт');
    lines.push(`- **ID:** ${report.id}`);
    lines.push(`- **File:** ${report.fileName}`);
    lines.push(`- **GPS System:** ${report.gpsSystem}`);
    lines.push(`- **Profile ID:** ${report.profileId}`);
    lines.push(`- **Created:** ${report.createdAt}`);
    lines.push('');

    // Processed data
    if (report.processedData?.canonical) {
      const canonical = report.processedData.canonical;
      lines.push('### Processed Data (Canonical):');
      lines.push(`- **Columns:** ${canonical.columns?.length || 0}`);
      lines.push(`- **Rows:** ${canonical.rows?.length || 0}`);
      lines.push('');

      if (canonical.columns && canonical.columns.length > 0) {
        lines.push('#### Canonical Columns:');
        lines.push('| sourceHeader | displayName | canonicalKey | isVisible | order | displayUnit |');
        lines.push('|--------------|-------------|--------------|-----------|-------|-------------|');
        canonical.columns.forEach((col: any) => {
          lines.push(`| ${col.sourceHeader || ''} | ${col.displayName || ''} | ${col.canonicalKey || ''} | ${col.isVisible || false} | ${col.order || 0} | ${col.displayUnit || ''} |`);
        });
        lines.push('');
      }
    }

    // Import meta warnings
    if (report.importMeta?.warnings && report.importMeta.warnings.length > 0) {
      lines.push('### Import Meta Warnings:');
      report.importMeta.warnings.forEach((warning: any, index: number) => {
        lines.push(`${index + 1}. ${typeof warning === 'string' ? warning : JSON.stringify(warning)}`);
      });
      lines.push('');
    }

    // 3) Первые 10 заголовков raw данных
    if (report.rawData && report.rawData.length > 0) {
      const headers = report.rawData[0] || [];
      lines.push('### Raw Data Headers (первые 10):');
      lines.push('```');
      lines.push(headers.slice(0, 10).join(', '));
      lines.push('```');
      lines.push('');
    }

    // 4) Первые 5 строк canonical данных
    if (report.processedData?.canonical?.rows && report.processedData.canonical.rows.length > 0) {
      lines.push('### Первые 5 строк Canonical данных:');
      lines.push('```json');
      lines.push(JSON.stringify(report.processedData.canonical.rows.slice(0, 5), null, 2));
      lines.push('```');
      lines.push('');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
    lines.push('## ❌ Ошибка при выполнении аудита');
    lines.push(`\`\`\`\n${error}\n\`\`\``);
  } finally {
    await client.end();
    console.log('🔌 Соединение с БД закрыто');
  }

  // Сохраняем отчёт
  const reportPath = path.resolve('artifacts/gps_check_Test_profile_and_last_report.md');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`\n📄 Отчёт сохранён: ${reportPath}`);
}

// Запускаем аудит
auditTestProfile();
