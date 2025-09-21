import { GpsCanonicalMetric, GpsUnit } from '@/types/gps';

// Конвертация единиц измерения
export function convertUnit(
  value: number, 
  fromUnit: string, 
  toUnit: string, 
  units: GpsUnit[]
): number {
  if (fromUnit === toUnit) return value;
  
  const fromUnitData = units.find(u => u.code === fromUnit);
  const toUnitData = units.find(u => u.code === toUnit);
  
  if (!fromUnitData || !toUnitData) {
    console.warn(`Unit conversion not found: ${fromUnit} -> ${toUnit}`);
    return value;
  }
  
  if (fromUnitData.dimension !== toUnitData.dimension) {
    console.warn(`Cannot convert between different dimensions: ${fromUnitData.dimension} -> ${toUnitData.dimension}`);
    return value;
  }
  
  // Конвертируем через каноническую единицу
  const fromFactor = parseFloat(fromUnitData.conversionFactor.toString());
  const toFactor = parseFloat(toUnitData.conversionFactor.toString());
  
  // value * fromFactor = canonicalValue
  // canonicalValue / toFactor = convertedValue
  const canonicalValue = value * fromFactor;
  const convertedValue = canonicalValue / toFactor;
  
  return convertedValue;
}

// Получение единиц измерения для измерения
export function getUnitsByDimension(dimension: string, units: GpsUnit[]): GpsUnit[] {
  return units.filter(unit => unit.dimension === dimension);
}

// Получение канонических метрик по категории
export function getMetricsByCategory(category: string, metrics: GpsCanonicalMetric[]): GpsCanonicalMetric[] {
  return metrics.filter(metric => metric.category === category);
}

// Группировка метрик по категориям
export function groupMetricsByCategory(metrics: GpsCanonicalMetric[]): Record<string, GpsCanonicalMetric[]> {
  return metrics.reduce((acc, metric) => {
    const category = metric.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(metric);
    return acc;
  }, {} as Record<string, GpsCanonicalMetric[]>);
}

// Группировка единиц по измерениям
export function groupUnitsByDimension(units: GpsUnit[]): Record<string, GpsUnit[]> {
  return units.reduce((acc, unit) => {
    if (!acc[unit.dimension]) {
      acc[unit.dimension] = [];
    }
    acc[unit.dimension].push(unit);
    return acc;
  }, {} as Record<string, GpsUnit[]>);
}

