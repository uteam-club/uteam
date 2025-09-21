import { db } from '@/lib/db';
import { gpsCanonicalMetric, gpsUnit } from '@/db/schema/gpsCanonicalMetric';
import { eq } from 'drizzle-orm';
import { GpsCanonicalMetric, GpsUnit } from '@/types/gps';

// Unit conversion factors to base units
export const UNIT_FACTORS = {
  distance: { m: 1, km: 1000, yd: 0.9144 },
  time: { s: 1, min: 60, h: 3600, 'hh:mm': 3600, 'hh:mm:ss': 1 },
  speed: { 'm/s': 1, 'km/h': 0.2777777778, 'm/min': 0.0166666667, 'mph': 0.44704 },
  acceleration: { 'm/s^2': 1, g: 9.80665 },
  heart_rate: { bpm: 1, '%HRmax': 1 }, // Восстановили - есть в реестре
  power_mass_norm: { 'W/kg': 1 },
  load: { AU: 1 },
  count: { count: 1 },
  ratio: { ratio: 1, '%': 0.01 },
  identity: { string: 1 }
} as const;

// Base unit for each dimension - REMOVED: теперь берется из JSON метрик

// Track warnings to avoid spam
const warnedUnits = new Set<string>();

/**
 * Get all canonical metrics
 */
export async function getAllCanonicalMetrics(): Promise<GpsCanonicalMetric[]> {
  try {
    const metrics = await db
      .select()
      .from(gpsCanonicalMetric)
      .where(eq(gpsCanonicalMetric.isActive, true))
      .orderBy(gpsCanonicalMetric.category, gpsCanonicalMetric.name);
    
    return metrics.map(metric => ({
      ...metric,
      supportedUnits: metric.supportedUnits as string[] || []
    }));
  } catch (error) {
    console.error('Error fetching canonical metrics:', error);
    return [];
  }
}

/**
 * Get canonical metric by code
 */
export async function getCanonicalMetricByCode(code: string): Promise<GpsCanonicalMetric | null> {
  try {
    const metrics = await db
      .select()
      .from(gpsCanonicalMetric)
      .where(eq(gpsCanonicalMetric.code, code))
      .limit(1);
    
    if (metrics.length === 0) return null;
    
    return {
      ...metrics[0],
      supportedUnits: metrics[0].supportedUnits as string[] || []
    };
  } catch (error) {
    console.error('Error fetching canonical metric by code:', error);
    return null;
  }
}

/**
 * Get canonical metrics by category
 */
export async function getCanonicalMetricsByCategory(category: string): Promise<GpsCanonicalMetric[]> {
  try {
    const metrics = await db
      .select()
      .from(gpsCanonicalMetric)
      .where(eq(gpsCanonicalMetric.category, category))
      .orderBy(gpsCanonicalMetric.name);
    
    return metrics.map(metric => ({
      ...metric,
      supportedUnits: metric.supportedUnits as string[] || []
    }));
  } catch (error) {
    console.error('Error fetching canonical metrics by category:', error);
    return [];
  }
}

/**
 * Get all units
 */
export async function getAllUnits(): Promise<GpsUnit[]> {
  try {
    const units = await db
      .select()
      .from(gpsUnit)
      .where(eq(gpsUnit.isActive, true))
      .orderBy(gpsUnit.dimension, gpsUnit.name);
    
    return units.map(unit => ({
      ...unit,
      conversionFactor: parseFloat(unit.conversionFactor.toString())
    }));
  } catch (error) {
    console.error('Error fetching units:', error);
    return [];
  }
}

/**
 * Get units by dimension
 */
export async function getUnitsByDimension(dimension: string): Promise<GpsUnit[]> {
  try {
    const units = await db
      .select()
      .from(gpsUnit)
      .where(eq(gpsUnit.dimension, dimension))
      .orderBy(gpsUnit.name);
    
    return units.map(unit => ({
      ...unit,
      conversionFactor: parseFloat(unit.conversionFactor.toString())
    }));
  } catch (error) {
    console.error('Error fetching units by dimension:', error);
    return [];
  }
}

/**
 * Convert value between units using universal conversion through base unit
 */
export function convertValue(value: number, fromUnit: string, toUnit: string, dimension: keyof typeof UNIT_FACTORS): number {
  if (fromUnit === toUnit) return value;
  
  const table = UNIT_FACTORS[dimension];
  if (!table || !table[fromUnit as keyof typeof table] || !table[toUnit as keyof typeof table]) {
    throw new Error(`[convertValue] Unsupported unit for ${dimension}: ${fromUnit} -> ${toUnit}`);
  }
  
  // Convert to base unit, then to target unit
  const base = value * table[fromUnit as keyof typeof table];  // -> base unit
  const result = base / table[toUnit as keyof typeof table];   // base -> target
  return result;
}

/**
 * Convert value to canonical unit
 */
export async function convertToCanonicalUnit(value: number, unit: string, dimension: string): Promise<number> {
  try {
    // Получаем каноническую единицу для измерения из БД
    const units = await getUnitsByDimension(dimension);
    const canonicalUnit = units.find(u => u.code === unit);
    
    if (!canonicalUnit) {
      console.warn(`[convertToCanonicalUnit] No canonical unit found for dimension: ${dimension}`);
      return value;
    }
    
    if (unit === canonicalUnit.code) return value;

    return convertValue(value, unit, canonicalUnit.code, dimension as keyof typeof UNIT_FACTORS);
  } catch (error) {
    console.error('Error converting to canonical unit:', error);
    return value;
  }
}

/**
 * Get display unit for a metric
 */
