#!/usr/bin/env tsx
// scripts/gps/simple-audit-test.ts

import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function simpleAuditTest() {
  console.log('🔍 Простой аудит профиля "Test"...\n');
  
  const lines: string[] = [];
  lines.push('# GPS Profile "Test" - Simple Audit');
  lines.push('');
  lines.push(`**Дата:** ${new Date().toISOString()}`);
  lines.push('');

  try {
    await client.connect();
    console.log('✅ Подключение к БД установлено');

    // 1) Найти профиль "Test"
    const profileResult = await client.query(`
      SELECT id, name, "gpsSystem", "createdAt", "columnMapping"
      FROM public."GpsProfile"
      WHERE name = 'Test'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (profileResult.rows.length === 0) {
      lines.push('## ❌ Профиль "Test" не найден');
      return;
    }

    const profile = profileResult.rows[0];
    console.log(`✅ Профиль: ${profile.name} (${profile.id})`);

    lines.push('## 1. Профиль "Test"');
    lines.push(`- **ID:** ${profile.id}`);
    lines.push(`- **Name:** ${profile.name}`);
    lines.push(`- **GPS System:** ${profile.gpsSystem}`);
    lines.push(`- **Created:** ${profile.createdAt}`);
    lines.push('');

    // 2) Найти последний отчёт
    const reportResult = await client.query(`
      SELECT id, "fileName", "createdAt", "processedData", "rawData"
      FROM public."GpsReport"
      WHERE "profileId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 1
    `, [profile.id]);

    if (reportResult.rows.length === 0) {
      lines.push('## ❌ Отчёты не найдены');
      return;
    }

    const report = reportResult.rows[0];
    console.log(`✅ Отчёт: ${report.fileName}`);

    lines.push('## 2. Последний отчёт');
    lines.push(`- **ID:** ${report.id}`);
    lines.push(`- **File:** ${report.fileName}`);
    lines.push(`- **Created:** ${report.createdAt}`);
    lines.push('');

    // Анализируем структуру данных
    console.log('📊 Анализируем структуру данных...');
    
    // Raw данные
    if (report.rawData && Array.isArray(report.rawData) && report.rawData.length > 0) {
      lines.push('### Raw Data (первые 20 строк):');
      lines.push('```');
      report.rawData.slice(0, 20).forEach((row: any[], index: number) => {
        lines.push(`${index + 1}: ${row.join(', ')}`);
      });
      lines.push('```');
      lines.push('');

      // Заголовки из первой строки
      const headers = report.rawData[0] || [];
      lines.push('### Headers:');
      lines.push('```');
      lines.push(headers.join(', '));
      lines.push('```');
      lines.push('');
    } else {
      lines.push('### Raw Data: отсутствует');
      lines.push('');
    }

    // ProcessedData
    if (report.processedData) {
      lines.push('### ProcessedData структура:');
      lines.push('```json');
      lines.push(JSON.stringify({
        keys: Object.keys(report.processedData),
        canonical: report.processedData.canonical ? {
          hasRows: !!report.processedData.canonical.rows,
          rowsLength: report.processedData.canonical.rows?.length || 0,
          hasColumns: !!report.processedData.canonical.columns,
          columnsLength: report.processedData.canonical.columns?.length || 0
        } : null
      }, null, 2));
      lines.push('```');
      lines.push('');
    }

    // Canonical данные
    if (report.processedData?.canonical?.rows && Array.isArray(report.processedData.canonical.rows)) {
      const canonicalRows = report.processedData.canonical.rows;
      lines.push('### Canonical Rows (первые 5):');
      lines.push('```json');
      lines.push(JSON.stringify(canonicalRows.slice(0, 5), null, 2));
      lines.push('```');
      lines.push('');

      // Анализ athlete_name
      const athleteNames = canonicalRows.map((row: any) => row.athlete_name).filter(Boolean);
      lines.push('### Athlete Names (первые 10):');
      lines.push('```');
      athleteNames.slice(0, 10).forEach((name: any, index: number) => {
        lines.push(`${index + 1}: ${name}`);
      });
      lines.push('```');
      lines.push('');

      // Анализ HSR
      const hsrValues = canonicalRows.map((row: any) => row.hsr_ratio).filter(val => val !== null && val !== undefined);
      if (hsrValues.length > 0) {
        const min = Math.min(...hsrValues);
        const max = Math.max(...hsrValues);
        const mean = hsrValues.reduce((sum, val) => sum + val, 0) / hsrValues.length;
        
        lines.push('### HSR Analysis:');
        lines.push(`- **Min:** ${min}`);
        lines.push(`- **Max:** ${max}`);
        lines.push(`- **Mean:** ${mean.toFixed(2)}`);
        lines.push(`- **Анализ:** ${mean > 1 ? '❌ Похоже на проценты (>1)' : '✅ Похоже на ratio (0-1)'}`);
        lines.push('');
      }

      // Анализ Max Speed
      const speedValues = canonicalRows.map((row: any) => row.max_speed_kmh).filter(val => val !== null && val !== undefined);
      if (speedValues.length > 0) {
        const min = Math.min(...speedValues);
        const max = Math.max(...speedValues);
        const mean = speedValues.reduce((sum, val) => sum + val, 0) / speedValues.length;
        
        lines.push('### Max Speed Analysis:');
        lines.push(`- **Min:** ${min}`);
        lines.push(`- **Max:** ${max}`);
        lines.push(`- **Mean:** ${mean.toFixed(2)}`);
        
        let unitGuess = '';
        if (mean > 50) {
          unitGuess = '❌ Вероятно m/s (слишком высокие значения)';
        } else if (mean >= 15 && mean <= 45) {
          unitGuess = '✅ Похоже на km/h (нормальные значения)';
        } else {
          unitGuess = '❓ Неопределённые единицы';
        }
        
        lines.push(`- **Анализ единиц:** ${unitGuess}`);
        lines.push('');
      }
    }

    // Column mapping из профиля
    if (profile.columnMapping && Array.isArray(profile.columnMapping)) {
      lines.push('### Column Mapping (из профиля):');
      lines.push('```json');
      lines.push(JSON.stringify(profile.columnMapping, null, 2));
      lines.push('```');
      lines.push('');
    }

    // 4) Поиск лучшего кандидата на ФИО в raw данных
    if (report.rawData && Array.isArray(report.rawData) && report.rawData.length > 0) {
      console.log('🔍 Ищем лучшего кандидата на колонку с ФИО...');
      
      const positionCodes = new Set([
        'MF', 'W', 'S', 'CB', 'GK', 'ST', 'CM', 'DM', 'AM', 'RM', 'LM', 'RW', 'LW', 'CF', 'SS',
        'ВР', 'ЦЗ', 'ЛЗ', 'ПЗ', 'Н', 'ПФ', 'ЛФ', 'ЦП', 'ОП', 'АП', 'ПП', 'ЛП', 'Ф'
      ]);

      function isNameLike(value: any): boolean {
        if (!value || typeof value !== 'string') return false;
        const trimmed = value.trim();
        if (trimmed.length < 8) return false;
        if (positionCodes.has(trimmed.toUpperCase())) return false;
        
        const words = trimmed.split(/\s+/);
        if (words.length < 2) return false;
        
        return words.every(word => /^[A-Za-zА-ЯЁа-яё\-']+$/.test(word));
      }

      let bestCandidate = { header: '', score: 0, values: [] as any[] };
      const headers = report.rawData[0];
      
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const header = headers[colIndex];
        const values = report.rawData.slice(1, 21).map(row => row[colIndex]).filter(Boolean);
        
        if (values.length === 0) continue;
        
        const nameLikeCount = values.filter(isNameLike).length;
        const score = nameLikeCount / values.length;
        
        if (score > bestCandidate.score) {
          bestCandidate = {
            header,
            score,
            values: values.slice(0, 10)
          };
        }
      }

      lines.push('## 4. Лучший кандидат на колонку с ФИО');
      if (bestCandidate.score > 0) {
        lines.push(`- **Header:** ${bestCandidate.header}`);
        lines.push(`- **Score:** ${(bestCandidate.score * 100).toFixed(1)}% (доля имён)`);
        lines.push('');
        lines.push('### Первые 10 значений:');
        lines.push('```');
        bestCandidate.values.forEach((value: any, index: number) => {
          lines.push(`${index + 1}: ${value}`);
        });
        lines.push('```');
        lines.push('');
      } else {
        lines.push('- **Кандидат не найден**');
        lines.push('');
      }
    }

    // 7) Финальная сводка
    lines.push('## 7. Финальная сводка');
    lines.push('');
    
    if (report.rawData && Array.isArray(report.rawData) && report.rawData.length > 0) {
      const headers = report.rawData[0];
      lines.push('### Athlete Name:');
      lines.push(`- **Raw headers:** ${headers.join(', ')}`);
      lines.push(`- **Первая строка данных:** ${report.rawData[1]?.join(', ') || 'нет данных'}`);
      lines.push('');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
    lines.push('## ❌ Ошибка при аудите');
    lines.push(`\`\`\`\n${error}\n\`\`\``);
  } finally {
    await client.end();
    console.log('🔌 Соединение с БД закрыто');
  }

  // Сохраняем отчёт
  const reportPath = path.resolve('artifacts/gps_profile_TEST_readonly_audit.md');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`\n📄 Отчёт сохранён: ${reportPath}`);
}

// Запускаем аудит
simpleAuditTest();
