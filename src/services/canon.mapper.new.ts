import { DIMENSIONS, UNITS } from '../canon/units';
// @ts-ignore
import { CANON } from '../canon/metrics.registry';

export interface CanonColumn {
  sourceHeader: string;
  canonicalKey: string;
  dimension: string;
  unit: string;
  unitCanon: string;
}

export interface ProfileSnapshotColumn {
  sourceHeader: string;
  canonicalKey: string;
  displayName: string;
  order: number;
  isVisible: boolean;
  unit?: string | null;
  transform?: string | null;
}

export type CanonicalColumnKey = string;

/**
 * Конвертирует значение в каноническую единицу
 */
export function toCanonicalValue(
  value: any,
  col: CanonColumn
): { value: number | string | null; warning?: string } {
  if (value === null || value === undefined || value === '') {
    return { value: null };
  }

  // Конвертируем в число
  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return { value: null, warning: `Cannot parse "${value}" as number` };
    }
    num = parsed;
  } else {
    return { value: null, warning: `Unexpected value type: ${typeof value}` };
  }

  // Если единицы совпадают - возвращаем как есть
  if (col.unit === col.unitCanon) {
    return { value: num };
  }

  // Конвертируем единицы
  const dimension = DIMENSIONS[col.dimension];
  if (!dimension) {
    return { value: num, warning: `Unknown dimension: ${col.dimension}` };
  }

  const sourceUnit = UNITS[col.unit];
  const targetUnit = UNITS[col.unitCanon];
  
  if (!sourceUnit || !targetUnit) {
    return { value: num, warning: `Unknown units: ${col.unit} -> ${col.unitCanon}` };
  }

  // Конвертируем через базовую единицу
  const baseValue = num * sourceUnit.multiplier;
  const canonicalValue = baseValue / targetUnit.multiplier;

  return { value: canonicalValue };
}

/**
 * Применяем маппинг к данным из applyProfile
 */
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
}