export async function getDisplayUnit(metricCode: string, preferredUnit?: string): Promise<string> {
  const metric = await getCanonicalMetricByCode(metricCode);
  if (!metric) return preferredUnit || '';

  // If preferred unit is provided and is supported, use it
  if (preferredUnit && metric.supportedUnits.includes(preferredUnit)) {
    return preferredUnit;
  }

  // Otherwise use the metric's canonical unit
  return metric.canonicalUnit;
}

/**
 * Format value with appropriate unit
 */
export async function formatMetricValue(value: number, metricCode: string, unit?: string): Promise<string> {
  const metric = await getCanonicalMetricByCode(metricCode);
  if (!metric) return `${value} ${unit || ''}`;

  const dimension = metric.dimension as keyof typeof UNIT_FACTORS;
  const displayUnit = await getDisplayUnit(metricCode, unit);
  
  // Special handling for identity (string) values
  if (dimension === 'identity') {
    return String(value);
  }

  // Handle %HRmax warning
  if (displayUnit === '%HRmax') {
    if (!warnedUnits.has('%HRmax')) {
      console.warn('%HRmax requires HRmax context; falling back to bpm');
      warnedUnits.add('%HRmax');
    }
    // Convert to bpm for display
    const bpmValue = convertValue(value, unit || 'bpm', 'bpm', dimension);
    return `${Math.round(bpmValue)} bpm`;
  }

  // Convert to display unit if needed
  let convertedValue = value;
  if (unit && unit !== displayUnit) {
    try {
      convertedValue = convertValue(value, unit, displayUnit, dimension);
    } catch (error) {
      console.warn(`[formatMetricValue] Conversion failed: ${error}`);
      convertedValue = value;
    }
  }

  // Format based on unit type without units
  switch (displayUnit) {
    case 'bpm':
    case 'count':
      return `${Math.round(convertedValue)}`;
    case 'm':
      return `${Math.round(convertedValue)}`;
    case 'km':
      return `${convertedValue.toFixed(2)}`;
    case 'yd':
      return `${convertedValue.toFixed(1)}`;
    case 'min':
      return `${Math.round(convertedValue)}`;
    case 'hh:mm':
      // Конвертируем часы в формат hh:mm
      const totalMinutes = Math.round(convertedValue * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    case 'm/s':
      return `${convertedValue.toFixed(2)}`;
    case 'km/h':
      return `${convertedValue.toFixed(1)}`;
    case 'm/min':
      return `${convertedValue.toFixed(1)}`;
    case 'mph':
      return `${convertedValue.toFixed(1)}`;
    case 'm/s^2':
      return `${convertedValue.toFixed(2)}`;
    case 'g':
      return `${convertedValue.toFixed(2)}`;
    case '%':
      return `${convertedValue.toFixed(1)}`;
    case 'ratio':
      return `${convertedValue.toFixed(3)}`;
    case 'AU':
      return `${convertedValue.toFixed(1)}`;
    case 'W/kg':
      return `${convertedValue.toFixed(2)}`;
    default:
      return `${convertedValue.toFixed(2)}`;
  }
}

/**
 * Get metric label
 */
export async function getMetricLabel(metricCode: string): Promise<string> {
  const metric = await getCanonicalMetricByCode(metricCode);
  if (!metric) return metricCode;
  
  return metric.name;
}

/**
 * Validate metric value (basic validation only)
 */
export async function validateMetricValue(value: number, metricCode: string): Promise<{
  isValid: boolean;
  warning?: string;
}> {
  const metric = await getCanonicalMetricByCode(metricCode);
  if (!metric) return { isValid: true };

  // Basic validation: check if value is a valid number
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      isValid: false,
      warning: `Значение ${value} не является корректным числом`
    };
  }
  
  return { isValid: true };
}

/**
 * Get all available GPS systems (commonly used)
 */
export function getAvailableGpsSystems(): string[] {
  return [
    'Polar',
    'Statsport',
    'Catapult',
    'Zephyr',
    'GPSports',
    'Spiro',
    'B-Sight',
    'Other'
  ];
}

/**
 * Check if a value is in hh:mm:ss format
 */
export function isTimeString(value: any): boolean {
  if (typeof value !== 'string') return false;
  return /^(\d{1,2}):(\d{2}):(\d{2})$/.test(value);
}

/**
 * Get suggested column mappings for a GPS system
 */
export function getSuggestedColumnMappings(gpsSystem: string): Record<string, string> {
  const suggestions: Record<string, Record<string, string>> = {
    'Polar': {
      'Total distance': 'total_distance',
      'Duration': 'duration',
      'Average speed': 'avg_speed',
      'Max speed': 'max_speed',
      'Average heart rate': 'avg_heart_rate',
      'Max heart rate': 'max_heart_rate',
    },
    'Statsport': {
      'Distance all': 'total_distance',
      'Time on pitch': 'duration',
      'Avg speed': 'avg_speed',
      'Max speed': 'max_speed',
      'Avg HR': 'avg_heart_rate',
      'Max HR': 'max_heart_rate',
    },
    'Catapult': {
      'Total Distance': 'total_distance',
      'Duration': 'duration',
      'Avg Speed': 'avg_speed',
      'Max Speed': 'max_speed',
      'Avg HR': 'avg_heart_rate',
      'Max HR': 'max_heart_rate',
    }
  };
  
  return suggestions[gpsSystem] || {};
}

/**
 * Get supported units for a specific metric
 */
export async function getSupportedUnitsForMetric(metricCode: string): Promise<string[]> {
  try {
    const metric = await getCanonicalMetricByCode(metricCode);
    if (!metric) return [];
    
    return metric.supportedUnits || [];
  } catch (error) {
    console.error('Error getting supported units for metric:', metricCode, error);
    return [];
  }
}
