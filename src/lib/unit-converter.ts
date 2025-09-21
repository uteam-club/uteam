/**
 * Утилита для конвертации единиц измерения GPS данных
 */

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
}

// Таблица конвертации единиц измерения
const CONVERSION_TABLE: Record<string, Record<string, number>> = {
  // Расстояние
  'm': {
    'km': 0.001,
    'miles': 0.000621371,
    'yards': 1.09361,
    'feet': 3.28084,
    'yd': 1.09361,
  },
  'km': {
    'm': 1000,
    'miles': 0.621371,
    'yards': 1093.61,
    'feet': 3280.84,
    'yd': 1093.61,
  },
  'miles': {
    'm': 1609.34,
    'km': 1.60934,
    'yards': 1760,
    'feet': 5280,
    'yd': 1760,
  },
  'yards': {
    'm': 0.9144,
    'km': 0.0009144,
    'miles': 0.000568182,
    'feet': 3,
    'yd': 1,
  },
  'feet': {
    'm': 0.3048,
    'km': 0.0003048,
    'miles': 0.000189394,
    'yards': 0.333333,
    'yd': 0.333333,
  },
  'yd': {
    'm': 0.9144,
    'km': 0.0009144,
    'miles': 0.000568182,
    'yards': 1,
    'feet': 3,
  },

  // Скорость
  'm/s': {
    'km/h': 3.6,
    'mph': 2.23694,
    'knots': 1.94384,
    'm/min': 60,
  },
  'km/h': {
    'm/s': 0.277778,
    'mph': 0.621371,
    'knots': 0.539957,
    'm/min': 16.6667,
  },
  'mph': {
    'm/s': 0.44704,
    'km/h': 1.60934,
    'knots': 0.868976,
    'm/min': 26.8224,
  },
  'knots': {
    'm/s': 0.514444,
    'km/h': 1.852,
    'mph': 1.15078,
    'm/min': 30.8667,
  },
  'm/min': {
    'm/s': 0.0166667,
    'km/h': 0.06,
    'mph': 0.0372823,
    'knots': 0.0323974,
  },

  // Время
  's': {
    'min': 0.0166667,
    'h': 0.000277778,
    'ms': 1000,
    'hh:mm': 0.000277778,
    'hh:mm:ss': 0.000277778,
    'mm:ss': 0.0166667,
    'ss': 1,
    'hh.mm.ss': 0.000277778,
    'hh,mm,ss': 0.000277778,
    'hh mm ss': 0.000277778,
    'hh.mm': 0.000277778,
    'mm.ss': 0.0166667,
    'hh:mm:ss.fff': 0.000277778,
    'hh:mm:ss,fff': 0.000277778,
  },
  'min': {
    's': 60,
    'h': 0.0166667,
    'ms': 60000,
    'hh:mm': 1/60,
    'hh:mm:ss': 1/60,
  },
  'h': {
    's': 3600,
    'min': 60,
    'ms': 3600000,
    'hh:mm': 1,
    'hh:mm:ss': 1,
  },
  'ms': {
    's': 0.001,
    'min': 0.0000166667,
    'h': 0.000000277778,
    'hh:mm': 0.000000277778,
    'hh:mm:ss': 0.000000277778,
  },
  'hh:mm': {
    's': 3600, // Будет обработано специальной логикой
    'min': 60,
    'h': 1,
    'ms': 3600000,
    'hh:mm:ss': 1,
    'mm:ss': 60,
    'ss': 3600,
    'hh.mm.ss': 1,
    'hh,mm,ss': 1,
    'hh mm ss': 1,
    'hh.mm': 1,
    'mm.ss': 60,
    'hh:mm:ss.fff': 1,
    'hh:mm:ss,fff': 1,
  },
  'hh:mm:ss': {
    's': 3600, // Будет обработано специальной логикой
    'min': 60,
    'h': 1,
    'ms': 3600000,
    'hh:mm': 1,
    'mm:ss': 60,
    'ss': 3600,
    'hh.mm.ss': 1,
    'hh,mm,ss': 1,
    'hh mm ss': 1,
    'hh.mm': 1,
    'mm.ss': 60,
    'hh:mm:ss.fff': 1,
    'hh:mm:ss,fff': 1,
  },
  'mm:ss': {
    's': 60, // Будет обработано специальной логикой
    'min': 1,
    'h': 0.0166667,
    'ms': 60000,
    'hh:mm': 0.0166667,
    'hh:mm:ss': 0.0166667,
    'ss': 60,
    'hh.mm.ss': 0.0166667,
    'hh,mm,ss': 0.0166667,
    'hh mm ss': 0.0166667,
    'hh.mm': 0.0166667,
    'mm.ss': 1,
    'hh:mm:ss.fff': 0.0166667,
    'hh:mm:ss,fff': 0.0166667,
  },
  'ss': {
    's': 1,
    'min': 0.0166667,
    'h': 0.000277778,
    'ms': 1000,
    'hh:mm': 0.000277778,
    'hh:mm:ss': 0.000277778,
    'mm:ss': 0.0166667,
    'hh.mm.ss': 0.000277778,
    'hh,mm,ss': 0.000277778,
    'hh mm ss': 0.000277778,
    'hh.mm': 0.000277778,
    'mm.ss': 0.0166667,
    'hh:mm:ss.fff': 0.000277778,
    'hh:mm:ss,fff': 0.000277778,
  },
  'hh.mm.ss': {
    's': 3600, // Будет обработано специальной логикой
    'min': 60,
    'h': 1,
    'ms': 3600000,
    'hh:mm': 1,
    'hh:mm:ss': 1,
    'mm:ss': 60,
    'ss': 3600,
    'hh,mm,ss': 1,
    'hh mm ss': 1,
    'hh.mm': 1,
    'mm.ss': 60,
    'hh:mm:ss.fff': 1,
    'hh:mm:ss,fff': 1,
  },
  'hh,mm,ss': {
    's': 3600, // Будет обработано специальной логикой
    'min': 60,
    'h': 1,
    'ms': 3600000,
    'hh:mm': 1,
    'hh:mm:ss': 1,
    'mm:ss': 60,
    'ss': 3600,
    'hh.mm.ss': 1,
    'hh mm ss': 1,
    'hh.mm': 1,
    'mm.ss': 60,
    'hh:mm:ss.fff': 1,
    'hh:mm:ss,fff': 1,
  },
  'hh mm ss': {
    's': 3600, // Будет обработано специальной логикой
    'min': 60,
    'h': 1,
    'ms': 3600000,
    'hh:mm': 1,
    'hh:mm:ss': 1,
    'mm:ss': 60,
    'ss': 3600,
    'hh.mm.ss': 1,
    'hh,mm,ss': 1,
    'hh.mm': 1,
    'mm.ss': 60,
    'hh:mm:ss.fff': 1,
    'hh:mm:ss,fff': 1,
  },
  'hh.mm': {
    's': 3600, // Будет обработано специальной логикой
    'min': 60,
    'h': 1,
    'ms': 3600000,
    'hh:mm': 1,
    'hh:mm:ss': 1,
    'mm:ss': 60,
    'ss': 3600,
    'hh.mm.ss': 1,
    'hh,mm,ss': 1,
    'hh mm ss': 1,
    'mm.ss': 60,
    'hh:mm:ss.fff': 1,
    'hh:mm:ss,fff': 1,
  },
  'mm.ss': {
    's': 60, // Будет обработано специальной логикой
    'min': 1,
    'h': 0.0166667,
    'ms': 60000,
    'hh:mm': 0.0166667,
    'hh:mm:ss': 0.0166667,
    'mm:ss': 1,
    'ss': 60,
    'hh.mm.ss': 0.0166667,
    'hh,mm,ss': 0.0166667,
    'hh mm ss': 0.0166667,
    'hh.mm': 0.0166667,
    'hh:mm:ss.fff': 0.0166667,
    'hh:mm:ss,fff': 0.0166667,
  },
  'hh:mm:ss.fff': {
    's': 3600, // Будет обработано специальной логикой
    'min': 60,
    'h': 1,
    'ms': 3600000,
    'hh:mm': 1,
    'hh:mm:ss': 1,
    'mm:ss': 60,
    'ss': 3600,
    'hh.mm.ss': 1,
    'hh,mm,ss': 1,
    'hh mm ss': 1,
    'hh.mm': 1,
    'mm.ss': 60,
    'hh:mm:ss,fff': 1,
  },
  'hh:mm:ss,fff': {
    's': 3600, // Будет обработано специальной логикой
    'min': 60,
    'h': 1,
    'ms': 3600000,
    'hh:mm': 1,
    'hh:mm:ss': 1,
    'mm:ss': 60,
    'ss': 3600,
    'hh.mm.ss': 1,
    'hh,mm,ss': 1,
    'hh mm ss': 1,
    'hh.mm': 1,
    'mm.ss': 60,
    'hh:mm:ss.fff': 1,
  },

  // Частота пульса
  'bpm': {
    'bpm': 1,
    '%HRmax': 1, // Нет прямой конвертации, но можно использовать как есть
  },
  '%HRmax': {
    'bpm': 1, // Нет прямой конвертации, но можно использовать как есть
    '%HRmax': 1,
  },

  // Количество (все единицы эквивалентны)
  'count': {
    'count': 1,
    'times': 1,
    'sprints': 1,
  },
  'times': {
    'count': 1,
    'times': 1,
    'sprints': 1,
  },
  'sprints': {
    'count': 1,
    'times': 1,
    'sprints': 1,
  },
  
  // Проценты и соотношения
  '%': {
    '%': 1,
    'ratio': 0.01, // 1% = 0.01 ratio
  },
  'ratio': {
    '%': 100, // 1 ratio = 100%
    'ratio': 1,
  },
  
  // Ускорение
  'm/s^2': {
    'm/s^2': 1,
    'g': 0.101972, // 1 m/s² = 0.101972 g
  },
  'g': {
    'm/s^2': 9.80665, // 1 g = 9.80665 m/s²
    'g': 1,
  },
  
  // Нагрузка (без конвертации)
  'AU': {
    'AU': 1,
  },
  
  // Мощность на массу (без конвертации)
  'W/kg': {
    'W/kg': 1,
  },
  
  // Идентичность (без конвертации)
  'string': {
    'string': 1,
  },
};

