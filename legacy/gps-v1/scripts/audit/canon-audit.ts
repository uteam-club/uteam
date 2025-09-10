#!/usr/bin/env tsx
// scripts/audit/canon-audit.ts

import fs from 'fs';
import path from 'path';

// Типы
type CanonRow = { 
  key: string; 
  nameRu: string; 
  dimension: string; 
  unit: string; 
};

type AuditResult = {
  ok: CanonRow[];
  mismatch: Array<{
    key: string;
    expected: CanonRow;
    actual: CanonRow;
    differences: string[];
  }>;
  missing: CanonRow[];
  extra: CanonRow[];
  duplicates: Array<{
    key: string;
    count: number;
    entries: CanonRow[];
  }>;
};

// Эталонный реестр
const EXPECTED: CanonRow[] = [
  { key: "accelerations_count", nameRu: "Кол-во ускорений", dimension: "count", unit: "count" },
  { key: "accelerations_high_count", nameRu: "Кол-во ускорений (высокие)", dimension: "count", unit: "count" },
  { key: "accumulated_load_au", nameRu: "Накопленная нагрузка (AU)", dimension: "au", unit: "au" },
  { key: "aee_kcal", nameRu: "Активная энергозатрата (ккал)", dimension: "energy", unit: "kcal" },
  { key: "athlete_name", nameRu: "Имя игрока", dimension: "text", unit: "text" },
  { key: "average_speed_ms", nameRu: "Средняя скорость (м/с)", dimension: "speed", unit: "m/s" },
  { key: "body_mass_kg", nameRu: "Масса тела (кг)", dimension: "mass", unit: "kg" },
  { key: "decelerations_count", nameRu: "Кол-во торможений", dimension: "count", unit: "count" },
  { key: "decelerations_high_count", nameRu: "Кол-во торможений (высокие)", dimension: "count", unit: "count" },
  { key: "distance_per_min_m", nameRu: "Дистанция за минуту (м/мин)", dimension: "speed", unit: "m/min" },
  { key: "distance_zone_0_m", nameRu: "Дистанция зона 0 (м)", dimension: "distance", unit: "m" },
  { key: "distance_zone_1_m", nameRu: "Дистанция зона 1 (м)", dimension: "distance", unit: "m" },
  { key: "distance_zone_2_m", nameRu: "Дистанция зона 2 (м)", dimension: "distance", unit: "m" },
  { key: "distance_zone_3_m", nameRu: "Дистанция зона 3 (м)", dimension: "distance", unit: "m" },
  { key: "distance_zone_4_m", nameRu: "Дистанция зона 4 (м)", dimension: "distance", unit: "m" },
  { key: "distance_zone_5_m", nameRu: "Дистанция зона 5 (м)", dimension: "distance", unit: "m" },
  { key: "duration_s", nameRu: "Длительность (сек)", dimension: "time", unit: "s" },
  { key: "flying_sprints_count", nameRu: "Кол-во «летящих» спринтов", dimension: "count", unit: "count" },
  { key: "gps_system", nameRu: "GPS система", dimension: "text", unit: "text" },
  { key: "hard_running_distance_m", nameRu: "Дистанция HR (м)", dimension: "distance", unit: "m" },
  { key: "hard_running_distance_ratio", nameRu: "Доля HR от общей", dimension: "ratio", unit: "ratio" },
  { key: "heart_rate_avg_bpm", nameRu: "Пульс средний (уд/мин)", dimension: "bpm", unit: "bpm" },
  { key: "heart_rate_max_bpm", nameRu: "Пульс максимум (уд/мин)", dimension: "bpm", unit: "bpm" },
  { key: "heart_rate_time_in_zone_1_s", nameRu: "Время в пульс-зоне 1 (сек)", dimension: "time", unit: "s" },
  { key: "heart_rate_time_in_zone_2_s", nameRu: "Время в пульс-зоне 2 (сек)", dimension: "time", unit: "s" },
  { key: "heart_rate_time_in_zone_3_s", nameRu: "Время в пульс-зоне 3 (сек)", dimension: "time", unit: "s" },
  { key: "heart_rate_time_in_zone_4_s", nameRu: "Время в пульс-зоне 4 (сек)", dimension: "time", unit: "s" },
  { key: "heart_rate_time_in_zone_5_s", nameRu: "Время в пульс-зоне 5 (сек)", dimension: "time", unit: "s" },
  { key: "hsr_distance_m", nameRu: "Дистанция HSR (м)", dimension: "distance", unit: "m" },
  { key: "hsr_ratio", nameRu: "HSR % от общей", dimension: "ratio", unit: "ratio" },
  { key: "left_foot_contacts_count", nameRu: "Кол-во контактов левой", dimension: "count", unit: "count" },
  { key: "max_speed_kmh", nameRu: "Макс. скорость (км/ч)", dimension: "speed", unit: "km/h" },
  { key: "max_speed_ms", nameRu: "Макс. скорость (м/с)", dimension: "speed", unit: "m/s" },
  { key: "meters_per_acceleration_m", nameRu: "Метров на ускорение (м)", dimension: "distance", unit: "m" },
  { key: "meters_per_deceleration_m", nameRu: "Метров на торможение (м)", dimension: "distance", unit: "m" },
  { key: "minutes_played", nameRu: "Время на поле (мин)", dimension: "time", unit: "min" },
  { key: "neuromuscular_load_au", nameRu: "Нейромышечная нагрузка (AU)", dimension: "au", unit: "au" },
  { key: "number_of_sprints_count", nameRu: "Кол-во спринтов", dimension: "count", unit: "count" },
  { key: "player_external_id", nameRu: "Внешний ID игрока", dimension: "text", unit: "text" },
  { key: "position", nameRu: "Позиция", dimension: "text", unit: "text" },
  { key: "right_foot_contacts_count", nameRu: "Кол-во контактов правой", dimension: "count", unit: "count" },
  { key: "session_rpe_au", nameRu: "sRPE (AU)", dimension: "au", unit: "au" },
  { key: "sprint_distance_m", nameRu: "Спринт-дистанция (м)", dimension: "distance", unit: "m" },
  { key: "sprint_duration_s", nameRu: "Длительность спринтов (сек)", dimension: "time", unit: "s" },
  { key: "sprint_max_speed_ms", nameRu: "Макс. скорость в спринте (м/с)", dimension: "speed", unit: "m/s" },
  { key: "sprint_ratio", nameRu: "Доля спринта от общей", dimension: "ratio", unit: "ratio" },
  { key: "sprint_time_per_run_s", nameRu: "Среднее время спринта (сек)", dimension: "time", unit: "s" },
  { key: "sprint_total_time_s", nameRu: "Суммарное время спринтов (сек)", dimension: "time", unit: "s" },
  { key: "standing_time_s", nameRu: "Время стоя (сек)", dimension: "time", unit: "s" },
  { key: "steps_total_count", nameRu: "Кол-во шагов всего", dimension: "count", unit: "count" },
  { key: "total_distance_m", nameRu: "Общая дистанция (м)", dimension: "distance", unit: "m" },
  { key: "total_load_au", nameRu: "Общая нагрузка (AU)", dimension: "au", unit: "au" },
  { key: "uptime_s", nameRu: "Время работы датчика (сек)", dimension: "time", unit: "s" },
  { key: "very_high_speed_distance_m", nameRu: "Дистанция VHSR (м)", dimension: "distance", unit: "m" },
  { key: "very_high_speed_ratio", nameRu: "VHSR % от общей", dimension: "ratio", unit: "ratio" },
  { key: "walking_time_s", nameRu: "Время ходьбы (сек)", dimension: "time", unit: "s" },
  { key: "work_ratio", nameRu: "Рабочая доля времени", dimension: "ratio", unit: "ratio" },
  { key: "work_time_s", nameRu: "Время работы (сек)", dimension: "time", unit: "s" },
  { key: "x_pos_m", nameRu: "X позиция (м)", dimension: "distance", unit: "m" },
  { key: "y_pos_m", nameRu: "Y позиция (м)", dimension: "distance", unit: "m" }
];

