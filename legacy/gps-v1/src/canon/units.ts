// canon/units.ts
import { CANON } from './metrics.registry';

/**
 * Convert value between units within a given dimension, via explicit conversion factors
 * in the registry or by pivoting through the dimension's canonical unit.
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  dimensionKey: keyof typeof CANON.dimensions
): number {
  if (fromUnit === toUnit) return value;

  const dim = CANON.dimensions[dimensionKey];
  if (!dim) throw new Error(`Unknown dimension: ${String(dimensionKey)}`);
  const conv = dim.conversions || {};

  // direct conversion
  const directKey = `${fromUnit}->${toUnit}`;
  if (directKey in conv) return value * conv[directKey];

  // inverse conversion
  const inverseKey = `${toUnit}->${fromUnit}`;
  if (inverseKey in conv) return value / conv[inverseKey];

  // pivot via canonical unit
  const canon = dim.canonical_unit;
  if (fromUnit !== canon) {
    const toCanonKey = `${fromUnit}->${canon}`;
    const fromCanonKey = `${canon}->${fromUnit}`;
    if (toCanonKey in conv) {
      value = value * conv[toCanonKey];
    } else if (fromCanonKey in conv) {
      value = value / conv[fromCanonKey];
    } else {
      throw new Error(`No conversion from ${fromUnit} to canonical ${canon} for dimension ${String(dimensionKey)}`);
    }
  }
  if (toUnit !== canon) {
    const fromCanonKey2 = `${canon}->${toUnit}`;
    const toCanonKey2 = `${toUnit}->${canon}`;
    if (fromCanonKey2 in conv) {
      value = value * conv[fromCanonKey2];
    } else if (toCanonKey2 in conv) {
      value = value / conv[toCanonKey2];
    } else {
      throw new Error(`No conversion from canonical ${canon} to ${toUnit} for dimension ${String(dimensionKey)}`);
    }
  }
  return value;
}

/** Convert value to the canonical unit for the given dimension. */
export function toCanonical(
  value: number,
  fromUnit: string,
  dimensionKey: keyof typeof CANON.dimensions
): number {
  const dim = CANON.dimensions[dimensionKey];
  return convertUnit(value, fromUnit, dim.canonical_unit, dimensionKey);
}

/** Convert value from canonical to a display unit for the given dimension. */
export function fromCanonical(
  valueCanon: number,
  toUnit: string,
  dimensionKey: keyof typeof CANON.dimensions
): number {
  const dim = CANON.dimensions[dimensionKey];
  return convertUnit(valueCanon, dim.canonical_unit, toUnit, dimensionKey);
}