/**
 * Форматирует секунды в различные форматы времени
 */
function formatTimeFromSeconds(seconds: number, format: string): string {
  const totalSeconds = Math.floor(seconds);
  const milliseconds = Math.round((seconds - totalSeconds) * 1000);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  const pad = (num: number) => num.toString().padStart(2, '0');
  const pad3 = (num: number) => num.toString().padStart(3, '0');
  
  switch (format) {
    case 'hh:mm:ss':
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    case 'hh:mm':
      return `${pad(hours)}:${pad(minutes)}`;
    case 'mm:ss':
      // Если минуты больше 59, показываем как часы:минуты:секунды
      if (minutes >= 60) {
        const totalHours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${pad(totalHours)}:${pad(remainingMinutes)}:${pad(secs)}`;
      }
      return `${pad(minutes)}:${pad(secs)}`;
    case 'ss':
      return `${totalSeconds}`;
    case 'hh.mm.ss':
      return `${pad(hours)}.${pad(minutes)}.${pad(secs)}`;
    case 'hh,mm,ss':
      return `${pad(hours)},${pad(minutes)},${pad(secs)}`;
    case 'hh mm ss':
      return `${pad(hours)} ${pad(minutes)} ${pad(secs)}`;
    case 'hh.mm':
      return `${pad(hours)}.${pad(minutes)}`;
    case 'mm.ss':
      return `${pad(minutes)}.${pad(secs)}`;
    case 'hh:mm:ss.fff':
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad3(milliseconds)}`;
    case 'hh:mm:ss,fff':
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad3(milliseconds)}`;
    default:
      return seconds.toString();
  }
}

/**
 * Парсит время в различных форматах в секунды
 * Поддерживаемые форматы:
 * - hh:mm:ss (01:19:22)
 * - hh:mm (01:19)
 * - mm:ss (19:22)
 * - ss (22)
 * - hh.mm.ss (01.19.22)
 * - hh,mm,ss (01,19,22)
 * - hh mm ss (01 19 22)
 * - hh.mm (01.19)
 * - mm.ss (19.22)
 * - hh:mm:ss.fff (01:19:22.500) - с миллисекундами
 * - hh:mm:ss,fff (01:19:22,500) - с миллисекундами (европейский формат)
 * - Числовые значения (в секундах, минутах или часах)
 */
function parseTimeToSeconds(timeStr: string | number, expectedFormat?: string): number {
  // Если это уже число, считаем что это секунды
  if (typeof timeStr === 'number') {
    return timeStr;
  }

  const str = String(timeStr).trim();
  
  // Если пустая строка
  if (!str) {
    return NaN;
  }

  // Пробуем распарсить как число только если строка не содержит разделителей времени
  const hasTimeSeparators = /[:.,\s]/.test(str);
  if (!hasTimeSeparators) {
    const numericValue = parseFloat(str);
    if (!isNaN(numericValue)) {
      // Если число меньше 100, считаем что это секунды
      if (numericValue < 100 && numericValue > 0) {
        return numericValue; // секунды
      }
      // Если число больше 10000, считаем что это секунды
      if (numericValue > 10000) {
        return numericValue; // уже в секундах
      }
      // Иначе считаем что это секунды
      return numericValue;
    }
  }

  // Различные разделители
  const separators = [':', '.', ',', ' '];
  let parts: string[] = [];
  let separator = '';

  for (const sep of separators) {
    if (str.includes(sep)) {
      parts = str.split(sep);
      separator = sep;
      break;
    }
  }

  // Если нет разделителей, пробуем как число
  if (parts.length === 0) {
    return parseFloat(str) || NaN;
  }

  // Обработка миллисекунд
  let milliseconds = 0;
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    if (lastPart.includes('.') || lastPart.includes(',')) {
      const decimalParts = lastPart.split(/[.,]/);
      if (decimalParts.length === 2) {
        parts[parts.length - 1] = decimalParts[0];
        milliseconds = parseFloat('0.' + decimalParts[1]) * 1000;
      }
    }
  }

  // Конвертируем части в числа
  const numericParts = parts.map(part => parseInt(part, 10));
  
  // Проверяем, что все части - валидные числа
  if (numericParts.some(isNaN)) {
    return NaN;
  }

  // Определяем формат по количеству частей
  if (parts.length === 3) {
    // hh:mm:ss
    const [first, second, third] = numericParts;
    return first * 3600 + second * 60 + third + milliseconds / 1000;
  } else if (parts.length === 2) {
    // hh:mm или mm:ss
    const [first, second] = numericParts;
    
    // Если указан ожидаемый формат, используем его
    if (expectedFormat === 'mm:ss') {
      return first * 60 + second + milliseconds / 1000;
    } else if (expectedFormat === 'hh:mm') {
      return first * 3600 + second * 60 + milliseconds / 1000;
    }
    
    // Если первое число больше 23, считаем что это mm:ss
    if (first > 23) {
      return first * 60 + second + milliseconds / 1000;
    }
    
    // Если второе число больше 59, считаем что это mm:ss
    if (second > 59) {
      return first * 60 + second + milliseconds / 1000;
    }
    
    // Иначе считаем что это hh:mm
    return first * 3600 + second * 60 + milliseconds / 1000;
  } else if (parts.length === 1) {
    // ss - только секунды
    const value = numericParts[0];
    return value + milliseconds / 1000;
  }

  return NaN;
}

/**
 * Конвертирует значение из одной единицы измерения в другую
 */
export function convertUnit(value: number | string, fromUnit: string, toUnit: string): number | string {
  if (fromUnit === toUnit) {
    return value;
  }

  // Специальная обработка для строковых единиц (идентичность)
  if (fromUnit === 'string' && toUnit === 'string') {
    return value;
  }

  // Специальная обработка для времени в различных форматах
  const timeFormats = ['hh:mm:ss', 'hh:mm', 'mm:ss', 'ss', 'hh.mm.ss', 'hh,mm,ss', 'hh mm ss', 'hh.mm', 'mm.ss', 'hh:mm:ss.fff', 'hh:mm:ss,fff'];
  
  if (timeFormats.includes(fromUnit)) {
    // Если конвертируем в другой формат времени, используем специальную логику
    if (timeFormats.includes(toUnit)) {
      const seconds = parseTimeToSeconds(value, fromUnit);
      if (isNaN(seconds)) {
        console.warn(`Invalid time format: ${value} for unit: ${fromUnit}`);
        return NaN;
      }
      return formatTimeFromSeconds(seconds, toUnit);
    } else {
      // Конвертируем в базовые единицы (s, min, h, ms)
      const seconds = parseTimeToSeconds(value, fromUnit);
      if (isNaN(seconds)) {
        console.warn(`Invalid time format: ${value} for unit: ${fromUnit}`);
        return NaN;
      }
      
      // Специальная обработка для конвертации в секунды
      if (toUnit === 's') {
        return seconds;
      }
      
      const conversionFactor = CONVERSION_TABLE['s']?.[toUnit];
      if (conversionFactor === undefined) {
        console.warn(`Conversion from s to ${toUnit} is not supported`);
        return NaN;
      }
      return seconds * conversionFactor;
    }
  }

  // Специальная обработка для конвертации в форматы времени
  if (timeFormats.includes(toUnit)) {
    return formatTimeFromSeconds(Number(value), toUnit);
  }

  const conversionFactor = CONVERSION_TABLE[fromUnit]?.[toUnit];
  if (conversionFactor === undefined) {
    console.warn(`Conversion from ${fromUnit} to ${toUnit} is not supported`);
    return NaN; // Возвращаем NaN для неподдерживаемых конвертаций
  }

  return Number(value) * conversionFactor;
}

/**
 * Получает все поддерживаемые единицы измерения для данной размерности
 */
export function getSupportedUnits(dimension: string): string[] {
  const dimensionUnits: Record<string, string[]> = {
    'distance': ['m', 'km', 'miles', 'yards', 'feet'],
    'speed': ['m/s', 'km/h', 'mph', 'knots'],
    'time': ['s', 'min', 'h', 'ms'],
    'frequency': ['bpm'],
    'count': ['count', 'times', 'sprints'],
  };

  return dimensionUnits[dimension] || [];
}

/**
 * Проверяет, поддерживается ли конвертация между единицами
 */
export function isConversionSupported(fromUnit: string, toUnit: string): boolean {
  if (fromUnit === toUnit) return true;
  
  // Специальная обработка для форматов времени
  const timeFormats = ['hh:mm:ss', 'hh:mm', 'mm:ss', 'ss', 'hh.mm.ss', 'hh,mm,ss', 'hh mm ss', 'hh.mm', 'mm.ss', 'hh:mm:ss.fff', 'hh:mm:ss,fff'];
  
  if (timeFormats.includes(fromUnit)) {
    // Если конвертируем в другой формат времени, всегда поддерживается
    if (timeFormats.includes(toUnit)) {
      return true;
    }
    // Если конвертируем в базовые единицы, проверяем поддержку
    // Специальная обработка для секунд
    if (toUnit === 's') {
      return true;
    }
    return CONVERSION_TABLE['s']?.[toUnit] !== undefined;
  }
  
  return CONVERSION_TABLE[fromUnit]?.[toUnit] !== undefined;
}

/**
 * Форматирует значение с единицей измерения
 */
export function formatValue(value: number | string | null | undefined, unit: string, precision: number = 2): string {
  // Обрабатываем null, undefined и нечисловые значения
  if (value === null || value === undefined || value === '') {
    return `— ${unit}`;
  }
  
  // Если это строка, возвращаем как есть
  if (typeof value === 'string') {
    return `${value} ${unit}`;
  }
  
  // Если это не число, возвращаем как есть
  if (isNaN(value)) {
    return `${value} ${unit}`;
  }
  
  const formattedValue = value.toFixed(precision);
  
  // Убираем лишние нули после запятой
  const cleanValue = parseFloat(formattedValue).toString();
  
  return `${cleanValue} ${unit}`;
}

/**
 * Форматирует только числовое значение без единиц измерения
 */
export function formatValueOnly(value: number | string | null | undefined, precision: number = 2): string {
  // Обрабатываем null, undefined и нечисловые значения
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  
  // Если это строка, возвращаем как есть
  if (typeof value === 'string') {
    return value;
  }
  
  // Если это не число, возвращаем как есть
  if (isNaN(value)) {
    return String(value);
  }
  
  // Для precision = 0 (целые числа) используем Math.round
  if (precision === 0) {
    return Math.round(value).toString();
  }
  
  const formattedValue = value.toFixed(precision);
  
  // Убираем лишние нули после запятой
  const cleanValue = parseFloat(formattedValue).toString();
  
  return cleanValue;
}

/**
 * Получает рекомендуемую точность для единицы измерения
 */
export function getPrecision(unit: string): number {
  const precisionMap: Record<string, number> = {
    'm': 0,
    'km': 2,
    'miles': 2,
    'yards': 1,
    'feet': 1,
    'm/s': 1,
    'km/h': 1,
    'mph': 1,
    'knots': 1,
    's': 0,
    'min': 0, // Целые минуты без десятичных
    'h': 2,
    'bpm': 0,
    'count': 0,
    'times': 0,
    'sprints': 0,
  };

  return precisionMap[unit] ?? 2;
}

/**
 * Тестирует парсинг времени в различных форматах
 * Для отладки и проверки корректности работы парсера
 */
export function testTimeParsing(): void {
  const testCases = [
    // Стандартные форматы
    { input: '01:19:22', expected: 4752, description: 'hh:mm:ss' },
    { input: '01:19', expected: 4740, description: 'hh:mm' },
    { input: '19:22', expected: 1162, description: 'mm:ss' },
    { input: '22', expected: 22, description: 'ss' },
    
    // Альтернативные разделители
    { input: '01.19.22', expected: 4752, description: 'hh.mm.ss' },
    { input: '01,19,22', expected: 4752, description: 'hh,mm,ss' },
    { input: '01 19 22', expected: 4752, description: 'hh mm ss' },
    { input: '01.19', expected: 4740, description: 'hh.mm' },
    { input: '19.22', expected: 1162, description: 'mm.ss' },
    
    // С миллисекундами
    { input: '01:19:22.500', expected: 4752.5, description: 'hh:mm:ss.fff' },
    { input: '01:19:22,500', expected: 4752.5, description: 'hh:mm:ss,fff' },
    
    // Числовые значения
    { input: 4752, expected: 4752, description: 'number (seconds)' },
    { input: '4752', expected: 4752, description: 'string number (seconds)' },
    { input: '79', expected: 4740, description: 'string number (minutes)' },
    { input: '22', expected: 22, description: 'string number (seconds < 60)' },
    
    // Граничные случаи
    { input: '', expected: NaN, description: 'empty string' },
    { input: 'invalid', expected: NaN, description: 'invalid string' },
    { input: '25:70:80', expected: 95080, description: 'invalid time but parseable' },
  ];

  console.log('Testing time parsing...');
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = parseTimeToSeconds(testCase.input);
    const isPassed = (isNaN(testCase.expected) && isNaN(result)) || 
                     (Math.abs(result - testCase.expected) < 0.001);
    
    if (isPassed) {
      passed++;
      console.log(`✅ ${testCase.description}: "${testCase.input}" -> ${result}`);
    } else {
      failed++;
      console.log(`❌ ${testCase.description}: "${testCase.input}" -> ${result}, expected: ${testCase.expected}`);
    }
  }

  console.log(`\nTest results: ${passed} passed, ${failed} failed`);
}
