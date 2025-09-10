// src/canon/displayUnits.ts

import { CANON } from './metrics.registry';

export type DisplayUnit = string;

/**
 * Получает разрешённые единицы отображения для канонического ключа
 */
export function allowedDisplayUnitsFor(canonicalKey: string): DisplayUnit[] {
  const metric = CANON.metrics.find(m => m.key === canonicalKey);
  if (!metric) {
    return [];
  }

  const { dimension, unit } = metric;

  // Для текстовых и идентификационных полей - нет единиц
  if (dimension === 'text' || dimension === 'identity') {
    return [];
  }

  // Маппинг dimension/unit -> разрешённые display units
  const unitMap: Record<string, DisplayUnit[]> = {
    // Distance
    'distance-m': ['m', 'km', 'yd'],
    
    // Time  
    'time-s': ['s', 'min', 'h'],
    'time-min': ['min', 'h'],
    'time-h': ['h'],
    
    // Speed
    'speed-m/s': ['m/s', 'km/h', 'm/min'],
    'speed-km/h': ['km/h', 'm/s'],
    'speed-m/min': ['m/min', 'm/s', 'km/h'],
    
    // Ratio
    'ratio-ratio': ['%', 'ratio'],
    
    // Heart rate
    'bpm-bpm': ['bpm'],
    
    // Count/Occurrence
    'count-count': ['count'],
    
    // Load (AU)
    'au-au': ['AU'],
    
    // Acceleration
    'accel-m/s^2': ['m/s^2'],
    
    // Energy
    'energy-kcal': ['kcal'],
    
    // Mass
    'mass-kg': ['kg'],
  };

  const key = `${dimension}-${unit}`;
  return unitMap[key] || [unit]; // Fallback к canonical unit
}

/**
 * Предлагает единицу отображения по умолчанию для канонического ключа
 */
export function suggestDefaultDisplayUnit(canonicalKey: string): DisplayUnit | null {
  const metric = CANON.metrics.find(m => m.key === canonicalKey);
  if (!metric) {
    return null;
  }

  const { dimension, unit } = metric;

  // Для текстовых и идентификационных полей - нет единиц
  if (dimension === 'text' || dimension === 'identity') {
    return null;
  }

  // Правила по умолчанию
  switch (dimension) {
    case 'speed':
      return 'km/h';
    case 'ratio':
      return '%';
    case 'time':
      return 'min';
    case 'distance':
      return 'm';
    case 'bpm':
      return 'bpm';
    case 'count':
      return 'count';
    case 'au':
      return 'AU';
    case 'accel':
      return 'm/s^2';
    case 'energy':
      return 'kcal';
    case 'mass':
      return 'kg';
    default:
      return unit; // Fallback к canonical unit
  }
}

/**
 * Проверяет, является ли единица отображения валидной для канонического ключа
 */
export function isValidDisplayUnit(canonicalKey: string, displayUnit: string): boolean {
  const allowed = allowedDisplayUnitsFor(canonicalKey);
  return allowed.includes(displayUnit);
}

/**
 * Получает метрику по каноническому ключу
 */
export function getMetricByKey(canonicalKey: string) {
  return CANON.metrics.find(m => m.key === canonicalKey);
}