async function auditCanonRegistry() {
  console.log('🔍 Аудит канонического реестра метрик...\n');

  try {
    // Загружаем реестр из проекта
    const registryPath = path.resolve('src/canon/metrics.registry.json');
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(registryContent);

    console.log('📊 Загружен реестр из:', registryPath);
    console.log('📊 Структура реестра:', Object.keys(registry));

    // Нормализуем реестр в массив CanonRow
    const actualMetrics: CanonRow[] = [];
    
    if (registry.metrics && Array.isArray(registry.metrics)) {
      for (const metric of registry.metrics) {
        if (metric.key && metric.labels?.ru && metric.dimension) {
          // Определяем unit на основе dimension или используем unit из метрики
          let unit = metric.unit;
          if (!unit || unit === 'string') {
            // Маппинг dimension -> canonical unit
            const dimensionUnits: Record<string, string> = {
              'distance': 'm',
              'time': 's', 
              'speed': 'm/s',
              'ratio': 'ratio',
              'count': 'count',
              'au': 'au',
              'energy': 'kcal',
              'mass': 'kg',
              'bpm': 'bpm',
              'text': 'text',
              'identity': 'text'
            };
            unit = dimensionUnits[metric.dimension] || metric.unit || 'unknown';
          }
          
          actualMetrics.push({
            key: metric.key,
            nameRu: metric.labels.ru,
            dimension: metric.dimension,
            unit: unit
          });
        }
      }
    }

    console.log(`📊 Найдено метрик в проекте: ${actualMetrics.length}`);
    console.log(`📊 Ожидается метрик: ${EXPECTED.length}`);

    // Создаём индексы для быстрого поиска
    const expectedByKey = new Map(EXPECTED.map(item => [item.key, item]));
    const actualByKey = new Map(actualMetrics.map(item => [item.key, item]));

    // Ищем дубликаты в проекте
    const keyCounts = new Map<string, number>();
    const keyEntries = new Map<string, CanonRow[]>();
    
    for (const metric of actualMetrics) {
      const count = keyCounts.get(metric.key) || 0;
      keyCounts.set(metric.key, count + 1);
      
      if (!keyEntries.has(metric.key)) {
        keyEntries.set(metric.key, []);
      }
      keyEntries.get(metric.key)!.push(metric);
    }

    const duplicates = Array.from(keyCounts.entries())
      .filter(([key, count]) => count > 1)
      .map(([key, count]) => ({
        key,
        count,
        entries: keyEntries.get(key)!
      }));

    // Сравниваем с эталоном
    const result: AuditResult = {
      ok: [],
      mismatch: [],
      missing: [],
      extra: [],
      duplicates
    };

    // Проверяем каждую ожидаемую метрику
    for (const expected of EXPECTED) {
      const actual = actualByKey.get(expected.key);
      
      if (!actual) {
        result.missing.push(expected);
      } else {
        const differences: string[] = [];
        
        if (actual.nameRu !== expected.nameRu) {
          differences.push(`nameRu: "${actual.nameRu}" != "${expected.nameRu}"`);
        }
        if (actual.dimension !== expected.dimension) {
          differences.push(`dimension: "${actual.dimension}" != "${expected.dimension}"`);
        }
        if (actual.unit !== expected.unit) {
          differences.push(`unit: "${actual.unit}" != "${expected.unit}"`);
        }

        if (differences.length === 0) {
          result.ok.push(actual);
        } else {
          result.mismatch.push({
            key: expected.key,
            expected,
            actual,
            differences
          });
        }
      }
    }

    // Проверяем лишние метрики в проекте
    for (const actual of actualMetrics) {
      if (!expectedByKey.has(actual.key)) {
        result.extra.push(actual);
      }
    }

    // Выводим краткий summary в консоль
    console.log('\n=== CANON AUDIT SUMMARY ===');
    console.log(`✅ OK: ${result.ok.length}`);
    console.log(`❌ MISMATCH: ${result.mismatch.length}`);
    console.log(`⚠️  MISSING: ${result.missing.length}`);
    console.log(`➕ EXTRA: ${result.extra.length}`);
    console.log(`🔄 DUPLICATES: ${result.duplicates.length}`);

    if (result.mismatch.length > 0) {
      console.log('\n❌ MISMATCHES:');
      result.mismatch.forEach(item => {
        console.log(`  ${item.key}: ${item.differences.join(', ')}`);
      });
    }

    if (result.missing.length > 0) {
      console.log('\n⚠️  MISSING:');
      result.missing.forEach(item => {
        console.log(`  ${item.key}: ${item.nameRu}`);
      });
    }

    if (result.extra.length > 0) {
      console.log('\n➕ EXTRA:');
      result.extra.forEach(item => {
        console.log(`  ${item.key}: ${item.nameRu}`);
      });
    }

    if (result.duplicates.length > 0) {
      console.log('\n🔄 DUPLICATES:');
      result.duplicates.forEach(item => {
        console.log(`  ${item.key}: ${item.count} entries`);
      });
    }

    // Сохраняем детальные отчёты
    await saveReports(result);

    console.log('\n📄 Отчёты сохранены:');
    console.log('  - artifacts/canon-audit/REPORT.md');
    console.log('  - artifacts/canon-audit/REPORT.json');

  } catch (error) {
    console.error('❌ Ошибка при аудите:', error);
    process.exit(1);
  }
}

