// services/gps/dataFilter.service.ts
import { ProfileSnapshotColumn } from '@/types/gps';

export interface FilteredDataResult {
  filteredRows: Record<string, any>[];
  filteredCount: number;
  warnings: string[];
}

/**
 * Фильтрует мусорные и сводные строки из canonical данных
 */
export function filterCanonicalData(
  rows: Record<string, any>[],
  columns: ProfileSnapshotColumn[]
): FilteredDataResult {
  const warnings: string[] = [];
  const filteredRows: Record<string, any>[] = [];
  let filteredCount = 0;

  // Находим колонку с именем игрока
  const nameColumn = columns.find(col => col.canonicalKey === 'athlete_name');
  if (!nameColumn) {
    warnings.push('Колонка athlete_name не найдена в profileSnapshot');
    return { filteredRows: rows, filteredCount: 0, warnings };
  }

  for (const row of rows) {
    const athleteName = row[nameColumn.canonicalKey];
    
    // Проверяем, является ли строка пустой
    if (isEmptyRow(row, athleteName)) {
      filteredCount++;
      continue;
    }

    // Проверяем, является ли строка сводной
    if (isSummaryRow(athleteName, row)) {
      filteredCount++;
      continue;
    }

    // Проверяем экстремальные значения
    if (hasExtremeValues(row)) {
      filteredCount++;
      warnings.push(`Отфильтрована строка с экстремальными значениями: ${athleteName}`);
      continue;
    }

    filteredRows.push(row);
  }

  return { filteredRows, filteredCount, warnings };
}

/**
 * Проверяет, является ли строка пустой
 */
function isEmptyRow(row: Record<string, any>, athleteName: any): boolean {
  // Проверяем имя игрока
  if (!athleteName || 
      athleteName === '' || 
      athleteName === '-' || 
      athleteName === 'n/a' || 
      (typeof athleteName === 'string' && athleteName.trim() === '')) {
    
    // Проверяем, что все метрики тоже пусты
    const hasAnyValue = Object.entries(row).some(([key, value]) => {
      if (key === 'athlete_name') return false; // Имя уже проверили
      if (value === null || value === undefined || value === '') return false;
      if (typeof value === 'number' && value !== 0) return true;
      if (typeof value === 'string' && value.trim() !== '') return true;
      return false;
    });

    return !hasAnyValue;
  }

  return false;
}

/**
 * Проверяет, является ли строка сводной
 */
function isSummaryRow(athleteName: any, row: Record<string, any>): boolean {
  if (!athleteName || typeof athleteName !== 'string') {
    return false;
  }

  const lowerName = athleteName.toLowerCase().trim();
  
  // Ключевые слова сводных строк
  const summaryKeywords = [
    'итог', 'total', 'summary', 'сумма', 'среднее', 'average', 
    'средний', 'mean', 'всего', 'общий', 'general', 'итого',
    'суммарный', 'aggregate', 'сводка', 'report'
  ];

  if (summaryKeywords.some(keyword => lowerName.includes(keyword))) {
    return true;
  }

  // Экстремальные значения проверяются отдельно в hasExtremeValues

  return false;
}

/**
 * Проверяет наличие экстремальных значений
 */
function hasExtremeValues(row: Record<string, any>): boolean {
  // Проверяем время игры (более 5 часов)
  const minutesPlayed = row.minutes_played;
  if (typeof minutesPlayed === 'number' && minutesPlayed > 300) {
    return true;
  }

  // Проверяем дистанцию (более 50 км)
  const totalDistance = row.total_distance_m;
  if (typeof totalDistance === 'number' && totalDistance > 50000) {
    return true;
  }

  // Проверяем максимальную скорость (более 50 км/ч)
  const maxSpeed = row.max_speed_ms;
  if (typeof maxSpeed === 'number' && maxSpeed > 13.89) { // 50 км/ч в м/с
    return true;
  }

  // Проверяем HSR ratio (более 100%)
  const hsrRatio = row.hsr_ratio;
  if (typeof hsrRatio === 'number' && hsrRatio > 1.0) {
    return true;
  }

  return false;
}

/**
 * Получает имя игрока из строки данных используя sourceHeader
 */
export function getPlayerNameFromRow(
  row: Record<string, any>, 
  columns: ProfileSnapshotColumn[]
): string | null {
  const nameColumn = columns.find(col => col.canonicalKey === 'athlete_name');
  if (!nameColumn) {
    return null;
  }

  const name = row[nameColumn.canonicalKey];
  if (!name || typeof name !== 'string') {
    return null;
  }

  return name.trim();
}
