import canonicalMetricsData from '@/canon/canonical_metrics_grouped_v1.0.1.json';
import { CanonicalMetric, CanonicalMetricsGroup, CanonicalMetricsData } from '@/types/gps';

// Type assertion for the imported JSON
const metricsData = canonicalMetricsData as CanonicalMetricsData;

// Unit conversion factors to base units
const UNIT_FACTORS = {
  distance: { m: 1, km: 1000, yd: 0.9144 },
  time: { s: 1, min: 60, h: 3600, ms: 0.001 },
  speed: { 'm/s': 1, 'km/h': 0.2777777778, 'm/min': 0.0166666667, 'mph': 0.44704 },
  acceleration: { 'm/s^2': 1, g: 9.80665 },
  heart_rate: { bpm: 1, '%HRmax': 1 }, // Восстановили - есть в реестре
  power_mass_norm: { 'W/kg': 1 },
  load: { AU: 1 },
  count: { count: 1 },
  ratio: { ratio: 1, '%': 0.01 },
  identity: { string: 1 }
} as const;

// Base unit for each dimension
const BASE_UNIT = {
  distance: 'm',
  time: 's',
  speed: 'm/s',
  acceleration: 'm/s^2',
  heart_rate: 'bpm', // Восстановили - есть в реестре
  power_mass_norm: 'W/kg',
  load: 'AU',
  count: 'count',
  ratio: 'ratio',
  identity: 'string'
} as const;

// Track warnings to avoid spam
const warnedUnits = new Set<string>();

/**
 * Get all canonical metrics
 */
export function getAllCanonicalMetrics(): CanonicalMetric[] {
  return metricsData.metrics;
}

/**
 * Get canonical metric by key
 */
export function getCanonicalMetricByKey(key: string): CanonicalMetric | undefined {
  return metricsData.metrics.find(metric => metric.key === key);
}

/**
 * Get canonical metrics by category
 */
export function getCanonicalMetricsByCategory(category: string): CanonicalMetric[] {
  return metricsData.metrics.filter(metric => metric.category === category);
}

/**
 * Get all metric groups
 */
export function getAllMetricGroups(): CanonicalMetricsGroup[] {
  return metricsData.groups;
}

/**
 * Get metric group by key
 */
export function getMetricGroupByKey(key: string): CanonicalMetricsGroup | undefined {
  return metricsData.groups.find(group => group.key === key);
}

/**
 * Get metrics for a specific group
 */
