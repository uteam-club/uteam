// src/services/canon.mapper.ts
import { CANON } from '@/canon/metrics.registry';
import { toCanonical } from '@/canon/units';

// Утилиты для нормализации и проверки служебных строк
function normalizePlayerKey(s: string) {
  return (s ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ё]/g, 'е')
    .replace(/[''`´\-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSummaryRow(name: string) {
  const n = normalizePlayerKey(name);
  return n.includes('средн') || n.includes('сумм') || n.includes('average') || n.includes('total');
}

export type CanonColumn = {
  sourceHeader: string;    // оригинальный заголовок (или имя поля после первичной обработки)
  canonicalKey: string;    // ключ из CANON.metrics.key
  dimension: string;       // измерение (distance/time/speed/ratio/identity/...)
  unitCanon: string;       // каноническая единица измерения (из dimension)
  sourceUnit?: string;     // если удалось распарсить из заголовка, например "(km/h)"
  isIdentity?: boolean;    // true для identity-полей
};

const METRICS_BY_KEY = new Map(CANON.metrics.map(m => [m.key, m]));
const DIMENSIONS = CANON.dimensions;

/** Пробуем вытащить единицу из заголовка: "Max Speed (km/h)" -> "km/h" */
export function guessUnitFromHeader(header: string): string | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();

  // % без скобок: "HSR%" -> "%"
  if (/%$/.test(trimmed)) return '%';

  // Единицы в скобках: "Max Speed (km/h)" -> "km/h"
  const m = trimmed.match(/\(([^)]+)\)\s*$/);
  return m?.[1]?.trim();
}

/** Строим маппинг колонок профиля -> канон, игнорируя колонки без canonicalKey */
export function buildCanonColumns(profileColumnMapping: any[]): CanonColumn[] {
  if (!Array.isArray(profileColumnMapping)) return [];
  const cols: CanonColumn[] = [];

  // GPS Debug: логируем входные данные
  if (process.env.GPS_DEBUG === '1') {
    console.log('🔍 GPS Debug - buildCanonColumns input:', {
      profileColumnMappingLength: profileColumnMapping.length,
      profileColumnMapping: profileColumnMapping.map(c => ({
        type: c?.type,
        canonicalKey: c?.canonicalKey,
        mappedColumn: c?.mappedColumn,
        name: c?.name
      }))
    });
  }

  for (const c of profileColumnMapping) {
    if (c?.type !== 'formula' && c?.canonicalKey && c?.mappedColumn) {
      const metric = METRICS_BY_KEY.get(c.canonicalKey);
      if (!metric) continue;

      const dim = DIMENSIONS[metric.dimension];
      const col: CanonColumn = {
        sourceHeader: String(c.mappedColumn),
        canonicalKey: metric.key,
        dimension: metric.dimension,
        unitCanon: dim?.canonical_unit ?? 'string',
        isIdentity: metric.dimension === 'identity',
      };

      // если удастся понять единицу из заголовка — используем как подсказку
      const guessed = guessUnitFromHeader(col.sourceHeader);
      if (guessed) col.sourceUnit = guessed;

      cols.push(col);
    }
  }

  // GPS Debug: логируем результат
  if (process.env.GPS_DEBUG === '1') {
    console.log('🔍 GPS Debug - buildCanonColumns result:', {
      columnsCount: cols.length,
      columns: cols.map(col => ({
        sourceHeader: col.sourceHeader,
        canonicalKey: col.canonicalKey,
        dimension: col.dimension,
        unitCanon: col.unitCanon,
        sourceUnit: col.sourceUnit
      }))
    });
  }

  return cols;
}

/** Безопасный парс числа: поддержка запятой как десятичного разделителя */
export function toNumberSafe(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  
  const s = String(v).trim().replace(',', '.').replace(/\s+/g, '');
  
  // GPS Debug: логируем исходное значение
  if (process.env.GPS_DEBUG === '1') {
    console.log(`[CANON] toNumberSafe input: "${v}" -> "${s}"`);
  }
  
  // Обычный парс числа
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Парс времени в формате HH:MM:SS или HH:MM в минуты */
export function parseTimeToMinutes(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  
  const s = String(v).trim().replace(/\s+/g, '');
  
  // GPS Debug: логируем исходное значение времени
  if (process.env.GPS_DEBUG === '1') {
    console.log(`[CANON] parseTimeToMinutes input: "${v}" -> "${s}"`);
  }
  
  // Проверяем формат времени HH:MM:SS или HH:MM
  const timeMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    
    // Конвертируем в минуты (для времени игры)
    const totalMinutes = hours * 60 + minutes + seconds / 60;
    
    if (process.env.GPS_DEBUG === '1') {
      console.log(`[CANON] Time conversion: ${s} -> ${totalMinutes} minutes (${hours}h ${minutes}m ${seconds}s)`);
    }
    
    return totalMinutes;
  }
  
  // Если не время, пробуем обычный парс числа
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Конвертируем одно значение по измерению метрики в каноническую единицу (если нужно) */
export function toCanonicalValue(
  value: any,
  col: CanonColumn
): { value: number | string | null; warning?: string } {
  // identity — возвращаем как строку
  if (col.isIdentity) {
    const s = value == null ? '' : String(value);
    return { value: s };
  }

  const metric = METRICS_BY_KEY.get(col.canonicalKey)!;
  const dim = DIMENSIONS[metric.dimension];
  if (!dim) return { value: toNumberSafe(value) };

  // Выбираем правильную функцию парсинга в зависимости от типа поля
  let num: number | null;
  if (col.canonicalKey === 'minutes_played' || col.canonicalKey === 'time_played') {
    // Для полей времени используем специальную функцию парсинга времени
    num = parseTimeToMinutes(value);
  } else {
    // Для остальных полей используем обычный парс чисел
    num = toNumberSafe(value);
  }
  
  if (num === null) return { value: null };
  
  // GPS Debug: логируем все значения
  if (process.env.GPS_DEBUG === '1') {
    console.log(`[CANON] Processing value: ${value} -> ${num}, dimension="${metric.dimension}", canonicalKey="${col.canonicalKey}"`);
  }

  // Защита от двойной конверсии ratio
  if (metric.dimension === 'ratio') {
    // GPS Debug: логируем обработку ratio
    if (process.env.GPS_DEBUG === '1') {
      console.log(`[CANON] Ratio processing: value=${num}, sourceUnit="${col.sourceUnit}", canonicalKey="${col.canonicalKey}"`);
    }
    
    // Если явная единица %
    if (col.sourceUnit === '%') {
      // Если значение уже похоже на долю (0..1.1) — не делим ещё раз
      if (num <= 1.1) return { value: num };
      // Иначе конвертируем из процентов
      try {
        const converted = toCanonical(num, '%', 'ratio');
        return { value: converted };
      } catch { return { value: num }; }
    }
    
    // Если нет явной единицы, пытаемся определить автоматически
    // Если значение > 1 и <= 100, считаем это процентами
    if (num > 1 && num <= 100) {
      try {
        const converted = toCanonical(num, '%', 'ratio');
        return { value: converted };
      } catch { return { value: num }; }
    }
    // Если значение уже в диапазоне 0-1, считаем это долей
    if (num >= 0 && num <= 1) {
      return { value: num };
    }
    
    // Иначе оставляем как есть
    return { value: num };
  }

  // Есть явная исходная единица -> пытаемся конвертировать в канон
  if (col.sourceUnit && col.sourceUnit !== dim.canonical_unit) {
    try {
      const converted = toCanonical(num, col.sourceUnit, metric.dimension as any);
      return { value: converted };
    } catch {
      return { value: num, warning: `no-conversion:${col.sourceUnit}->${dim.canonical_unit}` };
    }
  }

  // По умолчанию: уже в канонической единице
  return { value: num };
}

/** Применяем маппинг к данным из applyProfile */
export function mapRowsToCanonical(
  dataRows: Record<CanonicalColumnKey, (string | number | null)[]>,
  mappedColumns: ProfileSnapshotColumn[]
) {
  const warnings: string[] = [];
  const canonRows: Record<string, any>[] = [];
  
  // Получаем количество строк из первой колонки
  const firstColumn = Object.values(dataRows)[0];
  if (!firstColumn || firstColumn.length === 0) {
    return {
      canonical: {
        rows: [],
        summary: {}
      },
      meta: {
        counts: { input: 0, filtered: 0, matched: 0 },
        warnings
      }
    };
  }

  const rowCount = firstColumn.length;
  
  // Обрабатываем каждую строку
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const canonicalRow: Record<string, any> = {};
    
    // Обрабатываем каждую колонку
    for (const col of mappedColumns) {
      const columnData = dataRows[col.canonicalKey];
      if (!columnData) continue;
      
      const rawValue = columnData[rowIndex];
      
      // Конвертируем в число
      let numValue: number | null = null;
      if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
        if (typeof rawValue === 'number') {
          numValue = rawValue;
        } else if (typeof rawValue === 'string') {
          const parsed = parseFloat(rawValue);
          if (!isNaN(parsed)) {
            numValue = parsed;
          }
        }
      }
      
      // Применяем конвертацию единиц если нужно
      if (numValue !== null && col.unit) {
        const converted = toCanonicalValue(numValue, {
          sourceHeader: col.sourceHeader,
          canonicalKey: col.canonicalKey,
          dimension: getDimensionFromCanonicalKey(col.canonicalKey),
          unit: col.unit,
          unitCanon: getCanonicalUnit(col.canonicalKey)
        });
        
        if (converted.warning) {
          warnings.push(converted.warning);
        }
        
        canonicalRow[col.canonicalKey] = converted.value;
      } else {
        canonicalRow[col.canonicalKey] = numValue;
      }
    }
    
    canonRows.push(canonicalRow);
  }
  
  // Создаем summary
  const summary: Record<string, number> = {};
  
  // Суммируемые метрики
  const summableMetrics = ['total_distance_m', 'duration_s', 'player_load_au'];
  for (const metric of summableMetrics) {
    const values = canonRows.map(row => row[metric]).filter(v => v !== null && v !== undefined);
    if (values.length > 0) {
      summary[metric] = values.reduce((sum, val) => sum + val, 0);
    }
  }
  
  // Max метрики
  const maxMetrics = ['max_speed_ms'];
  for (const metric of maxMetrics) {
    const values = canonRows.map(row => row[metric]).filter(v => v !== null && v !== undefined);
    if (values.length > 0) {
      summary[metric] = Math.max(...values);
    }
  }
  
  return {
    canonical: {
      rows: canonRows,
      summary
    },
    meta: {
      counts: { input: rowCount, filtered: 0, matched: canonRows.length },
      warnings
    }
  };
}

// Вспомогательные функции
function getDimensionFromCanonicalKey(canonicalKey: string): string {
  if (canonicalKey.includes('distance')) return 'distance';
  if (canonicalKey.includes('speed')) return 'speed';
  if (canonicalKey.includes('time') || canonicalKey.includes('duration') || canonicalKey.includes('minutes')) return 'time';
  if (canonicalKey.includes('load')) return 'load';
  return 'unknown';
}

function getCanonicalUnit(canonicalKey: string): string {
  if (canonicalKey.includes('distance_m')) return 'm';
  if (canonicalKey.includes('speed_ms')) return 'm/s';
  if (canonicalKey.includes('minutes_played')) return 'min';
  if (canonicalKey.includes('duration_s')) return 's';
  if (canonicalKey.includes('load_au')) return 'AU';
  return 'unknown';
    
    /** имя игрока с приоритетом: processed → raw */
    const nameFromProcessed =
      pr?.athlete_name ?? pr?.name ?? pr?.playerName ?? pr?.player ?? null;
    const nameFromRaw =
      row['athlete_name'] ?? row['name'] ?? row['Name'] ?? row['Player'] ?? row['Игрок'] ?? null;

    const athleteName = (nameFromProcessed ?? nameFromRaw);
    if (athleteName) out.athlete_name = String(athleteName).trim();
    
    // GPS Debug: логируем процесс выбора имени
    if (opts?.debug) {
      console.log(`[CANON] Row ${rowIndex}: nameFromProcessed="${nameFromProcessed}", nameFromRaw="${nameFromRaw}", final="${athleteName}"`);
    }

    /** id игрока, если присутствует в processed */
    const athleteId = pr?.athlete_id ?? pr?.playerId ?? null;
    if (athleteId) out.athlete_id = String(athleteId);
    
    /** confidence score и mapping type, если присутствуют в processed */
    if (pr?.confidenceScore !== undefined) out.confidenceScore = pr.confidenceScore;
    if (pr?.mappingType) out.mappingType = pr.mappingType;
    
    for (const col of columns) {
      const rawVal =
        row[col.sourceHeader] ??
        row[col.sourceHeader.trim()] ??
        row[col.canonicalKey] ?? // fallback на canonical key
        row[col.sourceHeader.replace(/\s+/g, ' ')]; // fallback на нормализованный заголовок

      // GPS Debug: логируем процесс маппинга полей
      if (opts?.debug && rowIndex < 3) {
        console.log(`[CANON] Row ${rowIndex}, Column ${col.canonicalKey}: sourceHeader="${col.sourceHeader}", rawVal="${rawVal}"`);
        console.log(`[CANON] Available row keys:`, Object.keys(row).slice(0, 10));
      }

      const { value, warning } = toCanonicalValue(rawVal, col);
      if (warning) warnings.push(`${col.canonicalKey}:${warning}`);
      if (value !== null && value !== '') {
        out[col.canonicalKey] = value;
        
        // Проверка границ правдоподобности
        const metaMetric = METRICS_BY_KEY.get(col.canonicalKey);
        if (metaMetric && typeof value === 'number') {
          if (Number.isFinite(metaMetric.plausibleMin) && value < (metaMetric.plausibleMin as number)) {
            warnings.push(`${col.canonicalKey}:below-min:${value}`);
          }
          if (Number.isFinite(metaMetric.plausibleMax) && value > (metaMetric.plausibleMax as number)) {
            warnings.push(`${col.canonicalKey}:above-max:${value}`);
          }
        }
      }
    }
    
    // Второй барьер: проверяем имя на служебные строки перед пушем в canonical
    const nameCandidate =
      out.athlete_name ??
      row['athlete_name'] ?? row['name'] ?? row['Name'] ?? row['Player'] ?? row['Игрок'] ?? '';

    if (isSummaryRow(String(nameCandidate))) {
      if (opts?.debug) console.log('[GPS] drop summary row at mapper:', nameCandidate);
      filteredCount++; // считаем как отфильтрованную
      continue;
    }
    
    // не записываем пустые строки (но учитываем athlete_name)
    if (Object.keys(out).length > 0) canonRows.push(out);
  }

  // GPS Debug: логируем результат
  if (process.env.GPS_DEBUG === '1') {
    console.log('🔍 GPS Debug - mapRowsToCanonical result:', {
      canonRowsCount: canonRows.length,
      firstCanonRowKeys: canonRows[0] ? Object.keys(canonRows[0]) : [],
      warningsCount: warnings.length,
      warnings: warnings.slice(0, 10) // первые 10 предупреждений
    });
  }

  return {
    rows: canonRows,
    meta: {
      canonVersion: CANON.__meta.version,
      units: Object.fromEntries(
        Object.entries(DIMENSIONS).map(([k, v]) => [k, v.canonical_unit])
      ),
      warnings: Array.from(new Set(warnings)).slice(0, 100),
      counts: {
        input: inputCount,
        filtered: filteredCount,
        canonical: canonRows.length
      },
    },
  };
}
