// services/units.ts
import { convertUnit } from '@/canon/units';
import { CANON } from '@/canon/metrics.registry';

/**
 * Convert canonical value to display unit for UI rendering
 * @param value - canonical value (in SI units)
 * @param canonicalKey - canonical metric key
 * @param displayUnit - target display unit
 * @returns converted value or null if conversion fails
 */
export function fromCanonical(
  value: number | string | null,
  canonicalKey: string,
  displayUnit: string
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(numValue)) {
    return null;
  }

  // Find metric in registry
  const metric = CANON.metrics.find(m => m.key === canonicalKey);
  if (!metric) {
    return numValue; // Return as-is if metric not found
  }

  const dimension = metric.dimension as keyof typeof CANON.dimensions;
  const dimensionConfig = CANON.dimensions[dimension];
  
  if (!dimensionConfig) {
    return numValue; // Return as-is if dimension not found
  }

  const canonicalUnit = dimensionConfig.canonical_unit;
  
  // If display unit is same as canonical unit, no conversion needed
  if (displayUnit === canonicalUnit) {
    return numValue;
  }

  // Check if conversion is allowed
  const allowedUnits = dimensionConfig.allowed_units || [];
  if (!allowedUnits.includes(displayUnit)) {
    return numValue; // Return as-is if conversion not allowed
  }

  try {
    return convertUnit(numValue, canonicalUnit, displayUnit, dimension);
  } catch (error) {
    console.warn(`Failed to convert ${canonicalKey} from ${canonicalUnit} to ${displayUnit}:`, error);
    return numValue; // Return as-is if conversion fails
  }
}

/**
 * Format value for display based on display unit
 * @param value - numeric value
 * @param displayUnit - display unit
 * @returns formatted string
 */
export function formatDisplayValue(value: number | null, displayUnit: string): string {
  if (value === null || !isFinite(value)) {
    return '—';
  }

  switch (displayUnit) {
    case '%':
      return `${Number(value).toFixed(1)}%`;
    case 'km/h':
      return `${Number(value).toFixed(1)} км/ч`;
    case 'm/s':
      return `${Number(value).toFixed(1)} м/с`;
    case 'm':
      return `${Math.round(Number(value))} м`;
    case 's':
      return `${Math.round(Number(value))} с`;
    case 'min':
      return `${Number(value).toFixed(1)} мин`;
    case 'ratio':
      return Number(value).toFixed(3);
    default:
      return Number(value).toFixed(1);
  }
}

/**
 * Get display unit from profile snapshot column or fallback to canonical unit
 * @param column - profile snapshot column
 * @returns display unit string
 */
export function getDisplayUnit(column: { displayUnit?: string; canonicalKey: string }): string {
  if (column.displayUnit) {
    return column.displayUnit;
  }

  // Fallback to canonical unit
  const metric = CANON.metrics.find(m => m.key === column.canonicalKey);
  if (metric) {
    const dimension = metric.dimension as keyof typeof CANON.dimensions;
    const dimensionConfig = CANON.dimensions[dimension];
    return dimensionConfig?.canonical_unit || 'unknown';
  }

  return 'unknown';
}