export function getMetricsForGroup(groupKey: string): CanonicalMetric[] {
  const group = getMetricGroupByKey(groupKey);
  if (!group) return [];
  
  return metricsData.metrics.filter(metric => group.metrics.includes(metric.key));
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
export function convertToCanonicalUnit(value: number, unit: string, dimension: keyof typeof UNIT_FACTORS): number {
  const baseUnit = BASE_UNIT[dimension];
  if (unit === baseUnit) return value;

  return convertValue(value, unit, baseUnit, dimension);
}

/**
 * Get display unit for a metric
 */
export function getDisplayUnit(metricKey: string, preferredUnit?: string): string {
  const metric = getCanonicalMetricByKey(metricKey);
  if (!metric) return preferredUnit || '';

  const dimensionData = metricsData.dimensions[metric.dimension];
  if (!dimensionData) return metric.unit;

  // If preferred unit is provided and is allowed, use it
  if (preferredUnit && dimensionData.allowed_units.includes(preferredUnit)) {
    return preferredUnit;
  }

  // Otherwise use the metric's default unit
  return metric.unit;
}

/**
 * Format value with appropriate unit
 */
export function formatMetricValue(value: number, metricKey: string, unit?: string): string {
  const metric = getCanonicalMetricByKey(metricKey);
  if (!metric) return `${value} ${unit || ''}`;

  const dimension = metric.dimension as keyof typeof UNIT_FACTORS;
  const displayUnit = getDisplayUnit(metricKey, unit);
  
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

  // Format based on unit type with localization
  switch (displayUnit) {
    case 'bpm':
    case 'count':
      return `${Math.round(convertedValue)} ${displayUnit}`;
    case 'm':
      return `${Math.round(convertedValue)} м`;
    case 'km':
      return `${convertedValue.toFixed(2)} км`;
    case 'yd':
      return `${convertedValue.toFixed(1)} ярд`;
    case 's':
      return `${Math.round(convertedValue)} с`;
    case 'min':
      return `${convertedValue.toFixed(1)} мин`;
    case 'h':
      return `${convertedValue.toFixed(2)} ч`;
    case 'ms':
      return `${Math.round(convertedValue)} мс`;
    case 'm/s':
      return `${convertedValue.toFixed(2)} м/с`;
    case 'km/h':
      return `${convertedValue.toFixed(1)} км/ч`;
    case 'm/min':
      return `${convertedValue.toFixed(1)} м/мин`;
    case 'mph':
      return `${convertedValue.toFixed(1)} миль/ч`;
    case 'm/s^2':
      return `${convertedValue.toFixed(2)} м/с²`;
    case 'g':
      return `${convertedValue.toFixed(2)} g`;
    case '%':
      return `${convertedValue.toFixed(1)}%`;
    case 'ratio':
      return `${convertedValue.toFixed(3)}`;
    case 'AU':
      return `${convertedValue.toFixed(1)} AU`;
    case 'W/kg':
      return `${convertedValue.toFixed(2)} Вт/кг`;
    default:
      return `${convertedValue.toFixed(2)} ${displayUnit}`;
  }
}

/**
 * Get metric label in specified language
 */
export function getMetricLabel(metricKey: string, language: 'ru' | 'en' = 'ru'): string {
  const metric = getCanonicalMetricByKey(metricKey);
  if (!metric) return metricKey;
  
  return metric.labels[language] || metric.labels.en || metricKey;
}

/**
 * Get group label in specified language
 */
export function getGroupLabel(groupKey: string, language: 'ru' | 'en' = 'ru'): string {
  const group = getMetricGroupByKey(groupKey);
  if (!group) return groupKey;
  
  return group.labels[language] || group.labels.en || groupKey;
}

/**
 * Validate metric value against plausible range
 */
export function validateMetricValue(value: number, metricKey: string): {
  isValid: boolean;
  warning?: string;
} {
  const metric = getCanonicalMetricByKey(metricKey);
  if (!metric) return { isValid: true };

  const { plausibleMin, plausibleMax } = metric;
  
  if (plausibleMin !== undefined && value < plausibleMin) {
    return {
      isValid: false,
      warning: `Значение ${value} меньше минимального ожидаемого (${plausibleMin})`
    };
  }
  
  if (plausibleMax !== undefined && value > plausibleMax) {
    return {
      isValid: false,
      warning: `Значение ${value} больше максимального ожидаемого (${plausibleMax})`
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
 * Get suggested column mappings for a GPS system
 */
export function getSuggestedColumnMappings(gpsSystem: string): Record<string, string> {
  const suggestions: Record<string, Record<string, string>> = {
    'Polar': {
      'Total distance': 'total_distance_m',
      'Duration': 'duration_s',
      'Average speed': 'avg_speed_ms',
      'Max speed': 'max_speed_ms',
      'Average heart rate': 'avg_heart_rate_bpm',
      'Max heart rate': 'top_heart_rate_bpm',
    },
    'Statsport': {
      'Distance all': 'total_distance_m',
      'Time on pitch': 'duration_s',
      'Avg speed': 'avg_speed_ms',
      'Max speed': 'max_speed_ms',
      'Avg HR': 'avg_heart_rate_bpm',
      'Max HR': 'top_heart_rate_bpm',
    },
    'Catapult': {
      'Total Distance': 'total_distance_m',
      'Duration': 'duration_s',
      'Avg Speed': 'avg_speed_ms',
      'Max Speed': 'max_speed_ms',
      'Avg HR': 'avg_heart_rate_bpm',
      'Max HR': 'top_heart_rate_bpm',
    }
  };
  
  return suggestions[gpsSystem] || {};
}

// DEV-проверка соответствия реестра и конвертера
if (process.env.NODE_ENV !== 'production') {
  const checkRegistryConsistency = () => {
    const missingInCode: Record<string, string[]> = {};
    const orphansInCode: Record<string, string[]> = {};
    
    // Проверяем каждый dimension
    Object.entries(metricsData.dimensions).forEach(([dimension, data]) => {
      const registryUnits = new Set([data.canonical_unit, ...data.allowed_units]);
      const codeUnits = new Set(Object.keys(UNIT_FACTORS[dimension as keyof typeof UNIT_FACTORS] || {}));
      
      const missing = [...registryUnits].filter(unit => !codeUnits.has(unit));
      const orphans = [...codeUnits].filter(unit => !registryUnits.has(unit));
      
      if (missing.length > 0) {
        missingInCode[dimension] = missing;
      }
      if (orphans.length > 0) {
        orphansInCode[dimension] = orphans;
      }
    });
    
    if (Object.keys(missingInCode).length > 0 || Object.keys(orphansInCode).length > 0) {
      console.error('[canonical-metrics] Registry/Converter mismatch detected:');
      if (Object.keys(missingInCode).length > 0) {
        console.error('Missing in code:', missingInCode);
      }
      if (Object.keys(orphansInCode).length > 0) {
        console.error('Orphans in code:', orphansInCode);
      }
    } else {
      console.log('[canonical-metrics] Registry/Converter consistency check passed ✓');
    }
  };
  
  // Запускаем проверку при загрузке модуля
  checkRegistryConsistency();
}

// Get allowed units for a specific metric
export function getAllowedUnitsForMetric(metricKey: string): string[] {
  try {
    // Find the metric in the registry
    for (const group of metricsData.groups) {
      for (const metricKeyInGroup of group.metrics) {
        if (metricKeyInGroup === metricKey) {
          // Find the actual metric object
          const metric = metricsData.metrics.find(m => m.key === metricKey);
          if (metric) {
            // Get dimension from the metric
            const dimension = metric.dimension;
            
            // Get allowed units from the dimensions section
            if (metricsData.dimensions && metricsData.dimensions[dimension]) {
              return metricsData.dimensions[dimension].allowed_units || [];
            }
          }
          
          // Fallback: return empty array if no units found
          return [];
        }
      }
    }
    
    // If metric not found, return empty array
    return [];
  } catch (error) {
    console.error('Error getting allowed units for metric:', metricKey, error);
    return [];
  }
}
