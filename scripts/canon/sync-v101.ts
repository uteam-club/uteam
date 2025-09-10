#!/usr/bin/env tsx
// scripts/canon/sync-v101.ts

import fs from 'fs';
import path from 'path';

// Типы
type CanonMetric = {
  key: string;
  nameRu: string;
  dimension: string;
  unit: string;
};

type RegistryMetric = {
  key: string;
  labels?: { ru?: string; en?: string };
  unit?: string;
  dimension?: string;
  [key: string]: any; // для остальных полей
};

type SyncPlan = {
  missing: CanonMetric[];
  mismatch: Array<{
    key: string;
    expected: CanonMetric;
    actual: RegistryMetric;
    changes: string[];
  }>;
  extra: Array<{
    key: string;
    nameRu: string;
    dimension: string;
    unit: string;
  }>;
  deprecated: Array<{
    key: string;
    reason: string;
  }>;
};

// Эталон v1.0.1
const EXPECTED: CanonMetric[] = [
  { key: "athlete_name", nameRu: "Имя игрока", dimension: "text", unit: "text" },
  { key: "position", nameRu: "Позиция", dimension: "text", unit: "text" },
  { key: "player_external_id", nameRu: "Внешний ID игрока", dimension: "text", unit: "text" },
  { key: "gps_system", nameRu: "GPS система", dimension: "text", unit: "text" },

  { key: "total_distance_m", nameRu: "Общая дистанция (м)", dimension: "distance", unit: "m" },
  { key: "distance_per_min_m", nameRu: "Дистанция за минуту (м/мин)", dimension: "speed", unit: "m/min" },
  { key: "hsr_distance_m", nameRu: "Дистанция HSR (м)", dimension: "distance", unit: "m" },
  { key: "very_high_speed_distance_m", nameRu: "Дистанция VHSR (м)", dimension: "distance", unit: "m" },
  { key: "hard_running_distance_m", nameRu: "Дистанция HR (м)", dimension: "distance", unit: "m" },

  { key: "duration_s", nameRu: "Длительность (сек)", dimension: "time", unit: "s" },
  { key: "minutes_played", nameRu: "Время на поле (мин)", dimension: "time", unit: "min" },
  { key: "work_time_s", nameRu: "Время работы (сек)", dimension: "time", unit: "s" },
  { key: "standing_time_s", nameRu: "Время стоя (сек)", dimension: "time", unit: "s" },
  { key: "walking_time_s", nameRu: "Время ходьбы (сек)", dimension: "time", unit: "s" },

  { key: "average_speed_ms", nameRu: "Средняя скорость (м/с)", dimension: "speed", unit: "m/s" },
  { key: "max_speed_ms", nameRu: "Макс. скорость (м/с)", dimension: "speed", unit: "m/s" },
  { key: "max_speed_kmh", nameRu: "Макс. скорость (км/ч)", dimension: "speed", unit: "km/h" },
  { key: "sprint_max_speed_ms", nameRu: "Макс. скорость в спринте (м/с)", dimension: "speed", unit: "m/s" },

  { key: "number_of_sprints_count", nameRu: "Кол-во спринтов", dimension: "count", unit: "count" },
  { key: "flying_sprints_count", nameRu: "Кол-во «летящих» спринтов", dimension: "count", unit: "count" },

  { key: "accelerations_count", nameRu: "Кол-во ускорений", dimension: "count", unit: "count" },
  { key: "accelerations_high_count", nameRu: "Кол-во ускорений (высокие)", dimension: "count", unit: "count" },
  { key: "decelerations_count", nameRu: "Кол-во торможений", dimension: "count", unit: "count" },
  { key: "decelerations_high_count", nameRu: "Кол-во торможений (высокие)", dimension: "count", unit: "count" },

  { key: "meters_per_acceleration_m", nameRu: "Метров на ускорение (м)", dimension: "distance", unit: "m" },
  { key: "meters_per_deceleration_m", nameRu: "Метров на торможение (м)", dimension: "distance", unit: "m" },

  { key: "hsr_ratio", nameRu: "HSR % от общей", dimension: "ratio", unit: "ratio" },
  { key: "sprint_ratio", nameRu: "Доля спринта от общей", dimension: "ratio", unit: "ratio" },
  { key: "very_high_speed_ratio", nameRu: "VHSR % от общей", dimension: "ratio", unit: "ratio" },
  { key: "work_ratio", nameRu: "Рабочая доля времени", dimension: "ratio", unit: "ratio" },

  { key: "heart_rate_avg_bpm", nameRu: "Пульс средний (уд/мин)", dimension: "bpm", unit: "bpm" },
  { key: "heart_rate_max_bpm", nameRu: "Пульс максимум (уд/мин)", dimension: "bpm", unit: "bpm" },
  { key: "heart_rate_time_in_zone_1_s", nameRu: "Время в пульс-зоне 1 (сек)", dimension: "time", unit: "s" },
  { key: "heart_rate_time_in_zone_2_s", nameRu: "Время в пульс-зоне 2 (сек)", dimension: "time", unit: "s" },
  { key: "heart_rate_time_in_zone_3_s", nameRu: "Время в пульс-зоне 3 (сек)", dimension: "time", unit: "s" },
  { key: "heart_rate_time_in_zone_4_s", nameRu: "Время в пульс-зоне 4 (сек)", dimension: "time", unit: "s" },
  { key: "heart_rate_time_in_zone_5_s", nameRu: "Время в пульс-зоне 5 (сек)", dimension: "time", unit: "s" },

  { key: "steps_total_count", nameRu: "Кол-во шагов всего", dimension: "count", unit: "count" },
  { key: "left_foot_contacts_count", nameRu: "Кол-во контактов левой", dimension: "count", unit: "count" },
  { key: "right_foot_contacts_count", nameRu: "Кол-во контактов правой", dimension: "count", unit: "count" },

  { key: "total_load_au", nameRu: "Общая нагрузка (AU)", dimension: "au", unit: "au" },
  { key: "neuromuscular_load_au", nameRu: "Нейромышечная нагрузка (AU)", dimension: "au", unit: "au" },
  { key: "accumulated_load_au", nameRu: "Накопленная нагрузка (AU)", dimension: "au", unit: "au" },
  { key: "session_rpe_au", nameRu: "sRPE (AU)", dimension: "au", unit: "au" },

  { key: "aee_kcal", nameRu: "Активная энергозатрата (ккал)", dimension: "energy", unit: "kcal" },
  { key: "body_mass_kg", nameRu: "Масса тела (кг)", dimension: "mass", unit: "kg" },

  { key: "distance_zone_0_m", nameRu: "Дистанция зона 0 (м)", dimension: "distance", unit: "m" },
  { key: "distance_zone_1_m", nameRu: "Дистанция зона 1 (м)", dimension: "distance", unit: "m" },
  { key: "distance_zone_2_m", nameRu: "Дистанция зона 2 (м)", dimension: "distance", unit: "m" },
  { key: "distance_zone_3_m", nameRu: "Дистанция зона 3 (м)", dimension: "distance", unit: "m" },
  { key: "distance_zone_4_m", nameRu: "Дистанция зона 4 (м)", dimension: "distance", unit: "m" },
  { key: "distance_zone_5_m", nameRu: "Дистанция зона 5 (м)", dimension: "distance", unit: "m" },

  { key: "x_pos_m", nameRu: "X позиция (м)", dimension: "distance", unit: "m" },
  { key: "y_pos_m", nameRu: "Y позиция (м)", dimension: "distance", unit: "m" },

  { key: "uptime_s", nameRu: "Время работы датчика (сек)", dimension: "time", unit: "s" }
] satisfies Array<{key:string;nameRu:string;dimension:string;unit:string}>;

