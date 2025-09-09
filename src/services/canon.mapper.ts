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
    
    // Для B-SIGHT данных: не конвертируем автоматически, оставляем как есть
    // Проблема была в том, что все значения > 1 и <= 100 делились на 100
    // Это неправильно для наших данных
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

/** Применяем маппинг к таблице объектов (каждая строка = игрок) */
export function mapRowsToCanonical(
  rows: Record<string, any>[],
  columns: CanonColumn[],
  opts?: { processedRows?: any[]; processedRowsMap?: Map<number, any>; debug?: boolean }
) {
  // GPS Debug: логируем входные данные
  if (process.env.GPS_DEBUG === '1') {
    console.log('🔍 GPS Debug - mapRowsToCanonical input:', {
      rowsCount: rows.length,
      columnsCount: columns.length,
      firstRowKeys: rows[0] ? Object.keys(rows[0]) : [],
      columns: columns.map(col => ({
        sourceHeader: col.sourceHeader,
        canonicalKey: col.canonicalKey,
        dimension: col.dimension
      }))
    });
  }

  const warnings: string[] = [];
  const canonRows: Record<string, any>[] = [];
  const inputCount = rows.length;
  let filteredCount = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const out: Record<string, any> = {};
    
    const pr = opts?.processedRowsMap?.get(rowIndex) ?? opts?.processedRows?.[rowIndex] ?? null;
    
    // Дополнительная защита: пропускаем строки без athlete_id в processedRows
    if (opts && !pr?.athlete_id && !pr?.playerId) {
      filteredCount++;
      if (opts.debug) {
        console.log(`[CANON] filtered row ${rowIndex}: no athlete_id/playerId`);
      }
      continue;
    }
    
    if (opts?.debug && pr) {
      console.log(`[CANON] matched row ${rowIndex}: athlete_id=${pr.athlete_id || pr.playerId}`);
    }
    
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
        // частый случай: в B-SIGHT мы уже переименовывали поля "TD", "Max Speed" и т.п.
        row[col.canonicalKey] ?? // на всякий случай
        row[col.sourceHeader.replace(/\s+/g, ' ')] ??
        // Дополнительный поиск для B-SIGHT полей
        row['TD'] ?? // для total_distance
        row['Time'] ?? // для time
        row['Max Speed'] ?? // для max_speed
        row['Z-5 Sprint'] ?? // для zone5_sprint
        row['HSR'] ?? // для hsr
        row['HSR%'] ?? // для hsr_percentage
        row['Z-3 Tempo'] ?? // для zone3_tempo
        row['Z-4 HIR'] ?? // для zone4_hir
        row['Acc'] ?? // для accelerations
        row['Dec']; // для decelerations

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
