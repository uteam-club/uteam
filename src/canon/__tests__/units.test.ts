// canon/__tests__/units.test.ts
import { convertUnit } from '../../canon/units';
import { CANON } from '../../canon/metrics.registry';

describe('unit conversions', () => {
  test('km/h <-> m/s', () => {
    expect(convertUnit(36, 'km/h', 'm/s', 'speed' as any)).toBeCloseTo(10, 6);
    expect(convertUnit(10, 'm/s', 'km/h', 'speed' as any)).toBeCloseTo(36, 6);
  });

  test('min -> s', () => {
    expect(convertUnit(5, 'min', 's', 'time' as any)).toBeCloseTo(300, 6);
  });

  test('% -> ratio', () => {
    expect(convertUnit(50, '%', 'ratio', 'ratio' as any)).toBeCloseTo(0.5, 6);
  });
});

describe('registry', () => {
  test('metric keys unique', () => {
    const keys = CANON.metrics.map(m => m.key);
    const set = new Set(keys);
    expect(set.size).toBe(keys.length);
  });

  test('groups reference existing metrics', () => {
    const keySet = new Set(CANON.metrics.map(m => m.key));
    for (const g of CANON.groups) {
      for (const k of g.metrics) {
        expect(keySet.has(k)).toBe(true);
      }
    }
  });
});