async function syncCanonRegistry() {
  console.log('🔄 Синхронизация канонического реестра с v1.0.1...\n');

  // Парсим аргументы
  const apply = process.argv.includes('--apply=true');
  console.log(`📋 Режим: ${apply ? 'ПРИМЕНЕНИЕ' : 'DRY-RUN'}`);

  try {
    // Загружаем текущий реестр
    const registryPath = path.resolve('src/canon/metrics.registry.json');
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(registryContent);

    console.log('📊 Загружен реестр из:', registryPath);
    console.log('📊 Метрик в реестре:', registry.metrics?.length || 0);
    console.log('📊 Ожидается метрик:', EXPECTED.length);

    // Создаём индексы
    const expectedByKey = new Map(EXPECTED.map(item => [item.key, item]));
    const actualByKey = new Map((registry.metrics || []).map((item: RegistryMetric) => [item.key, item]));

    // Строим план изменений
    const plan: SyncPlan = {
      missing: [],
      mismatch: [],
      extra: [],
      deprecated: []
    };

    // 1. MISSING - ключи из эталона, которых нет в реестре
    for (const expected of EXPECTED) {
      if (!actualByKey.has(expected.key)) {
        plan.missing.push(expected);
      }
    }

    // 2. MISMATCH - ключи есть, но отличаются поля
    for (const expected of EXPECTED) {
      const actual = actualByKey.get(expected.key);
      if (actual) {
        const changes: string[] = [];
        
        if (actual.labels?.ru !== expected.nameRu) {
          changes.push(`labels.ru: "${actual.labels?.ru || ''}" → "${expected.nameRu}"`);
        }
        if (actual.dimension !== expected.dimension) {
          changes.push(`dimension: "${actual.dimension || ''}" → "${expected.dimension}"`);
        }
        if (actual.unit !== expected.unit) {
          changes.push(`unit: "${actual.unit || ''}" → "${expected.unit}"`);
        }

        if (changes.length > 0) {
          plan.mismatch.push({
            key: expected.key,
            expected,
            actual,
            changes
          });
        }
      }
    }

    // 3. EXTRA - ключи в реестре, которых нет в эталоне
    for (const [key, actual] of actualByKey) {
      if (!expectedByKey.has(key)) {
        plan.extra.push({
          key,
          nameRu: actual.labels?.ru || '',
          dimension: actual.dimension || '',
          unit: actual.unit || ''
        });
      }
    }

    // Выводим краткую сводку
    console.log('\n=== SYNC PLAN SUMMARY ===');
    console.log(`➕ MISSING: ${plan.missing.length}`);
    console.log(`🔄 MISMATCH: ${plan.mismatch.length}`);
    console.log(`➕ EXTRA: ${plan.extra.length}`);
    console.log(`⚠️  DEPRECATED: ${plan.extra.length}`);

    // Сохраняем план
    const planPath = path.resolve('artifacts/canon-sync/PLAN.json');
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
    console.log(`\n📄 План сохранён: ${planPath}`);

    // Создаём отчёт
    await createReport(plan);

    if (apply) {
      console.log('\n🔧 Применяем изменения...');
      await applyChanges(registry, plan, registryPath);
    } else {
      console.log('\n💡 Для применения выполните: npm run canon:sync:apply');
    }

  } catch (error) {
    console.error('❌ Ошибка при синхронизации:', error);
  }

  console.log('\n✅ Синхронизация завершена');
  process.exit(0);
}

