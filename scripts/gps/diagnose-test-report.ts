#!/usr/bin/env tsx
// scripts/gps/diagnose-test-report.ts

import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function diagnoseTestReport() {
  console.log('🔍 Диагностика несоответствий в отчёте Test...\n');
  
  const lines: string[] = [];
  lines.push('# GPS Диагностика: Test Report Issues');
  lines.push('');
  lines.push(`**Дата:** ${new Date().toISOString()}`);
  lines.push('');

  try {
    await client.connect();
    console.log('✅ Подключение к БД установлено');

    // Получаем последний отчёт
    const reportResult = await client.query(`
      SELECT id, "fileName", "processedData", "rawData"
      FROM public."GpsReport"
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (reportResult.rows.length === 0) {
      lines.push('## ❌ GPS отчёты не найдены');
      return;
    }

    const report = reportResult.rows[0];
    console.log(`📊 Анализируем отчёт: ${report.fileName}`);

    lines.push('## 1. Анализ отчёта');
    lines.push(`- **ID:** ${report.id}`);
    lines.push(`- **File:** ${report.fileName}`);
    lines.push('');

    // Анализ raw данных
    if (report.rawData && report.rawData.length > 0) {
      const headers = report.rawData[0] || [];
      lines.push('### Raw Headers:');
      lines.push('```');
      lines.push(headers.join(', '));
      lines.push('```');
      lines.push('');

      // Анализируем первые 10 строк для понимания структуры
      lines.push('### Первые 10 строк Raw данных:');
      lines.push('```');
      report.rawData.slice(0, 10).forEach((row: any[], index: number) => {
        lines.push(`${index + 1}: ${row.join(', ')}`);
      });
      lines.push('```');
      lines.push('');
    }

    // Анализ canonical данных
    if (report.processedData?.canonical?.rows) {
      const rows = report.processedData.canonical.rows;
      lines.push('## 2. Анализ Canonical данных');
      lines.push(`- **Всего строк:** ${rows.length}`);
      lines.push('');

      // 1. Проблема с athlete_name - позиции вместо имён
      const athleteNames = rows.map((row: any) => row.athlete_name).filter(Boolean);
      const positionCodes = ['MF', 'W', 'S', 'CB', 'GK', 'ST', 'CM', 'DM', 'AM', 'RM', 'LM', 'RW', 'LW', 'CF', 'SS'];
      const positionCount = athleteNames.filter(name => positionCodes.includes(name)).length;
      const nameCount = athleteNames.filter(name => !positionCodes.includes(name) && name.length > 3).length;

      lines.push('### ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Позиции вместо имён');
      lines.push(`- **Позиции (MF, W, S, etc.):** ${positionCount} из ${athleteNames.length}`);
      lines.push(`- **Имена:** ${nameCount} из ${athleteNames.length}`);
      lines.push(`- **Процент позиций:** ${Math.round((positionCount / athleteNames.length) * 100)}%`);
      lines.push('');

      // 2. Анализ displayUnit
      lines.push('### Анализ Display Units:');
      const speedKeys = Object.keys(rows[0] || {}).filter(key => key.includes('speed'));
      const ratioKeys = Object.keys(rows[0] || {}).filter(key => key.includes('ratio'));
      
      lines.push(`- **Speed keys:** ${speedKeys.join(', ')}`);
      lines.push(`- **Ratio keys:** ${ratioKeys.join(', ')}`);
      lines.push('');

      // 3. Проблемные строки
      const problematicRows = rows.filter((row: any) => {
        const name = row.athlete_name;
        return !name || 
               name === '' || 
               name === 'n/a' || 
               name === '-' || 
               positionCodes.includes(name) ||
               name.toLowerCase().includes('итог') ||
               name.toLowerCase().includes('total') ||
               name.toLowerCase().includes('summary');
      });

      lines.push('### Проблемные строки:');
      lines.push(`- **Всего проблемных:** ${problematicRows.length} из ${rows.length}`);
      lines.push('');

      if (problematicRows.length > 0) {
        lines.push('#### Примеры проблемных строк:');
        lines.push('```json');
        lines.push(JSON.stringify(problematicRows.slice(0, 10), null, 2));
        lines.push('```');
        lines.push('');
      }

      // 4. Анализ значений HSR и Max Speed
      lines.push('### Анализ значений:');
      const firstRow = rows[0];
      if (firstRow) {
        lines.push('#### Первая строка:');
        lines.push(`- **athlete_name:** ${firstRow.athlete_name}`);
        lines.push(`- **hsr_ratio:** ${firstRow.hsr_ratio} (${firstRow.hsr_ratio > 1 ? '❌ Похоже на проценты, а не ratio' : '✅ Выглядит как ratio'})`);
        lines.push(`- **max_speed_kmh:** ${firstRow.max_speed_kmh} (${firstRow.max_speed_kmh > 50 ? '❌ Слишком высокая скорость' : '✅ Нормальная скорость'})`);
        lines.push(`- **minutes_played:** ${firstRow.minutes_played}`);
        lines.push(`- **total_distance_m:** ${firstRow.total_distance_m}`);
        lines.push('');
      }

      // 5. Рекомендации
      lines.push('## 3. Рекомендации');
      lines.push('');
      
      if (positionCount > nameCount) {
        lines.push('### 🔧 Исправление маппинга athlete_name:');
        lines.push('- **Проблема:** В колонку имён попали позиции игроков');
        lines.push('- **Решение:** Изменить sourceHeader для athlete_name с "Игрок" на первую колонку с именами');
        lines.push('- **Предлагаемый sourceHeader:** Первая колонка raw данных (содержит полные имена)');
        lines.push('');
      }

      if (firstRow?.hsr_ratio > 1) {
        lines.push('### 🔧 Исправление HSR значений:');
        lines.push('- **Проблема:** hsr_ratio содержит проценты (80, 73, 76), а не ratio (0.8, 0.73, 0.76)');
        lines.push('- **Решение:** Добавить transform для конвертации % → ratio (деление на 100)');
        lines.push('');
      }

      if (firstRow?.max_speed_kmh > 50) {
        lines.push('### 🔧 Исправление Max Speed значений:');
        lines.push('- **Проблема:** max_speed_kmh содержит слишком высокие значения');
        lines.push('- **Решение:** Проверить единицы измерения в исходных данных');
        lines.push('');
      }

      lines.push('### 🧹 Санитизация данных:');
      lines.push(`- **Удалить:** ${problematicRows.length} проблемных строк`);
      lines.push('- **Оставить:** только строки с валидными именами игроков');
      lines.push('- **Результат:** ~' + (rows.length - problematicRows.length) + ' чистых строк');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
    lines.push('## ❌ Ошибка при диагностике');
    lines.push(`\`\`\`\n${error}\n\`\`\``);
  } finally {
    await client.end();
    console.log('🔌 Соединение с БД закрыто');
  }

  // Сохраняем отчёт
  const reportPath = path.resolve('artifacts/gps_diagnose_test_report.md');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`\n📄 Отчёт диагностики сохранён: ${reportPath}`);
}

// Запускаем диагностику
diagnoseTestReport();
