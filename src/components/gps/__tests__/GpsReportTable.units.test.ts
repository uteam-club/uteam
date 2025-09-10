// src/components/gps/__tests__/GpsReportTable.units.test.ts

import { fromCanonical, formatDisplayValue } from '@/services/units';

describe('GpsReportTable Unit Conversion', () => {
  describe('HSR ratio to percentage conversion', () => {
    test('should convert 0.085 ratio to 8.5% without double multiplication', () => {
      // Тестируем конвертацию ratio → %
      const ratioValue = 0.085;
      const displayUnit = '%';
      const canonicalKey = 'hsr_ratio';
      
      // Конвертируем из canonical (ratio) в display unit (%)
      const convertedValue = fromCanonical(ratioValue, canonicalKey, displayUnit);
      expect(convertedValue).toBeCloseTo(8.5, 1);
      
      // Форматируем для отображения (без повторного умножения)
      const formattedValue = formatDisplayValue(convertedValue, displayUnit);
      expect(formattedValue).toBe('8.5%');
    });

    test('should convert 0.15 ratio to 15% without double multiplication', () => {
      const ratioValue = 0.15;
      const displayUnit = '%';
      const canonicalKey = 'hsr_ratio';
      
      const convertedValue = fromCanonical(ratioValue, canonicalKey, displayUnit);
      expect(convertedValue).toBeCloseTo(15, 1);
      
      const formattedValue = formatDisplayValue(convertedValue, displayUnit);
      expect(formattedValue).toBe('15.0%');
    });

    test('should handle ratio display unit correctly', () => {
      const ratioValue = 0.085;
      const displayUnit = 'ratio';
      const canonicalKey = 'hsr_ratio';
      
      const convertedValue = fromCanonical(ratioValue, canonicalKey, displayUnit);
      expect(convertedValue).toBeCloseTo(0.085, 3);
      
      const formattedValue = formatDisplayValue(convertedValue, displayUnit);
      expect(formattedValue).toBe('0.085');
    });
  });

  describe('Speed conversion', () => {
    test('should convert m/s to km/h correctly', () => {
      const speedValue = 7.78; // m/s
      const displayUnit = 'km/h';
      const canonicalKey = 'max_speed_ms';
      
      const convertedValue = fromCanonical(speedValue, canonicalKey, displayUnit);
      expect(convertedValue).toBeCloseTo(28.0, 1);
      
      const formattedValue = formatDisplayValue(convertedValue, displayUnit);
      expect(formattedValue).toBe('28.0 км/ч');
    });

    test('should handle m/s display unit correctly', () => {
      const speedValue = 7.78; // m/s
      const displayUnit = 'm/s';
      const canonicalKey = 'max_speed_ms';
      
      const convertedValue = fromCanonical(speedValue, canonicalKey, displayUnit);
      expect(convertedValue).toBeCloseTo(7.78, 2);
      
      const formattedValue = formatDisplayValue(convertedValue, displayUnit);
      expect(formattedValue).toBe('7.8 м/с');
    });
  });

  describe('Time conversion', () => {
    test('should convert seconds to minutes correctly', () => {
      const timeValue = 90; // seconds
      const displayUnit = 'min';
      const canonicalKey = 'duration_s';
      
      const convertedValue = fromCanonical(timeValue, canonicalKey, displayUnit);
      expect(convertedValue).toBeCloseTo(1.5, 1);
      
      const formattedValue = formatDisplayValue(convertedValue, displayUnit);
      expect(formattedValue).toBe('1.5 мин');
    });
  });

  describe('Distance conversion', () => {
    test('should convert meters to kilometers correctly', () => {
      const distanceValue = 5000; // meters
      const displayUnit = 'km';
      const canonicalKey = 'total_distance_m';
      
      const convertedValue = fromCanonical(distanceValue, canonicalKey, displayUnit);
      expect(convertedValue).toBeCloseTo(5.0, 1);
      
      const formattedValue = formatDisplayValue(convertedValue, displayUnit);
      expect(formattedValue).toBe('5.0');
    });
  });

  describe('Edge cases', () => {
    test('should handle null values', () => {
      const convertedValue = fromCanonical(null, 'hsr_ratio', '%');
      expect(convertedValue).toBeNull();
      
      const formattedValue = formatDisplayValue(null, '%');
      expect(formattedValue).toBe('—');
    });

    test('should handle undefined values', () => {
      const convertedValue = fromCanonical(undefined, 'hsr_ratio', '%');
      expect(convertedValue).toBeNull();
      
      const formattedValue = formatDisplayValue(undefined, '%');
      expect(formattedValue).toBe('—');
    });

    test('should handle empty string values', () => {
      const convertedValue = fromCanonical('', 'hsr_ratio', '%');
      expect(convertedValue).toBeNull();
      
      const formattedValue = formatDisplayValue('', '%');
      expect(formattedValue).toBe('0.0%');
    });
  });
});