async function createReport(plan: SyncPlan) {
  const lines: string[] = [];
  
  lines.push('# Canon Registry Sync Report v1.0.1');
  lines.push('');
  lines.push(`**Дата:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Сводка');
  lines.push(`- **MISSING:** ${plan.missing.length} метрик для добавления`);
  lines.push(`- **MISMATCH:** ${plan.mismatch.length} метрик для обновления`);
  lines.push(`- **EXTRA:** ${plan.extra.length} метрик для пометки deprecated`);
  lines.push('');

  // MISSING секция
  if (plan.missing.length > 0) {
    lines.push('## ➕ MISSING (будут добавлены)');
    lines.push('');
    lines.push('| Key | Name (RU) | Dimension | Unit |');
    lines.push('|-----|-----------|-----------|------|');
    plan.missing.forEach(item => {
      lines.push(`| ${item.key} | ${item.nameRu} | ${item.dimension} | ${item.unit} |`);
    });
    lines.push('');
  }

  // MISMATCH секция
  if (plan.mismatch.length > 0) {
    lines.push('## 🔄 MISMATCH (будут обновлены)');
    lines.push('');
    lines.push('| Key | Изменения |');
    lines.push('|-----|-----------|');
    plan.mismatch.forEach(item => {
      lines.push(`| ${item.key} | ${item.changes.join(', ')} |`);
    });
    lines.push('');
  }

  // EXTRA секция
  if (plan.extra.length > 0) {
    lines.push('## ⚠️  EXTRA (будут помечены deprecated)');
    lines.push('');
    lines.push('| Key | Name (RU) | Dimension | Unit |');
    lines.push('|-----|-----------|-----------|------|');
    plan.extra.forEach(item => {
      lines.push(`| ${item.key} | ${item.nameRu} | ${item.dimension} | ${item.unit} |`);
    });
    lines.push('');
  }

  // Сохраняем отчёт
  const reportPath = path.resolve('artifacts/canon-sync/REPORT.md');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`📄 Отчёт сохранён: ${reportPath}`);
}

async function applyChanges(registry: any, plan: SyncPlan, registryPath: string) {
  // Создаём бэкап
  const backupPath = path.resolve('artifacts/canon-sync/backup.metrics.registry.json');
  fs.writeFileSync(backupPath, JSON.stringify(registry, null, 2), 'utf8');
  console.log(`💾 Бэкап создан: ${backupPath}`);

  // Создаём копию реестра для изменений
  const updatedRegistry = JSON.parse(JSON.stringify(registry));
  const metrics = updatedRegistry.metrics || [];

  // 1. Добавляем MISSING метрики
  for (const missing of plan.missing) {
    const newMetric: RegistryMetric = {
      key: missing.key,
      labels: { ru: missing.nameRu, en: '' },
      unit: missing.unit,
      dimension: missing.dimension,
      description: '',
      agg: 'sum',
      scaling: 'none',
      category: 'metric',
      isDerived: false
    };
    metrics.push(newMetric);
    console.log(`➕ Добавлена: ${missing.key}`);
  }

  // 2. Обновляем MISMATCH метрики
  for (const mismatch of plan.mismatch) {
    const metric = metrics.find((m: RegistryMetric) => m.key === mismatch.key);
    if (metric) {
      if (!metric.labels) metric.labels = {};
      metric.labels.ru = mismatch.expected.nameRu;
      metric.dimension = mismatch.expected.dimension;
      metric.unit = mismatch.expected.unit;
      console.log(`🔄 Обновлена: ${mismatch.key}`);
    }
  }

  // 3. Помечаем EXTRA метрики как deprecated
  for (const extra of plan.extra) {
    const metric = metrics.find((m: RegistryMetric) => m.key === extra.key);
    if (metric) {
      metric.deprecated = true;
      metric.deprecatedReason = "Not in canon v1.0.1";
      console.log(`⚠️  Deprecated: ${extra.key}`);
    }
  }

  // Сортируем по key
  metrics.sort((a: RegistryMetric, b: RegistryMetric) => a.key.localeCompare(b.key));

  // Сохраняем обновлённый реестр
  updatedRegistry.metrics = metrics;
  fs.writeFileSync(registryPath, JSON.stringify(updatedRegistry, null, 2), 'utf8');
  console.log(`💾 Реестр обновлён: ${registryPath}`);
}

// Запускаем синхронизацию
syncCanonRegistry();