async function saveReports(result: AuditResult) {
  // Сохраняем JSON отчёт
  const jsonPath = path.resolve('artifacts/canon-audit/REPORT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  // Создаём Markdown отчёт
  const lines: string[] = [];
  
  lines.push('# Canon Registry Audit Report');
  lines.push('');
  lines.push(`**Дата:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Сводка');
  lines.push(`- **OK:** ${result.ok.length}`);
  lines.push(`- **MISMATCH:** ${result.mismatch.length}`);
  lines.push(`- **MISSING:** ${result.missing.length}`);
  lines.push(`- **EXTRA:** ${result.extra.length}`);
  lines.push(`- **DUPLICATES:** ${result.duplicates.length}`);
  lines.push('');

  // OK секция
  if (result.ok.length > 0) {
    lines.push('## ✅ OK');
    lines.push('');
    lines.push('| Key | Name (RU) | Dimension | Unit |');
    lines.push('|-----|-----------|-----------|------|');
    result.ok.forEach(item => {
      lines.push(`| ${item.key} | ${item.nameRu} | ${item.dimension} | ${item.unit} |`);
    });
    lines.push('');
  }

  // MISMATCH секция
  if (result.mismatch.length > 0) {
    lines.push('## ❌ MISMATCH');
    lines.push('');
    lines.push('| Key | Field | Expected | Actual |');
    lines.push('|-----|-------|----------|--------|');
    result.mismatch.forEach(item => {
      lines.push(`| ${item.key} | nameRu | ${item.expected.nameRu} | ${item.actual.nameRu} |`);
      if (item.expected.dimension !== item.actual.dimension) {
        lines.push(`| ${item.key} | dimension | ${item.expected.dimension} | ${item.actual.dimension} |`);
      }
      if (item.expected.unit !== item.actual.unit) {
        lines.push(`| ${item.key} | unit | ${item.expected.unit} | ${item.actual.unit} |`);
      }
    });
    lines.push('');
  }

  // MISSING секция
  if (result.missing.length > 0) {
    lines.push('## ⚠️  MISSING');
    lines.push('');
    lines.push('| Key | Name (RU) | Dimension | Unit |');
    lines.push('|-----|-----------|-----------|------|');
    result.missing.forEach(item => {
      lines.push(`| ${item.key} | ${item.nameRu} | ${item.dimension} | ${item.unit} |`);
    });
    lines.push('');
  }

  // EXTRA секция
  if (result.extra.length > 0) {
    lines.push('## ➕ EXTRA');
    lines.push('');
    lines.push('| Key | Name (RU) | Dimension | Unit |');
    lines.push('|-----|-----------|-----------|------|');
    result.extra.forEach(item => {
      lines.push(`| ${item.key} | ${item.nameRu} | ${item.dimension} | ${item.unit} |`);
    });
    lines.push('');
  }

  // DUPLICATES секция
  if (result.duplicates.length > 0) {
    lines.push('## 🔄 DUPLICATES');
    lines.push('');
    lines.push('| Key | Count | Entries |');
    lines.push('|-----|-------|---------|');
    result.duplicates.forEach(item => {
      lines.push(`| ${item.key} | ${item.count} | ${item.entries.map(e => e.nameRu).join(', ')} |`);
    });
    lines.push('');
  }

  // Сохраняем Markdown отчёт
  const mdPath = path.resolve('artifacts/canon-audit/REPORT.md');
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
}

// Запускаем аудит
auditCanonRegistry();
