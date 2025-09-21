/**
 * Упрощенная система конвертации единиц измерения
 * Прямая конвертация sourceUnit -> displayUnit без промежуточных канонических единиц
 */

import { getUnitGroupForMetric, getAvailableUnitsForMetric, getDefaultUnitsForMetric } from './metric-unit-groups';

// Прямые коэффициенты конвертации между единицами измерения
export const UNIT_CONVERSIONS: Record<string, number> = {
  // Скорость (speed)
  'km/h->m/s': 0.2777777778,
  'km/h->mph': 0.621371,
  'km/h->m/min': 16.6667,
  'm/s->km/h': 3.6,
  'm/s->mph': 2.23694,
  'm/s->m/min': 60,
  'mph->km/h': 1.60934,
  'mph->m/s': 0.44704,
  'mph->m/min': 26.8224,
  'm/min->km/h': 0.06,
  'm/min->m/s': 0.0166667,
  'm/min->mph': 0.0372823,

  // Дистанция (distance)
  'km->m': 1000,
  'km->yd': 1093.61,
  'm->km': 0.001,
  'm->yd': 1.09361,
  'yd->km': 0.0009144,
  'yd->m': 0.9144,

  // Время (time)
  'min->s': 60,
  'h->s': 3600,
  'h->min': 60,
  's->min': 0.0166667,
  's->h': 0.000277778,
  'min->h': 0.0166667,
  'ms->s': 0.001,
  's->ms': 1000,
  'min->ms': 60000,
  'ms->min': 0.0000166667,
  'h->ms': 3600000,
  'ms->h': 0.000000277778,

  // Ускорение (acceleration)
  'g->m/s^2': 9.80665,
  'm/s^2->g': 0.101972,

  // Соотношения (ratio)
  '%->ratio': 0.01,
  'ratio->%': 100,

  // Частота сердечных сокращений (heart_rate)
  // bpm остается bpm, %HRmax остается %HRmax (специальная обработка)
};

/**
 * Конвертирует значение из одной единицы измерения в другую
 * @param value - исходное значение
 * @param fromUnit - исходная единица измерения
 * @param toUnit - целевая единица измерения
 * @returns конвертированное значение
 */
export function convertValue(value: number, fromUnit: string, toUnit: string): number {
  // Если единицы одинаковые, возвращаем значение без изменений
  if (fromUnit === toUnit) {
    return value;
  }

  // Формируем ключ для поиска коэффициента конвертации
  const conversionKey = `${fromUnit}->${toUnit}`;
  const factor = UNIT_CONVERSIONS[conversionKey];

  if (factor === undefined) {
    throw new Error(`Conversion not supported: ${fromUnit} -> ${toUnit}`);
  }

  return value * factor;
}

/**
 * Проверяет, поддерживается ли конвертация между единицами
 * @param fromUnit - исходная единица измерения
 * @param toUnit - целевая единица измерения
 * @returns true, если конвертация поддерживается
 */
export function isConversionSupported(fromUnit: string, toUnit: string): boolean {
  if (fromUnit === toUnit) return true;
  const conversionKey = `${fromUnit}->${toUnit}`;
  return UNIT_CONVERSIONS[conversionKey] !== undefined;
}

/**
 * Получает все поддерживаемые единицы измерения для типа метрики
 * @param dimension - тип метрики (speed, distance, time, etc.)
 * @returns массив поддерживаемых единиц
 */
export function getSupportedUnits(dimension: string): string[] {
  const units = new Set<string>();
  
  Object.keys(UNIT_CONVERSIONS).forEach(key => {
    const [fromUnit] = key.split('->');
    units.add(fromUnit);
  });

  // Добавляем единицы, которые есть только как целевые
  Object.keys(UNIT_CONVERSIONS).forEach(key => {
    const [, toUnit] = key.split('->');
    units.add(toUnit);
  });

  return Array.from(units).sort();
}

/**
 * Получает поддерживаемые единицы для конкретной метрики
 * @param canonicalMetric - каноническая метрика
 * @returns массив поддерживаемых единиц для этой метрики
 */
export function getSupportedUnitsForMetric(canonicalMetric: string): string[] {
  // Используем новую систему групп единиц измерения
  return getAvailableUnitsForMetric(canonicalMetric);
}

/**
 * Специальная обработка для времени в формате hh:mm:ss
 * @param timeString - строка времени в формате hh:mm:ss
 * @param targetUnit - целевая единица измерения
 * @returns значение в целевых единицах
 */
export function convertTimeString(timeString: string, targetUnit: string): number {
  const timeMatch = timeString.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const seconds = parseInt(timeMatch[3]);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  return convertValue(totalSeconds, 's', targetUnit);
}

/**
 * Проверяет, является ли строка временем в формате hh:mm:ss
 * @param value - проверяемое значение
 * @returns true, если это время в формате hh:mm:ss
 */
export function isTimeString(value: any): boolean {
  if (typeof value !== 'string') return false;
  return /^(\d{1,2}):(\d{2}):(\d{2})$/.test(value);
}

/**
 * Получает рекомендуемые единицы по умолчанию для метрики
 * @param canonicalMetric - каноническая метрика
 * @returns объект с рекомендуемыми sourceUnit и displayUnit
 */
export function getRecommendedUnitsForMetric(canonicalMetric: string): { sourceUnit: string; displayUnit: string } {
  return getDefaultUnitsForMetric(canonicalMetric);
}

/**
 * Проверяет, поддерживается ли единица измерения для метрики
 * @param canonicalMetric - каноническая метрика
 * @param unit - единица измерения
 * @returns true, если единица поддерживается
 */
export function isUnitSupportedForMetric(canonicalMetric: string, unit: string): boolean {
  const availableUnits = getAvailableUnitsForMetric(canonicalMetric);
  return availableUnits.includes(unit);
}
