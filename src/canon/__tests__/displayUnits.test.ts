// src/canon/__tests__/displayUnits.test.ts

import { allowedDisplayUnitsFor, suggestDefaultDisplayUnit, isValidDisplayUnit } from '../displayUnits';

describe('Display Units Helper', () => {
  describe('allowedDisplayUnitsFor', () => {
    test('should return empty array for text/identity fields', () => {
      expect(allowedDisplayUnitsFor('athlete_name')).toEqual([]);
      expect(allowedDisplayUnitsFor('position')).toEqual([]);
      expect(allowedDisplayUnitsFor('gps_system')).toEqual([]);
    });

    test('should return correct units for distance metrics', () => {
      expect(allowedDisplayUnitsFor('total_distance_m')).toEqual(['m', 'km', 'yd']);
      expect(allowedDisplayUnitsFor('hsr_distance_m')).toEqual(['m', 'km', 'yd']);
    });

    test('should return correct units for time metrics', () => {
      expect(allowedDisplayUnitsFor('duration_s')).toEqual(['s', 'min', 'h']);
      expect(allowedDisplayUnitsFor('minutes_played')).toEqual(['min', 'h']);
    });

    test('should return correct units for speed metrics', () => {
      expect(allowedDisplayUnitsFor('max_speed_ms')).toEqual(['m/s', 'km/h', 'm/min']);
      expect(allowedDisplayUnitsFor('max_speed_kmh')).toEqual(['km/h', 'm/s']);
      expect(allowedDisplayUnitsFor('distance_per_min_m')).toEqual(['m/min', 'm/s', 'km/h']);
    });

    test('should return correct units for ratio metrics', () => {
      expect(allowedDisplayUnitsFor('hsr_ratio')).toEqual(['%', 'ratio']);
      expect(allowedDisplayUnitsFor('sprint_ratio')).toEqual(['%', 'ratio']);
    });

    test('should return correct units for heart rate metrics', () => {
      expect(allowedDisplayUnitsFor('heart_rate_avg_bpm')).toEqual(['bpm']);
      expect(allowedDisplayUnitsFor('heart_rate_max_bpm')).toEqual(['bpm']);
    });

    test('should return correct units for count metrics', () => {
      expect(allowedDisplayUnitsFor('number_of_sprints_count')).toEqual(['count']);
      expect(allowedDisplayUnitsFor('accelerations_count')).toEqual(['count']);
    });

    test('should return correct units for load metrics', () => {
      expect(allowedDisplayUnitsFor('total_load_au')).toEqual(['AU']);
      expect(allowedDisplayUnitsFor('session_rpe_au')).toEqual(['AU']);
    });

    test('should return empty array for unknown metric', () => {
      expect(allowedDisplayUnitsFor('unknown_metric')).toEqual([]);
    });
  });

  describe('suggestDefaultDisplayUnit', () => {
    test('should return null for text/identity fields', () => {
      expect(suggestDefaultDisplayUnit('athlete_name')).toBeNull();
      expect(suggestDefaultDisplayUnit('position')).toBeNull();
    });

    test('should return correct defaults for different dimensions', () => {
      expect(suggestDefaultDisplayUnit('max_speed_ms')).toBe('km/h'); // speed -> km/h
      expect(suggestDefaultDisplayUnit('hsr_ratio')).toBe('%'); // ratio -> %
      expect(suggestDefaultDisplayUnit('duration_s')).toBe('min'); // time -> min
      expect(suggestDefaultDisplayUnit('total_distance_m')).toBe('m'); // distance -> m
      expect(suggestDefaultDisplayUnit('heart_rate_avg_bpm')).toBe('bpm'); // bpm -> bpm
      expect(suggestDefaultDisplayUnit('number_of_sprints_count')).toBe('count'); // count -> count
      expect(suggestDefaultDisplayUnit('total_load_au')).toBe('AU'); // au -> AU
    });

    test('should return null for unknown metric', () => {
      expect(suggestDefaultDisplayUnit('unknown_metric')).toBeNull();
    });
  });

  describe('isValidDisplayUnit', () => {
    test('should validate correct display units', () => {
      expect(isValidDisplayUnit('max_speed_ms', 'km/h')).toBe(true);
      expect(isValidDisplayUnit('max_speed_ms', 'm/s')).toBe(true);
      expect(isValidDisplayUnit('hsr_ratio', '%')).toBe(true);
      expect(isValidDisplayUnit('hsr_ratio', 'ratio')).toBe(true);
      expect(isValidDisplayUnit('total_distance_m', 'm')).toBe(true);
      expect(isValidDisplayUnit('total_distance_m', 'km')).toBe(true);
    });

    test('should reject invalid display units', () => {
      expect(isValidDisplayUnit('max_speed_ms', '%')).toBe(false);
      expect(isValidDisplayUnit('hsr_ratio', 'km/h')).toBe(false);
      expect(isValidDisplayUnit('total_distance_m', 'bpm')).toBe(false);
      expect(isValidDisplayUnit('athlete_name', 'km/h')).toBe(false);
    });

    test('should handle unknown metrics', () => {
      expect(isValidDisplayUnit('unknown_metric', 'anything')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty string canonicalKey', () => {
      expect(allowedDisplayUnitsFor('')).toEqual([]);
      expect(suggestDefaultDisplayUnit('')).toBeNull();
      expect(isValidDisplayUnit('', 'anything')).toBe(false);
    });

    test('should handle null/undefined displayUnit', () => {
      expect(isValidDisplayUnit('max_speed_ms', null as any)).toBe(false);
      expect(isValidDisplayUnit('max_speed_ms', undefined as any)).toBe(false);
    });
  });

  describe('API validation integration', () => {
    test('should reject invalid displayUnit for API validation', () => {
      // Тест для интеграции с API валидацией
      const invalidUnit = 'invalid_unit';
      const canonicalKey = 'max_speed_ms';
      
      expect(isValidDisplayUnit(canonicalKey, invalidUnit)).toBe(false);
      
      // Проверяем, что allowedDisplayUnitsFor не содержит недопустимую единицу
      const allowedUnits = allowedDisplayUnitsFor(canonicalKey);
      expect(allowedUnits).not.toContain(invalidUnit);
      expect(allowedUnits).toEqual(['m/s', 'km/h', 'm/min']);
    });
  });
});
