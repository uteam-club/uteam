#!/usr/bin/env tsx
// scripts/gps/readonly-audit-test.ts

import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

interface ProfileSnapshotColumn {
  sourceHeader: string;
  canonicalKey: string;
  displayName: string;
  isVisible?: boolean;
  order?: number;
  displayUnit?: string;
}

async function readonlyAuditTest() {
  console.log('🔍 Read-only аудит профиля "Test" и последнего отчёта...\n');
  
  const lines: string[] = [];
  lines.push('# GPS Profile "Test" - Read-only Audit');
  lines.push('');
  lines.push(`**Дата:** ${new Date().toISOString()}`);
  lines.push('');

  try {
    await client.connect();
    console.log('✅ Подключение к БД установлено');

    // 1) Найти профиль "Test"
    console.log('🔍 Ищем профиль "Test"...');
    const profileResult = await client.query(`
      SELECT id, name, "gpsSystem", "createdAt"
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

    const profile = profileResult.rows[0];
    console.log(`✅ Найден профиль: ${profile.name} (${profile.id})`);

    lines.push('## 1. Профиль "Test"');
    lines.push(`- **ID:** ${profile.id}`);
    lines.push(`- **Name:** ${profile.name}`);
    lines.push(`- **GPS System:** ${profile.gpsSystem}`);
    lines.push(`- **Created:** ${profile.createdAt}`);
    lines.push('');

    // 2) Найти последний GpsReport с этим profileId
    console.log('🔍 Ищем последний отчёт для профиля...');
    const reportResult = await client.query(`
      SELECT id, "fileName", "createdAt", "processedData"
      FROM public."GpsReport"
      WHERE "profileId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 1
    `, [profile.id]);

    if (reportResult.rows.length === 0) {
      lines.push('## ❌ Отчёты для профиля "Test" не найдены');
      console.log('❌ Отчёты для профиля "Test" не найдены');
      return;
    }

    const report = reportResult.rows[0];
    console.log(`✅ Найден отчёт: ${report.fileName} (${report.id})`);

    lines.push('## 2. Последний отчёт');
    lines.push(`- **ID:** ${report.id}`);
    lines.push(`- **File:** ${report.fileName}`);
    lines.push(`- **Created:** ${report.createdAt}`);
    lines.push('');

    // Извлекаем данные
    const processedData = report.processedData;
    const rawData = processedData?.rawData || [];
    const headers = processedData?.headers || [];
    const profileSnapshot = processedData?.profileSnapshot || {};
    const profileSnapshotColumns = profileSnapshot?.columns || [];

    lines.push('### Raw Data (первые 20 строк):');
    lines.push('```');
    rawData.slice(0, 20).forEach((row: any[], index: number) => {
      lines.push(`${index + 1}: ${row.join(', ')}`);
    });
    lines.push('```');
    lines.push('');

    if (headers.length > 0) {
      lines.push('### Headers:');
      lines.push('```');
      lines.push(headers.join(', '));
      lines.push('```');
      lines.push('');
    }

    lines.push('### Profile Snapshot Columns:');
    lines.push('| sourceHeader | canonicalKey | displayName | isVisible | order | displayUnit |');
    lines.push('|--------------|--------------|-------------|-----------|-------|-------------|');
    profileSnapshotColumns.forEach((col: ProfileSnapshotColumn) => {
      lines.push(`| ${col.sourceHeader || ''} | ${col.canonicalKey || ''} | ${col.displayName || ''} | ${col.isVisible || false} | ${col.order || 0} | ${col.displayUnit || ''} |`);
    });
    lines.push('');

    // 3) Определить, из какой колонки берётся athlete_name
    console.log('🔍 Анализируем маппинг athlete_name...');
    const athleteNameColumn = profileSnapshotColumns.find(col => col.canonicalKey === 'athlete_name');
    
    if (athleteNameColumn) {
      lines.push('## 3. Athlete Name Mapping');
      lines.push(`- **Current sourceHeader:** ${athleteNameColumn.sourceHeader}`);
      lines.push(`- **Canonical Key:** ${athleteNameColumn.canonicalKey}`);
      lines.push('');

      // Найти индекс колонки в raw данных
      const sourceHeaderIndex = headers.indexOf(athleteNameColumn.sourceHeader);
      if (sourceHeaderIndex >= 0) {
        const athleteNameValues = rawData.slice(0, 20).map(row => row[sourceHeaderIndex]).filter(Boolean);
        lines.push('### Первые 10 значений athlete_name:');
        lines.push('```');
        athleteNameValues.slice(0, 10).forEach((value: any, index: number) => {
          lines.push(`${index + 1}: ${value}`);
        });
        lines.push('```');
        lines.push('');
      }
    }

    // 4) Найти лучшего кандидата на колонку с ФИО
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
      
      // Проверяем, что это >= 2 слова и содержит только буквы, пробелы, дефисы
      const words = trimmed.split(/\s+/);
      if (words.length < 2) return false;
      
      return words.every(word => /^[A-Za-zА-ЯЁа-яё\-']+$/.test(word));
    }

    let bestCandidate = { header: '', score: 0, values: [] as any[] };
    
    // Анализируем каждую колонку
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const header = headers[colIndex];
      const values = rawData.slice(0, 20).map(row => row[colIndex]).filter(Boolean);
      
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
      lines.push('- **Кандидат не найден** (нет колонок с достаточным количеством имён)');
      lines.push('');
    }

    // 5) HSR анализ
    console.log('🔍 Анализируем HSR...');
    const hsrColumn = profileSnapshotColumns.find(col => col.canonicalKey === 'hsr_ratio');
    
    if (hsrColumn) {
      lines.push('## 5. HSR Analysis');
      lines.push(`- **Source Header:** ${hsrColumn.sourceHeader}`);
      lines.push(`- **Canonical Key:** ${hsrColumn.canonicalKey}`);
      lines.push('');

      const hsrHeaderIndex = headers.indexOf(hsrColumn.sourceHeader);
      if (hsrHeaderIndex >= 0) {
        const hsrValues = rawData.slice(0, 20)
          .map(row => parseFloat(row[hsrHeaderIndex]))
          .filter(val => !isNaN(val));
        
        if (hsrValues.length > 0) {
          const min = Math.min(...hsrValues);
          const max = Math.max(...hsrValues);
          const mean = hsrValues.reduce((sum, val) => sum + val, 0) / hsrValues.length;
          
          lines.push('### Статистика HSR (первые 20 значений):');
          lines.push(`- **Min:** ${min}`);
          lines.push(`- **Max:** ${max}`);
          lines.push(`- **Mean:** ${mean.toFixed(2)}`);
          lines.push('');
          
          const looksLikePercent = mean > 1;
          lines.push(`### Анализ: ${looksLikePercent ? '❌ Похоже на проценты (>1)' : '✅ Похоже на ratio (0-1)'}`);
          lines.push('');
        }
      }
    }

    // 6) Max Speed анализ
    console.log('🔍 Анализируем Max Speed...');
    const speedColumn = profileSnapshotColumns.find(col => 
      col.canonicalKey === 'max_speed_ms' || col.canonicalKey === 'max_speed_kmh'
    );
    
    if (speedColumn) {
      lines.push('## 6. Max Speed Analysis');
      lines.push(`- **Source Header:** ${speedColumn.sourceHeader}`);
      lines.push(`- **Canonical Key:** ${speedColumn.canonicalKey}`);
      lines.push('');

      const speedHeaderIndex = headers.indexOf(speedColumn.sourceHeader);
      if (speedHeaderIndex >= 0) {
        const speedValues = rawData.slice(0, 20)
          .map(row => parseFloat(row[speedHeaderIndex]))
          .filter(val => !isNaN(val));
        
        if (speedValues.length > 0) {
          const min = Math.min(...speedValues);
          const max = Math.max(...speedValues);
          const mean = speedValues.reduce((sum, val) => sum + val, 0) / speedValues.length;
          
          lines.push('### Статистика Max Speed (первые 20 значений):');
          lines.push(`- **Min:** ${min}`);
          lines.push(`- **Max:** ${max}`);
          lines.push(`- **Mean:** ${mean.toFixed(2)}`);
          lines.push('');
          
          let unitGuess = '';
          if (mean > 50) {
            unitGuess = '❌ Вероятно m/s (слишком высокие значения)';
          } else if (mean >= 15 && mean <= 45) {
            unitGuess = '✅ Похоже на km/h (нормальные значения)';
          } else {
            unitGuess = '❓ Неопределённые единицы';
          }
          
          lines.push(`### Анализ единиц: ${unitGuess}`);
          lines.push('');
        }
      }
    }

    // 7) Сводка
    lines.push('## 7. Сводка');
    lines.push('');
    
    if (athleteNameColumn) {
      const sourceHeaderIndex = headers.indexOf(athleteNameColumn.sourceHeader);
      const athleteNameValues = sourceHeaderIndex >= 0 ? 
        rawData.slice(0, 10).map(row => row[sourceHeaderIndex]).filter(Boolean) : [];
      
      lines.push('### Athlete Name:');
      lines.push(`- **Current sourceHeader:** ${athleteNameColumn.sourceHeader}`);
      lines.push(`- **Первые 10 значений:** ${athleteNameValues.join(', ')}`);
      lines.push('');
    }
    
    if (bestCandidate.score > 0) {
      lines.push('### Best Name Candidate:');
      lines.push(`- **Header:** ${bestCandidate.header}`);
      lines.push(`- **Первые 10 значений:** ${bestCandidate.values.join(', ')}`);
      lines.push('');
    }
    
    if (hsrColumn) {
      const hsrHeaderIndex = headers.indexOf(hsrColumn.sourceHeader);
      const hsrValues = hsrHeaderIndex >= 0 ? 
        rawData.slice(0, 20).map(row => parseFloat(row[hsrHeaderIndex])).filter(val => !isNaN(val)) : [];
      
      if (hsrValues.length > 0) {
        const mean = hsrValues.reduce((sum, val) => sum + val, 0) / hsrValues.length;
        lines.push('### HSR:');
        lines.push(`- **Header:** ${hsrColumn.sourceHeader}`);
        lines.push(`- **Min/Max/Mean:** ${Math.min(...hsrValues)}/${Math.max(...hsrValues)}/${mean.toFixed(2)}`);
        lines.push(`- **Анализ:** ${mean > 1 ? 'Похоже на %' : 'Похоже на ratio'}`);
        lines.push('');
      }
    }
    
    if (speedColumn) {
      const speedHeaderIndex = headers.indexOf(speedColumn.sourceHeader);
      const speedValues = speedHeaderIndex >= 0 ? 
        rawData.slice(0, 20).map(row => parseFloat(row[speedHeaderIndex])).filter(val => !isNaN(val)) : [];
      
      if (speedValues.length > 0) {
        const mean = speedValues.reduce((sum, val) => sum + val, 0) / speedValues.length;
        lines.push('### Max Speed:');
        lines.push(`- **Header:** ${speedColumn.sourceHeader}`);
        lines.push(`- **Min/Max/Mean:** ${Math.min(...speedValues)}/${Math.max(...speedValues)}/${mean.toFixed(2)}`);
        lines.push(`- **Анализ:** ${mean > 50 ? 'Похоже на m/s (слишком высокие)' : mean >= 15 && mean <= 45 ? 'Похоже на km/h' : 'Неопределённые единицы'}`);
        lines.push('');
      }
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
readonlyAuditTest();