// Валидация данных игрока
export function validatePlayerData(
  data: Record<string, { value: number; unit: string }>,
  metrics: GpsCanonicalMetric[],
  units: GpsUnit[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [metricCode, metricData] of Object.entries(data)) {
    const metric = metrics.find(m => m.code === metricCode);
    if (!metric) {
      errors.push(`Unknown metric: ${metricCode}`);
      continue;
    }
    
    if (typeof metricData.value !== 'number' || isNaN(metricData.value)) {
      errors.push(`Invalid value for ${metricCode}: ${metricData.value}`);
      continue;
    }
    
    if (!metricData.unit) {
      errors.push(`Missing unit for ${metricCode}`);
      continue;
    }
    
    const unit = units.find(u => u.code === metricData.unit);
    if (!unit) {
      errors.push(`Unknown unit: ${metricData.unit}`);
      continue;
    }
    
    if (unit.dimension !== metric.dimension) {
      errors.push(`Unit ${metricData.unit} is not compatible with metric ${metricCode} (${metric.dimension})`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Форматирование значений для отображения
export function formatValue(value: number, unit: string, precision: number = 2): string {
  if (isNaN(value) || !isFinite(value)) {
    return 'N/A';
  }
  
  const formatted = value.toFixed(precision);
  return `${formatted} ${unit}`;
}

// Получение цвета для значения на основе сравнения
export function getComparisonColor(percentage: number): string {
  const absPercentage = Math.abs(percentage);
  
  if (absPercentage < 5) return 'text-gray-400'; // Нейтральный
  if (absPercentage < 15) {
    return percentage > 0 ? 'text-yellow-400' : 'text-orange-400'; // Умеренное отклонение
  }
  return percentage > 0 ? 'text-green-400' : 'text-red-400'; // Сильное отклонение
}

// Вычисление статистики для данных
export function calculateStatistics(data: number[]): {
  min: number;
  max: number;
  avg: number;
  median: number;
  count: number;
} {
  if (data.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, count: 0 };
  }
  
  const sortedData = [...data].sort((a, b) => a - b);
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
  
  const mid = Math.floor(sortedData.length / 2);
  const median = sortedData.length % 2 === 0
    ? (sortedData[mid - 1] + sortedData[mid]) / 2
    : sortedData[mid];
  
  return { min, max, avg, median, count: data.length };
}

// Создание предложений для маппинга столбцов
export function suggestColumnMapping(
  sourceColumn: string,
  metrics: GpsCanonicalMetric[]
): { metric: GpsCanonicalMetric | null; confidence: number } {
  const normalizedColumn = sourceColumn.toLowerCase().trim();
  
  // Словарь для сопоставления названий столбцов с каноническими метриками
  const columnMappings: Record<string, { metricCode: string; confidence: number }> = {
    // Distance columns
    'total_distance': { metricCode: 'total_distance', confidence: 0.9 },
    'total distance': { metricCode: 'total_distance', confidence: 0.9 },
    'distance': { metricCode: 'total_distance', confidence: 0.8 },
    'sprint_distance': { metricCode: 'sprint_distance', confidence: 0.9 },
    'sprint distance': { metricCode: 'sprint_distance', confidence: 0.9 },
    'high_speed_distance': { metricCode: 'hsr_distance', confidence: 0.9 },
    'high speed distance': { metricCode: 'hsr_distance', confidence: 0.9 },
    
    // Speed columns
    'max_speed': { metricCode: 'max_speed', confidence: 0.9 },
    'max speed': { metricCode: 'max_speed', confidence: 0.9 },
    'top_speed': { metricCode: 'max_speed', confidence: 0.8 },
    'avg_speed': { metricCode: 'avg_speed', confidence: 0.9 },
    'average_speed': { metricCode: 'avg_speed', confidence: 0.8 },
    'average speed': { metricCode: 'avg_speed', confidence: 0.8 },
    
    // Heart rate columns
    'avg_hr': { metricCode: 'avg_heart_rate', confidence: 0.9 },
    'avg_heart_rate': { metricCode: 'avg_heart_rate', confidence: 0.9 },
    'average_heart_rate': { metricCode: 'avg_heart_rate', confidence: 0.9 },
    'average heart rate': { metricCode: 'avg_heart_rate', confidence: 0.9 },
    'max_hr': { metricCode: 'max_heart_rate', confidence: 0.9 },
    'max_heart_rate': { metricCode: 'max_heart_rate', confidence: 0.9 },
    'max heart rate': { metricCode: 'max_heart_rate', confidence: 0.9 },
    'min_hr': { metricCode: 'min_heart_rate', confidence: 0.9 },
    'min_heart_rate': { metricCode: 'min_heart_rate', confidence: 0.9 },
    'min heart rate': { metricCode: 'min_heart_rate', confidence: 0.9 },
    
    // Time columns
    'time_on_field': { metricCode: 'duration', confidence: 0.9 },
    'time on field': { metricCode: 'duration', confidence: 0.9 },
    'duration': { metricCode: 'duration', confidence: 0.8 },
    'sprint_time': { metricCode: 'sprint_time', confidence: 0.9 },
    'sprint time': { metricCode: 'sprint_time', confidence: 0.9 },
    'high_speed_time': { metricCode: 'hsr_time', confidence: 0.9 },
    'high speed time': { metricCode: 'hsr_time', confidence: 0.9 },
    
    // Load columns
    'total_load': { metricCode: 'total_load', confidence: 0.9 },
    'total load': { metricCode: 'total_load', confidence: 0.9 },
    'load': { metricCode: 'total_load', confidence: 0.8 },
    'avg_load': { metricCode: 'avg_load', confidence: 0.9 },
    'average_load': { metricCode: 'avg_load', confidence: 0.8 },
    'average load': { metricCode: 'avg_load', confidence: 0.8 },
    
    // Count columns
    'sprint_count': { metricCode: 'sprint_count', confidence: 0.9 },
    'sprint count': { metricCode: 'sprint_count', confidence: 0.9 },
    'sprints': { metricCode: 'sprint_count', confidence: 0.8 },
    
    // Acceleration columns
    'max_acceleration': { metricCode: 'max_acceleration', confidence: 0.9 },
    'max acceleration': { metricCode: 'max_acceleration', confidence: 0.9 },
    'max_deceleration': { metricCode: 'max_deceleration', confidence: 0.9 },
    'max deceleration': { metricCode: 'max_deceleration', confidence: 0.9 }
  };
  
  const mapping = columnMappings[normalizedColumn];
  if (!mapping) {
    return { metric: null, confidence: 0 };
  }
  
  const metric = metrics.find(m => m.code === mapping.metricCode);
  return { metric: metric || null, confidence: mapping.confidence };
}
