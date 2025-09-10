import type { ProfileSnapshot } from "@/types/gps";

type ParsedTable = {
  headers?: string[] | null;
  rows?: unknown[] | null;
};

type NormalizeResult = {
  rows: Record<string, unknown>[];
  strategy: "empty" | "objects" | "byHeaders" | "bySourceIndex" | "heuristics" | "unknown";
  warnings: string[];
  sizes: { headers: number; rows: number };
};

const isStringArray = (a: unknown): a is string[] => Array.isArray(a) && a.every(v => typeof v === "string");
const isRowArray = (a: unknown): a is unknown[] => Array.isArray(a);
const isObjectRow = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Эвристическое определение заголовков на основе содержимого
 */
function detectHeuristicHeaders(rows: unknown[][], snapshot: ProfileSnapshot): string[] {
  if (rows.length === 0) return [];
  
  const firstRow = rows[0];
  const headers: string[] = [];
  
  // Пытаемся найти имя игрока (первая колонка с текстом)
  let nameIndex = -1;
  for (let i = 0; i < firstRow.length; i++) {
    const value = firstRow[i];
    if (typeof value === 'string' && value.trim().length > 0) {
      // Проверяем, что это похоже на имя (содержит буквы, не только цифры)
      if (/[а-яёa-z]/i.test(value) && !/^\d+$/.test(value)) {
        nameIndex = i;
        break;
      }
    }
  }
  
  // Создаём заголовки на основе эвристики
  for (let i = 0; i < firstRow.length; i++) {
    if (i === nameIndex) {
      headers.push("Игрок");
    } else {
      // Анализируем все значения в колонке для определения типа
      const columnValues = rows.map(row => row[i]).filter(v => v !== null && v !== undefined);
      
      // Время (HH:MM:SS или MM:SS) - проверяем все строки
      const isTimeColumn = columnValues.every(v => 
        typeof v === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(v)
      );
      
      // Дистанция (большие числа, вероятно метры)
      const isDistanceColumn = columnValues.every(v => 
        typeof v === 'number' && v > 100 && v < 50000
      );
      
      // Скорость (числа 10-50, вероятно км/ч)
      const isSpeedColumn = columnValues.every(v => 
        typeof v === 'number' && v >= 10 && v <= 50
      );
      
      // Проценты (0-100)
      const isPercentColumn = columnValues.every(v => 
        typeof v === 'number' && v >= 0 && v <= 100
      );
      
      if (isTimeColumn) {
        headers.push("Время");
      } else if (isDistanceColumn) {
        headers.push("Дистанция_м");
      } else if (isSpeedColumn) {
        headers.push("Скорость_кмч");
      } else if (isPercentColumn) {
        headers.push("Процент");
      } else {
        headers.push(`Колонка_${i + 1}`);
      }
    }
  }
  
  return headers;
}

/**
 * Создаёт маппинг по sourceIndex из снапшота
 */
function createSourceIndexMapping(snapshot: ProfileSnapshot): Map<number, string> {
  const idxMap = new Map<number, string>();
  
  snapshot?.columns?.forEach(c => {
    const sourceIndex = (c as any).sourceIndex;
    if (typeof sourceIndex === "number" && sourceIndex >= 0) {
      const key = (c as any).sourceHeader ?? c.canonicalKey ?? `col_${sourceIndex}`;
      idxMap.set(sourceIndex, String(key));
    }
  });
  
  return idxMap;
}

/** Главный нормализатор — НИКОГДА не кидает исключения */
export function normalizeRowsForMapping(input: ParsedTable, snapshot: ProfileSnapshot): NormalizeResult {
  const headers = isStringArray(input?.headers) ? input!.headers! : [];
  const rowsIn = isRowArray(input?.rows) ? (input!.rows as unknown[]) : [];
  const warnings: string[] = [];
  const sizes = { headers: headers.length, rows: rowsIn.length };

  // Пусто
  if (rowsIn.length === 0) {
    warnings.push("NO_ROWS");
    return { rows: [], strategy: "empty", warnings, sizes };
  }

  // Случай 1: Уже объекты с заголовками
  if (isObjectRow(rowsIn[0])) {
    return { rows: rowsIn as Record<string, unknown>[], strategy: "objects", warnings, sizes };
  }

  // Случай 2: Массивы значений
  if (Array.isArray(rowsIn[0])) {
    const arrayRows = rowsIn as unknown[][];
    
    // 2a) Есть заголовки - маппируем по именам
    if (headers.length > 0) {
      const rows = arrayRows.map(arr => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { 
          obj[h] = i < arr.length ? arr[i] : null; 
        });
        return obj;
      });
      return { rows, strategy: "byHeaders", warnings, sizes };
    }

    // 2b) Нет заголовков, но есть sourceIndex в снапшоте
    const sourceIndexMap = createSourceIndexMapping(snapshot);
    if (sourceIndexMap.size > 0) {
      const rows = arrayRows.map(arr => {
        const obj: Record<string, unknown> = {};
        sourceIndexMap.forEach((name, index) => { 
          obj[name] = index < arr.length ? arr[index] : null; 
        });
        return obj;
      });
      warnings.push("NO_HEADERS_USED_SOURCE_INDEX");
      return { rows, strategy: "bySourceIndex", warnings, sizes };
    }

    // 2c) Эвристика - определяем заголовки по содержимому
    const heuristicHeaders = detectHeuristicHeaders(arrayRows, snapshot);
    if (heuristicHeaders.length > 0) {
      const rows = arrayRows.map(arr => {
        const obj: Record<string, unknown> = {};
        heuristicHeaders.forEach((h, i) => { 
          obj[h] = i < arr.length ? arr[i] : null; 
        });
        return obj;
      });
      warnings.push("HEURISTIC_FALLBACK");
      return { rows, strategy: "heuristics", warnings, sizes };
    }
  }

  // Неизвестная форма
  warnings.push("UNKNOWN_INPUT_SHAPE");
  return { rows: [], strategy: "unknown", warnings, sizes };
}

export default normalizeRowsForMapping;